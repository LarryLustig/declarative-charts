import { ErrorCode, type ErrorDefinition } from './errors.js';

/** Filename used when `downloadSvg()` is called with no argument. */
export const DEFAULT_SVG_FILENAME = 'chart.svg';

/**
 * The slice of a chart that SVG export needs.
 *
 * Deliberately narrow: the exporter reads the rendered SVG, the chart's declared
 * pixel size, and the chart element itself (only so `getComputedStyle` measures
 * the right thing), and it calls one method back on the chart.
 */
export interface SvgExportHost {
  /** Where the rendered `<svg>` lives. Re-queried on every export. */
  readonly shadowRoot: ShadowRoot | null;
  /** The chart's declared width, written onto the exported `<svg>`. */
  readonly width: number;
  /** The chart's declared height, written onto the exported `<svg>`. */
  readonly height: number;
  /**
   * The chart element itself.
   *
   * The only reason the exporter needs it: the exported font-family comes from
   * `getComputedStyle()` **on the chart host**, so the file inherits the page's
   * font. Measuring anything else - the exporter, the cloned SVG - would still
   * type check and still produce a font-family, just the wrong one.
   */
  readonly hostElement: Element;
  /**
   * Prepare a cloned `<svg>` for standalone use.
   *
   * Routed back through the chart rather than called directly on this class.
   * It is a member of `BaseChart`, so a subclass - or a test spy - can replace
   * it, and did before this class existed. Calling our own copy would sever
   * that silently. Same hazard as `getLuminance` and the keyboard nav actions.
   */
  prepareSvgForExport(svgElement: SVGElement): void;
  /** Report a problem through the chart's logging system. */
  logError(
    code: ErrorDefinition,
    params?: Record<string, string | number | undefined>,
    value?: unknown
  ): void;
}

/**
 * Exports a chart's rendered SVG as a standalone, downloadable file.
 *
 * The rendered SVG lives in the shadow DOM and leans on the host document for
 * its font. Exporting therefore means: clone it (never touch the live DOM),
 * inline the few things a standalone file cannot inherit, serialize, and hand
 * the result to the browser through an object URL.
 *
 * Extracted from `BaseChart` as the fifth responsibility to move out, after
 * `ColorResolver`, `KeyboardNavController`, `ChartLogger` and `PopupController`.
 * `BaseChart` holds it behind a lazy getter and its `downloadSvg()` -
 * documented, consumer-facing API - delegates unchanged.
 *
 * Known limits, pinned by `test/component/svg-export.test.ts` rather than fixed
 * here, because changing them is a decision for a human:
 *  - only the `<svg>` subtree is cloned, so the shadow root's `<style>` is
 *    dropped and `font-family` is the *only* style carried into the file;
 *  - lit-html binding marker comments ship inside the exported SVG;
 *  - the filename is not sanitized and a non-string filename throws a raw
 *    `TypeError` rather than a DC-coded warning.
 */
export class SvgExporter {
  constructor(private readonly host: SvgExportHost) {}

  /**
   * Download the chart as an SVG file.
   *
   * @param filename Filename for the downloaded file. The '.svg' extension is
   *                 added if not already present (case-insensitively).
   */
  downloadSvg(filename: string = DEFAULT_SVG_FILENAME): void {
    const svg = this.host.shadowRoot?.querySelector('svg');
    if (!svg) {
      // Through the logging system, so `logging`/`console-log` govern it like
      // every other diagnostic. It used to write straight to console.warn.
      this.host.logError(ErrorCode.SVG_NOT_FOUND, {});
      return;
    }

    const safeName = this.resolveFilename(filename);

    // Clone the SVG so we don't modify the live DOM
    const svgClone = svg.cloneNode(true) as SVGElement;

    // Prepare the SVG for standalone use. Through the host, so an override wins.
    this.host.prepareSvgForExport(svgClone);

    // Serialize to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);

    // Add XML declaration for proper standalone SVG
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    // Create Blob and trigger download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    // Firefox historically required the anchor be in the document for a
    // programmatic download click, so it is attached, clicked, and removed.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL. Safe synchronously: the browser snapshots the
    // URL when the click is dispatched.
    URL.revokeObjectURL(url);
  }

  /**
   * Turn whatever was passed in into a usable filename.
   *
   * Previously `filename.toLowerCase()` threw a raw TypeError for a non-string,
   * *after* the SVG had been found, and an empty string produced a `.svg`
   * dotfile because a default parameter only fires for `undefined`. Path
   * separators passed straight through, so 'reports/q3' asked the browser to
   * write outside the download directory.
   */
  private resolveFilename(filename: unknown): string {
    let name = typeof filename === 'string' ? filename.trim() : '';

    if (typeof filename !== 'string' && filename !== undefined) {
      this.host.logError(ErrorCode.EXPORT_FILENAME_INVALID, {
        value: String(filename)
      });
    }

    // Strip anything that would steer the write somewhere else, or that a
    // filesystem is likely to reject.
    const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').trim();
    if (cleaned !== name && name !== '') {
      this.host.logError(ErrorCode.EXPORT_FILENAME_INVALID, { value: name });
    }
    name = cleaned;

    // An empty or extension-only name is not a filename.
    if (name === '' || name === '.svg') return DEFAULT_SVG_FILENAME;

    return name.toLowerCase().endsWith('.svg') ? name : `${name}.svg`;
  }

  /**
   * Prepare an SVG element for standalone export.
   * Inlines computed styles that wouldn't otherwise be available in a standalone SVG file.
   *
   * @param svgElement The cloned SVG element to prepare
   */
  prepareSvgForExport(svgElement: SVGElement): void {
    // Add xmlns attribute if not present (required for standalone SVG).
    // Defensive only - the render template already sets it on every chart.
    if (!svgElement.hasAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Get the computed font-family from the host element. Read once, not per
    // text element - getComputedStyle is not cheap and a test pins the count.
    const computedStyle = window.getComputedStyle(this.host.hostElement);
    const fontFamily = computedStyle.fontFamily;

    // Apply font-family to all text elements that don't have an explicit font-family
    const textElements = svgElement.querySelectorAll('text');
    textElements.forEach(textEl => {
      if (!textEl.hasAttribute('font-family') || textEl.getAttribute('font-family') === '') {
        textEl.setAttribute('font-family', fontFamily);
      }
    });

    // Set explicit width/height for viewers that do not handle viewBox-only
    // sizing. Each is filled in only if missing: the guard used to be
    // `!hasWidth || !hasHeight` while the body set both, so an SVG carrying
    // width="999" and no height silently lost the 999.
    if (!svgElement.hasAttribute('width')) {
      svgElement.setAttribute('width', String(this.host.width));
    }
    if (!svgElement.hasAttribute('height')) {
      svgElement.setAttribute('height', String(this.host.height));
    }

    // Strip lit-html's binding markers. They are comments, so they render
    // harmlessly, but they are noise in a file a user may open or hand on.
    this.removeBindingComments(svgElement);
  }

  /**
   * Remove lit-html binding marker comments from a cloned subtree.
   *
   * Safe because the clone is detached and never re-rendered - the markers only
   * matter to the live template instance.
   */
  private removeBindingComments(root: Element): void {
    const doc = root.ownerDocument;
    if (!doc || typeof doc.createTreeWalker !== 'function') return;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    const comments: Comment[] = [];
    let node = walker.nextNode();
    while (node) {
      comments.push(node as Comment);
      node = walker.nextNode();
    }
    comments.forEach(c => c.remove());
  }
}
