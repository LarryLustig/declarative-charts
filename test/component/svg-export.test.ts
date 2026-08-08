import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, elementUpdated } from './setup';

// Concrete charts used to exercise BaseChart's export code.
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-axis';
import '../../src/chart-legend';
import '../../src/chart-title';
import { PieChart } from '../../src/pie-chart';
import { Chart } from '../../src/chart';

/**
 * Characterization tests for SVG export / download.
 *
 * These pin what `BaseChart.downloadSvg()` and `BaseChart.prepareSvgForExport()`
 * do TODAY, ahead of extracting them into their own class. They record current
 * behaviour, not desired behaviour - several assertions below pin things that
 * are arguably wrong (see the SURPRISE comments). Changing any of them is a
 * decision for a human, not a side effect of a refactor.
 *
 * `downloadSvg` is public, consumer-facing API. It is demonstrated in index.html
 * ("downloadSvg('revenue-chart')") and referenced in ROADMAP.md, so its
 * signature and observable behaviour must survive the extraction unchanged.
 *
 * WHAT HAPPY-DOM CAN AND CANNOT VERIFY
 * ------------------------------------
 * Verified for real here: XMLSerializer output, Blob construction and its text,
 * URL.createObjectURL/revokeObjectURL, anchor creation, `document.body`
 * membership during click, and window.getComputedStyle (including inline
 * styles). All of those exist in happy-dom and behave.
 *
 * NOT verifiable here, and deliberately not asserted:
 *  - that a file actually lands on disk. happy-dom's `HTMLAnchorElement.click()`
 *    runs without error but performs no navigation and honours no `download`
 *    attribute, so "a download happened" can only be checked in a real browser.
 *    The tests therefore assert the *preconditions* a browser would act on:
 *    href set to the object URL, `download` set to the filename, element in the
 *    document at the moment of click.
 *  - that the exported SVG renders identically to the on-screen chart. Fonts,
 *    layout and CSS cascade are not evaluated by happy-dom. The visual suite
 *    (test/visual) covers on-screen rendering; nothing covers the exported file.
 *  - the real computed font-family. happy-dom reports '"Times New Roman"' for an
 *    unstyled element, which no browser would. Tests compare the inlined value
 *    against `getComputedStyle` rather than a hard-coded font name.
 */

/** Everything observable about one or more downloadSvg() calls. */
interface DownloadCapture {
  /** `download` attribute of each anchor at the moment click() was called. */
  filenames: string[];
  /** `href` of each anchor at the moment click() was called. */
  hrefs: string[];
  /** Whether the anchor was in document.body at the moment click() was called. */
  inBodyAtClick: boolean[];
  /** Object URLs handed out by URL.createObjectURL. */
  created: string[];
  /** Object URLs passed to URL.revokeObjectURL. */
  revoked: string[];
  /** Blobs passed to URL.createObjectURL. */
  blobs: Blob[];
}

/**
 * Instrument the whole download path. Spies are undone by `vi.restoreAllMocks()`
 * in afterEach.
 */
function captureDownload(): DownloadCapture {
  const capture: DownloadCapture = {
    filenames: [],
    hrefs: [],
    inBodyAtClick: [],
    created: [],
    revoked: [],
    blobs: []
  };

  let counter = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    const url = `blob:captured-${counter++}`;
    capture.blobs.push(blob as Blob);
    capture.created.push(url);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
    capture.revoked.push(url);
  });

  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const el = realCreateElement(tagName);
    if (tagName === 'a') {
      // happy-dom's click() is a no-op for downloads; replace it so we can see
      // the state of the anchor at the exact moment the browser would act.
      el.click = () => {
        const anchor = el as HTMLAnchorElement;
        capture.filenames.push(anchor.download);
        capture.hrefs.push(anchor.href);
        capture.inBodyAtClick.push(document.body.contains(anchor));
      };
    }
    return el;
  });

  return capture;
}

/** Serialized text of the Nth exported blob. */
async function exportedText(capture: DownloadCapture, index = 0): Promise<string> {
  return capture.blobs[index].text();
}

async function pieFixture(
  attributes: Record<string, string> = {},
  innerHTML = '<dc-pie-slice value="50" label="A"></dc-pie-slice><dc-pie-slice value="50" label="B"></dc-pie-slice>'
): Promise<PieChart> {
  const chart = await fixture<PieChart>('dc-pie-chart', attributes, innerHTML);
  await elementUpdated(chart);
  return chart;
}

describe('SVG export (characterization)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Public API surface
  // ==========================================================================

  describe('public API surface', () => {
    it('downloadSvg is a public method on the chart instance', async () => {
      const chart = await pieFixture();
      expect(typeof chart.downloadSvg).toBe('function');
    });

    it('downloadSvg declares exactly one optional parameter', async () => {
      const chart = await pieFixture();
      // A default value means `length` counts the parameters *before* it: 0.
      expect(chart.downloadSvg.length).toBe(0);
    });

    it('downloadSvg returns undefined', async () => {
      const chart = await pieFixture();
      captureDownload();
      expect(chart.downloadSvg()).toBeUndefined();
    });

    it('downloadSvg lives on BaseChart, not on the concrete chart class', async () => {
      const chart = await pieFixture();
      // Walk to the prototype that actually owns the method. It must not be
      // PieChart's own prototype - every chart type shares one implementation.
      let proto = Object.getPrototypeOf(chart);
      while (proto && !Object.prototype.hasOwnProperty.call(proto, 'downloadSvg')) {
        proto = Object.getPrototypeOf(proto);
      }
      expect(proto).not.toBeNull();
      expect(proto).not.toBe(PieChart.prototype);
      expect(proto.constructor.name).toContain('BaseChart');
    });

    it('works the same on an axis chart as on a pie chart', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' },
        '<dc-bar value="10" label="A"></dc-bar>');
      await elementUpdated(chart);
      const capture = captureDownload();
      chart.downloadSvg('bars');
      expect(capture.filenames).toEqual(['bars.svg']);
      expect(await exportedText(capture)).toContain('<svg');
    });
  });

  // ==========================================================================
  // Filename handling
  // ==========================================================================

  describe('filename handling', () => {
    it("defaults to 'chart.svg'", async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      expect(capture.filenames).toEqual(['chart.svg']);
    });

    it("appends '.svg' when missing", async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg('report');
      expect(capture.filenames).toEqual(['report.svg']);
    });

    it("does not double up an existing '.svg'", async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg('report.svg');
      expect(capture.filenames).toEqual(['report.svg']);
    });

    it('the extension check is case-insensitive and preserves the original case', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg('REPORT.SVG');
      chart.downloadSvg('a.b.SvG');
      expect(capture.filenames).toEqual(['REPORT.SVG', 'a.b.SvG']);
    });

    it("turns an empty filename into '.svg'", async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      // SURPRISE: '' is falsy but is NOT replaced by the default - only
      // `undefined` triggers the default parameter. The result is a dotfile.
      chart.downloadSvg('');
      expect(capture.filenames).toEqual(['.svg']);
    });

    it('does not sanitize path separators or spaces', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      // SURPRISE: no sanitization at all. Browsers sanitize `download` themselves,
      // which is presumably why this has never bitten.
      chart.downloadSvg('my chart/name');
      expect(capture.filenames).toEqual(['my chart/name.svg']);
    });

    it('explicit undefined still gets the default', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg(undefined);
      expect(capture.filenames).toEqual(['chart.svg']);
    });

    it('throws on a non-string filename (no argument guard)', async () => {
      const chart = await pieFixture();
      captureDownload();
      // SURPRISE: there is no type guard, so a JS caller passing null or a
      // number gets a TypeError out of `filename.toLowerCase()` rather than a
      // DC-coded warning. Pinned as-is; the SVG has already been located by
      // this point, so nothing is cleaned up either.
      expect(() => (chart as unknown as { downloadSvg(f: unknown): void }).downloadSvg(null))
        .toThrow(TypeError);
      expect(() => (chart as unknown as { downloadSvg(f: unknown): void }).downloadSvg(123))
        .toThrow(TypeError);
    });
  });

  // ==========================================================================
  // Missing SVG - the DC204 early return
  // ==========================================================================

  describe('missing SVG element', () => {
    it('warns with the exact DC204 message and returns', async () => {
      const chart = await pieFixture();
      chart.shadowRoot?.querySelector('svg')?.remove();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      chart.downloadSvg();

      expect(warn).toHaveBeenCalledWith('[DC204] No SVG element found in chart shadow DOM');
    });

    it('warns via console.warn directly, not through the DC logging system', async () => {
      // The message is built inline from ErrorCode.SVG_NOT_FOUND rather than
      // routed through this.logError(), so no log entry is recorded and the
      // `logging` attribute has no effect on it.
      const chart = await pieFixture({ logging: 'all' });
      chart.shadowRoot?.querySelector('svg')?.remove();
      const logError = vi.spyOn(chart as unknown as { logError: () => void }, 'logError');
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      chart.downloadSvg();

      expect(logError).not.toHaveBeenCalled();
    });

    it('creates no blob, no object URL and no anchor', async () => {
      const chart = await pieFixture();
      chart.shadowRoot?.querySelector('svg')?.remove();
      const capture = captureDownload();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      chart.downloadSvg('never-written');

      expect(capture.created).toEqual([]);
      expect(capture.blobs).toEqual([]);
      expect(capture.filenames).toEqual([]);
    });

    it('does not throw when there is no shadow root content at all', async () => {
      const chart = await pieFixture();
      chart.shadowRoot?.replaceChildren();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => chart.downloadSvg()).not.toThrow();
    });
  });

  // ==========================================================================
  // Blob and object-URL lifecycle
  // ==========================================================================

  describe('blob and object URL lifecycle', () => {
    it('builds a blob with type image/svg+xml;charset=utf-8', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      expect(capture.blobs).toHaveLength(1);
      expect(capture.blobs[0].type).toBe('image/svg+xml;charset=utf-8');
    });

    it('prefixes the serialized SVG with an XML declaration and a newline', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      expect(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
      expect(text.slice('<?xml version="1.0" encoding="UTF-8"?>\n'.length)).toMatch(/^<svg\b/);
    });

    it('assigns the object URL to the anchor href and the filename to download', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg('sales-report.svg');
      expect(capture.created).toEqual(['blob:captured-0']);
      expect(capture.hrefs).toEqual(['blob:captured-0']);
      expect(capture.filenames).toEqual(['sales-report.svg']);
    });

    it('the anchor is attached to document.body at the moment of click', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      // Firefox historically required the anchor be in the document for
      // programmatic download clicks; this pins that it still is.
      expect(capture.inBodyAtClick).toEqual([true]);
    });

    it('removes the anchor again, leaving the document unchanged', async () => {
      const chart = await pieFixture();
      const childrenBefore = document.body.children.length;
      const capture = captureDownload();
      chart.downloadSvg();
      expect(capture.filenames).toHaveLength(1);
      expect(document.body.children.length).toBe(childrenBefore);
      expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    });

    it('revokes the object URL it created', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      expect(capture.revoked).toEqual(['blob:captured-0']);
    });

    it('creates and revokes one URL per call, in order', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg('one');
      chart.downloadSvg('two');
      expect(capture.created).toEqual(['blob:captured-0', 'blob:captured-1']);
      expect(capture.revoked).toEqual(['blob:captured-0', 'blob:captured-1']);
      expect(capture.filenames).toEqual(['one.svg', 'two.svg']);
    });

    it('revokes synchronously, immediately after click', async () => {
      // SURPRISE-ADJACENT: revokeObjectURL runs in the same tick as click().
      // Real browsers snapshot the URL when the click is dispatched, so this
      // works, but it is the kind of ordering a refactor could silently change.
      const chart = await pieFixture();
      const order: string[] = [];
      const realCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = realCreateElement(tag);
        if (tag === 'a') el.click = () => order.push('click');
        return el;
      });
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
        order.push('create');
        return 'blob:x';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
        order.push('revoke');
      });

      chart.downloadSvg();

      expect(order).toEqual(['create', 'click', 'revoke']);
    });

    it('exports from a chart that has been removed from the document', async () => {
      const chart = await pieFixture();
      chart.remove();
      const capture = captureDownload();
      // The shadow root survives disconnection, so export still works. The
      // anchor is still appended to document.body, which is unrelated to the
      // chart's own connectedness.
      expect(() => chart.downloadSvg('detached')).not.toThrow();
      expect(capture.filenames).toEqual(['detached.svg']);
      expect(await exportedText(capture)).toContain('<svg');
    });
  });

  // ==========================================================================
  // prepareSvgForExport
  // ==========================================================================

  describe('prepareSvgForExport', () => {
    /** prepareSvgForExport is private; tests reach it the way the old suite does. */
    function prepare(chart: PieChart | Chart, el: SVGElement): unknown {
      return (chart as unknown as { prepareSvgForExport(e: SVGElement): unknown })
        .prepareSvgForExport(el);
    }

    it('returns undefined and mutates the element in place', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      expect(prepare(chart, clone)).toBeUndefined();
    });

    it('adds the SVG namespace when absent', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.removeAttribute('xmlns');
      prepare(chart, clone);
      expect(clone.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    });

    it('leaves an existing xmlns alone, even a wrong one', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://example.com/not-svg');
      prepare(chart, clone);
      expect(clone.getAttribute('xmlns')).toBe('http://example.com/not-svg');
    });

    it('the rendered chart already carries xmlns, so that branch never fires in practice', async () => {
      const chart = await pieFixture();
      // SURPRISE: the render template sets xmlns itself. The "add xmlns" branch
      // is defensive only - it is dead for every chart this library renders.
      expect(chart.shadowRoot!.querySelector('svg')!.getAttribute('xmlns'))
        .toBe('http://www.w3.org/2000/svg');
    });

    it('sets width and height from the chart properties when both are absent', async () => {
      const chart = await pieFixture({ width: '400', height: '300' });
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      prepare(chart, clone);
      expect(clone.getAttribute('width')).toBe('400');
      expect(clone.getAttribute('height')).toBe('300');
    });

    it('overwrites BOTH when only one is missing', async () => {
      const chart = await pieFixture({ width: '500', height: '350' });
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.setAttribute('width', '999');
      clone.removeAttribute('height');
      prepare(chart, clone);
      // SURPRISE: the guard is `!hasWidth || !hasHeight` but the body sets both,
      // so a pre-existing width of 999 is clobbered by the chart's width.
      expect(clone.getAttribute('width')).toBe('500');
      expect(clone.getAttribute('height')).toBe('350');
    });

    it('leaves both alone when both are already present', async () => {
      const chart = await pieFixture({ width: '500', height: '350' });
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.setAttribute('width', '999');
      clone.setAttribute('height', '888');
      prepare(chart, clone);
      expect(clone.getAttribute('width')).toBe('999');
      expect(clone.getAttribute('height')).toBe('888');
    });

    it('writes width/height as unitless strings, not px', async () => {
      const chart = await pieFixture({ width: '640', height: '480' });
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      prepare(chart, clone);
      expect(clone.getAttribute('width')).toBe('640');
      expect(clone.getAttribute('height')).toBe('480');
    });

    it('inlines the host computed font-family onto every bare text element', async () => {
      const chart = await pieFixture({}, `
        <dc-title>Test Title</dc-title>
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const svg = chart.shadowRoot!.querySelector('svg')!;
      const clone = svg.cloneNode(true) as SVGElement;
      const expected = window.getComputedStyle(chart).fontFamily;

      prepare(chart, clone);

      const texts = Array.from(clone.querySelectorAll('text'));
      expect(texts.length).toBeGreaterThan(0);
      // happy-dom reports '"Times New Roman"' for an unstyled element. The value
      // itself is environment-specific; that it comes from getComputedStyle on
      // the host is the behaviour being pinned.
      for (const t of texts) {
        expect(t.getAttribute('font-family')).toBe(expected);
      }
    });

    it('uses the host inline style when one is set', async () => {
      const chart = await pieFixture({ style: 'font-family: Comic Sans MS, cursive' });
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      prepare(chart, clone);
      const ff = clone.querySelector('text')!.getAttribute('font-family');
      expect(ff).toBe(window.getComputedStyle(chart).fontFamily);
      expect(ff).toContain('Comic Sans MS');
    });

    it('preserves an explicit font-family already on a text element', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      const first = clone.querySelector('text')!;
      first.setAttribute('font-family', 'Papyrus');
      prepare(chart, clone);
      expect(first.getAttribute('font-family')).toBe('Papyrus');
    });

    it('treats an empty font-family as absent and overwrites it', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      const first = clone.querySelector('text')!;
      first.setAttribute('font-family', '');
      prepare(chart, clone);
      expect(first.getAttribute('font-family')).toBe(window.getComputedStyle(chart).fontFamily);
      expect(first.getAttribute('font-family')).not.toBe('');
    });

    it('reads the computed style exactly once regardless of text count', async () => {
      const chart = await pieFixture({}, `
        <dc-pie-slice value="1" label="A"></dc-pie-slice>
        <dc-pie-slice value="2" label="B"></dc-pie-slice>
        <dc-pie-slice value="3" label="C"></dc-pie-slice>
      `);
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      const spy = vi.spyOn(window, 'getComputedStyle');
      prepare(chart, clone);
      expect(clone.querySelectorAll('text').length).toBeGreaterThan(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('touches no other font attributes', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      const first = clone.querySelector('text')!;
      const sizeBefore = first.getAttribute('font-size');
      const fillBefore = first.getAttribute('fill');
      prepare(chart, clone);
      expect(first.getAttribute('font-size')).toBe(sizeBefore);
      expect(first.getAttribute('fill')).toBe(fillBefore);
    });

    it('handles an SVG with no text elements', async () => {
      const chart = await pieFixture();
      const clone = chart.shadowRoot!.querySelector('svg')!.cloneNode(true) as SVGElement;
      clone.querySelectorAll('text').forEach(t => t.remove());
      expect(() => prepare(chart, clone)).not.toThrow();
      expect(clone.getAttribute('width')).toBe('600');
    });
  });

  // ==========================================================================
  // The live DOM must not be touched
  // ==========================================================================

  describe('live DOM is left alone', () => {
    it('the on-screen SVG gains no width/height attribute from an export', async () => {
      const chart = await pieFixture({ width: '400', height: '300' });
      const live = chart.shadowRoot!.querySelector('svg')!;
      expect(live.hasAttribute('width')).toBe(false);
      expect(live.hasAttribute('height')).toBe(false);

      captureDownload();
      chart.downloadSvg();

      expect(live.hasAttribute('width')).toBe(false);
      expect(live.hasAttribute('height')).toBe(false);
    });

    it('the on-screen text elements gain no font-family from an export', async () => {
      const chart = await pieFixture();
      const live = chart.shadowRoot!.querySelector('svg')!;
      const before = Array.from(live.querySelectorAll('text'))
        .map(t => t.getAttribute('font-family'));
      expect(before).toContain(null);

      captureDownload();
      chart.downloadSvg();

      const after = Array.from(live.querySelectorAll('text'))
        .map(t => t.getAttribute('font-family'));
      expect(after).toEqual(before);
    });
  });

  // ==========================================================================
  // What the exported document actually contains
  // ==========================================================================

  describe('exported document contents', () => {
    it('includes the chart data labels', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' },
        '<dc-bar value="10" label="Alpha"></dc-bar><dc-bar value="20" label="Beta"></dc-bar>');
      await elementUpdated(chart);
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      expect(text).toContain('Alpha');
      expect(text).toContain('Beta');
    });

    it('includes <defs> and pattern definitions', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' }, `
        <dc-bar value="10" label="A" pattern="dots"></dc-bar>
        <dc-bar value="20" label="B"></dc-bar>
      `);
      await elementUpdated(chart);
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      expect(text).toContain('<defs');
      expect(text).toContain('<pattern');
    });

    it('does NOT inline the component stylesheet', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' }, `
        <dc-title>T</dc-title>
        <dc-bar value="10" label="A"></dc-bar>
      `);
      await elementUpdated(chart);
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      // SURPRISE: only the <svg> subtree is cloned, so the shadow root's
      // <style> is dropped and font-family is the ONLY style inlined. Any
      // CSS-driven appearance (::part rules, CSS custom properties, host
      // colours) is lost in the exported file.
      expect(text).not.toContain('<style');
    });

    it('carries Lit template marker comments into the exported file', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      // SURPRISE: the clone is not scrubbed, so lit-html's binding markers ship
      // inside the downloaded SVG. Harmless to renderers, but visible to anyone
      // who opens the file in a text editor.
      expect(text).toMatch(/<!--\?lit\$\d+\$-->/);
    });

    it('carries the accessibility description and a resolvable aria-describedby', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      // I expected this to be dangling - the <desc> element is in fact rendered
      // INSIDE the <svg>, so the reference still resolves in the exported file
      // and the generated insight text ships with the download.
      const match = /aria-describedby="([^"]+)"/.exec(text);
      expect(match).not.toBeNull();
      const id = match![1];
      expect(id).toMatch(/^dc-desc-\d+$/);
      expect(text).toContain(`<desc id="${id}">`);
      expect(text).toContain('2 slices totaling 100');
    });

    it('keeps interaction attributes such as tabindex and part', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      expect(text).toContain('tabindex="0"');
      expect(text).toContain('part="chart"');
    });

    it('preserves the viewBox from the rendered chart', async () => {
      const chart = await pieFixture({ width: '400', height: '300' });
      const capture = captureDownload();
      chart.downloadSvg();
      const text = await exportedText(capture);
      expect(text).toContain('viewBox="0 0 400 300"');
    });

    it('exports an empty chart without error', async () => {
      const chart = await fixture<PieChart>('dc-pie-chart', { width: '300', height: '200' });
      await elementUpdated(chart);
      const capture = captureDownload();
      expect(() => chart.downloadSvg('empty')).not.toThrow();
      const text = await exportedText(capture);
      expect(text).toContain('width="300"');
      expect(text).toContain('height="200"');
    });
  });

  // ==========================================================================
  // HAZARD (b): the exporter must read LIVE chart state, not a snapshot
  //
  // Each of these fails if an extracted exporter captures values at
  // construction time instead of reading them through live getters.
  // ==========================================================================

  describe('live state (fails if values are snapshotted)', () => {
    it('picks up a width/height change made after the first export', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' },
        '<dc-bar value="10" label="A"></dc-bar>');
      await elementUpdated(chart);
      const capture = captureDownload();

      chart.downloadSvg();
      const first = await exportedText(capture, 0);
      expect(first).toContain('width="400"');
      expect(first).toContain('height="300"');

      chart.width = 800;
      chart.height = 600;
      await elementUpdated(chart);
      chart.downloadSvg();

      const second = await exportedText(capture, 1);
      expect(second).toContain('width="800"');
      expect(second).toContain('height="600"');
      expect(second).toContain('viewBox="0 0 800 600"');
    });

    it('picks up a width change made via setAttribute', async () => {
      const chart = await pieFixture({ width: '400', height: '300' });
      chart.setAttribute('width', '720');
      await elementUpdated(chart);
      const capture = captureDownload();
      chart.downloadSvg();
      expect(await exportedText(capture)).toContain('width="720"');
    });

    it('picks up a font-family change on the host between exports', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();

      chart.downloadSvg();
      const first = await exportedText(capture, 0);
      expect(first).not.toContain('Papyrus');

      chart.style.fontFamily = 'Papyrus, fantasy';
      chart.downloadSvg();

      const second = await exportedText(capture, 1);
      expect(second).toContain('Papyrus');
    });

    it('exports the current render, not the one present at first export', async () => {
      const chart = await fixture<Chart>('dc-chart', { width: '400', height: '300' },
        '<dc-bar value="10" label="AAA"></dc-bar>');
      await elementUpdated(chart);
      const capture = captureDownload();

      chart.downloadSvg();
      expect(await exportedText(capture, 0)).not.toContain('ZZZ');

      const bar = document.createElement('dc-bar');
      bar.setAttribute('value', '20');
      bar.setAttribute('label', 'ZZZ');
      chart.appendChild(bar);
      chart.requestUpdate();
      await elementUpdated(chart);

      chart.downloadSvg();
      expect(await exportedText(capture, 1)).toContain('ZZZ');
    });

    it('exports the SVG element currently in the shadow root', async () => {
      // Not merely the same element by identity - the query is re-run each call.
      const chart = await pieFixture();
      const capture = captureDownload();
      chart.downloadSvg();
      expect(capture.blobs).toHaveLength(1);

      chart.shadowRoot!.querySelector('svg')!.setAttribute('data-marker', 'later');
      chart.downloadSvg();
      expect(await exportedText(capture, 1)).toContain('data-marker="later"');
    });
  });

  // ==========================================================================
  // HAZARD (a): moving code out of the class must not sever virtual dispatch
  // ==========================================================================

  describe('override seams (fails if virtual dispatch is bypassed)', () => {
    it('downloadSvg dispatches through the chart to prepareSvgForExport', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      const spy = vi.spyOn(
        chart as unknown as { prepareSvgForExport(e: SVGElement): void },
        'prepareSvgForExport'
      );

      chart.downloadSvg();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(capture.blobs).toHaveLength(1);
    });

    it('prepareSvgForExport receives the CLONE, not the live SVG', async () => {
      const chart = await pieFixture();
      captureDownload();
      const live = chart.shadowRoot!.querySelector('svg')!;
      let received: SVGElement | null = null;
      vi.spyOn(
        chart as unknown as { prepareSvgForExport(e: SVGElement): void },
        'prepareSvgForExport'
      ).mockImplementation((el: SVGElement) => { received = el; });

      chart.downloadSvg();

      expect(received).not.toBeNull();
      expect(received).not.toBe(live);
      expect((received as unknown as SVGElement).tagName.toLowerCase()).toBe('svg');
    });

    it('a replaced prepareSvgForExport fully governs the exported output', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      // If an extracted exporter calls its OWN copy of prepareSvgForExport, this
      // marker never appears and the width attribute still does - which is
      // exactly the silent break this test exists to catch.
      (chart as unknown as { prepareSvgForExport(e: SVGElement): void })
        .prepareSvgForExport = (el: SVGElement) => {
          el.setAttribute('data-overridden', 'yes');
        };

      chart.downloadSvg();

      const text = await exportedText(capture);
      expect(text).toContain('data-overridden="yes"');
      expect(text).not.toMatch(/\swidth="/);
    });

    it('prepareSvgForExport measures the chart host element itself', async () => {
      const chart = await pieFixture();
      captureDownload();
      const spy = vi.spyOn(window, 'getComputedStyle');

      chart.downloadSvg();

      // `this` inside prepareSvgForExport must remain the chart element. An
      // extracted exporter passing itself (or the cloned SVG) would still type
      // check and would still produce a font-family - just the wrong one.
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBe(chart);
    });

    it('a subclass-style downloadSvg override can wrap the base implementation', async () => {
      const chart = await pieFixture();
      const capture = captureDownload();
      const base = chart.downloadSvg.bind(chart);
      const calls: string[] = [];
      (chart as unknown as { downloadSvg(f?: string): void }).downloadSvg = (f?: string) => {
        calls.push(f ?? '<default>');
        base(f);
      };

      (chart as unknown as { downloadSvg(f?: string): void }).downloadSvg('wrapped');

      expect(calls).toEqual(['wrapped']);
      expect(capture.filenames).toEqual(['wrapped.svg']);
    });
  });
});
