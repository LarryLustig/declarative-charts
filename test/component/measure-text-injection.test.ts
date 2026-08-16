import { describe, it, expect, beforeAll } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';

/**
 * `TextMeasurer` is the extracted measurer, and its own header records the
 * hazard it exists to prevent: the default font comes from `getComputedStyle()`
 * **on the chart host**, so measuring anything else still returns a font, just
 * the wrong one.
 *
 * `<dc-legend>` and `<dc-title>` each carried a byte-identical private copy
 * that fell back to `'sans-serif'` - and every legend call site passed only two
 * arguments, so the family was never forwarded at all. A legend was therefore
 * always *measured* in sans-serif however the page was drawn, while the chart
 * around it measured correctly. It also created a fresh `<canvas>` per call,
 * inside loops, in a `getDimensions()` that `getChartPadding()` runs every
 * render - with none of `cachePerRender`'s memoisation.
 *
 * They are light-DOM children, not `BaseChart` subclasses, so they cannot
 * inherit `this.measureText`. Constructing a `TextMeasurer` inside them would
 * reproduce the hazard above exactly - `this` becomes the legend and
 * `getComputedStyle` reads the wrong element. The chart injects its own
 * measurer instead, the way it already injects `fontScale` and
 * `resolvePattern`.
 *
 * The default canvas mock in `setup.ts` measures `length * size * 0.6` and
 * ignores the family, so it cannot see this defect. These tests install a
 * family-aware one.
 */
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (id: string): unknown {
    if (id !== '2d') return null;
    let font = '12px sans-serif';
    return {
      set font(v: string) { font = v; },
      get font() { return font; },
      measureText(t: string) {
        const size = parseFloat(font) || 12;
        // A font whose name says "Wide" measures four times as wide per glyph.
        const factor = /Wide/i.test(font) ? 4 : 1;
        return { width: t.length * size * 0.6 * factor };
      }
    };
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('legend and title measure in the chart-s font', () => {
  const chart = (style: string, body: string) =>
    fixture<Element>('dc-chart',
      { width: '600', height: '400', 'console-log': 'none', ...(style ? { style } : {}) }, body);

  const legendWidth = (c: Element) =>
    Number(c.shadowRoot!.querySelector('[part="legend-background"]')?.getAttribute('width'));

  const LEGEND_CHART = '<dc-legend></dc-legend><dc-bar value="10" label="Alphabetical"></dc-bar>';

  it('sizes the legend box from the font the chart inherits', async () => {
    const wide = await chart('font-family: WideFont', LEGEND_CHART);
    await elementUpdated(wide as never);
    const plain = await chart('', LEGEND_CHART);
    await elementUpdated(plain as never);

    expect(
      (wide as unknown as { measureText(t: string, s: number): number }).measureText('Alphabetical', 12),
      'premise: the chart-s own measurer sees the wide font'
    ).toBeGreaterThan(
      (plain as unknown as { measureText(t: string, s: number): number }).measureText('Alphabetical', 12)
    );

    expect(legendWidth(wide), 'the legend was measured in sans-serif regardless of the page font')
      .toBeGreaterThan(legendWidth(plain));
  });

  /**
   * The injection has to happen before BOTH passes. The legend is sized once in
   * `getLegendDimensions()` to reserve padding and again in `renderLegend()` to
   * draw; wiring only the second would leave the reserved space computed from a
   * different font than the box that lands in it.
   */
  it('reserves padding from the same font it draws with', async () => {
    const wide = await chart('font-family: WideFont', LEGEND_CHART);
    await elementUpdated(wide as never);
    const plain = await chart('', LEGEND_CHART);
    await elementUpdated(plain as never);

    const padding = (c: Element) =>
      (c as unknown as { getChartPadding(): { right: number } }).getChartPadding().right;

    expect(padding(wide), 'the padding pass did not see the font')
      .toBeGreaterThan(padding(plain));
  });

  it('sizes the title from the font the chart inherits', async () => {
    const body = '<dc-title>Quarterly Revenue</dc-title><dc-bar value="10" label="A"></dc-bar>';
    const wide = await chart('font-family: WideFont', body);
    await elementUpdated(wide as never);
    const plain = await chart('', body);
    await elementUpdated(plain as never);

    const titleWidth = (c: Element) =>
      (c.querySelector('dc-title') as unknown as { getDimensions(): { width: number } })
        .getDimensions().width;

    expect(titleWidth(wide)).toBeGreaterThan(titleWidth(plain));
  });

  /**
   * The fallback has to survive. A `<dc-legend>` with no chart around it gets
   * no injection, and must still measure rather than throw.
   */
  it('still measures a legend that no chart has wired up', async () => {
    const legend = await fixture<Element>('dc-legend', {}, '');
    const dims = (legend as unknown as {
      getDimensions(items: unknown[], w: number): { width: number; height: number };
    }).getDimensions([{ label: 'Solo', color: '#000', value: 1 }], 600);
    expect(dims.width).toBeGreaterThan(0);
  });
});
