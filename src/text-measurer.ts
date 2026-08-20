/**
 * The slice of a chart that text measurement needs.
 *
 * Note `hostElement` rather than passing the chart directly: the default font
 * comes from `getComputedStyle()` **on the chart host**, so the measurement
 * matches what the page will actually draw. Measuring anything else - the
 * measurer, a detached canvas - still returns a font, just the wrong one. That
 * is the receiver form of the override hazard: same code, different `this`.
 */
export interface TextMeasurerHost {
  /** The chart element, used only to resolve the inherited font. */
  readonly hostElement: Element;
  /** Memoize for the duration of one render pass. */
  cachePerRender<T>(key: string, compute: () => T): T;
}

/**
 * Measures text for label fitting.
 *
 * The unit worth understanding: `measureText(text, f)` returns a width in units
 * of `f`. Because a glyph's width scales linearly with font size, that number is
 * simultaneously "pixels at font-size f" and "viewBox units at font-size f" -
 * the factors cancel. Callers rely on this, and it is why an earlier review
 * finding claiming a units mismatch was wrong. Verified in Chromium: canvas
 * reported 197.86 for text `getBBox()` measured at 197.87 user units.
 *
 * Extracted from `BaseChart` as the sixth responsibility to move out.
 */
export class TextMeasurer {
  /** Canvas context used for measurement, created once per chart. */
  private context: CanvasRenderingContext2D | null = null;

  constructor(private readonly host: TextMeasurerHost) {}

  /**
   * Width of `text` rendered at `fontSize`, in units of `fontSize`.
   *
   * @param text The text to measure
   * @param fontSize Font size, in whatever unit the caller will emit
   * @param fontFamily Font family; defaults to the chart's inherited font
   */
  measureText(text: string, fontSize = 12, fontFamily?: string): number {
    // The same string at the same size always measures the same, and label
    // fitting asks repeatedly. getComputedStyle() below is itself a layout read,
    // so this cache avoids more than the canvas call.
    return this.host.cachePerRender(`text:${fontSize}:${fontFamily ?? ''}:${text}`, () => {
      const ctx = this.getContext();
      if (!ctx) {
        // No canvas: estimate rather than fail. Rough, but a chart with
        // approximate label spacing beats a chart that does not render.
        return text.length * fontSize * 0.6;
      }

      const family = fontFamily || this.inheritedFontFamily();
      ctx.font = `${fontSize}px ${family}`;
      return ctx.measureText(text).width;
    });
  }

  /**
   * The font the chart will actually draw in.
   *
   * Mirrors the stylesheet, which sets the SVG's
   * `font-family: var(--dc-font-family, inherit)` - so the token wins when it
   * is set and the inherited font supplies the default. Reading only
   * `fontFamily` measured the page's font while the chart drew in the token's:
   * the themed path, since inheriting through the shadow boundary is the whole
   * point of the token.
   */
  private inheritedFontFamily(): string {
    const style = window.getComputedStyle(this.host.hostElement);
    const token = style.getPropertyValue('--dc-font-family').trim();
    return token || style.fontFamily || 'sans-serif';
  }

  /** Get or create the measuring context. */
  private getContext(): CanvasRenderingContext2D | null {
    if (!this.context) {
      const canvas = document.createElement('canvas');
      this.context = canvas.getContext('2d');
    }
    return this.context;
  }
}
