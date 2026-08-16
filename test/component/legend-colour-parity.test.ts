import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';

/**
 * Two colour resolvers exist. `resolveFillsWithPatterns()` branches on high
 * contrast; `resolveFillColorsWithPalette()` is the else-branch alone and knows
 * nothing about it.
 *
 * `<dc-chart>`, `<dc-funnel-chart>` and `<dc-stage-chart>` used the branching
 * one on both their render and legend paths. Pie and radar rendered with it and
 * built their legend with the other - so under `high-contrast` the marks
 * repainted to the high-contrast ramp and the swatches kept the palette ramp,
 * leaving the legend naming the wrong colour for every entry.
 *
 * Reachable only with the attribute written explicitly. The OS
 * `prefers-contrast: high` path cannot get here: the ColorResolver host adapter
 * coerces with `?? false` (base-chart.ts), and `isHighContrastActive()` returns
 * early on `=== false`, so its matchMedia branch is unreachable through that
 * adapter. Worth knowing separately - it means the documented OS auto-detect
 * does not work for fills - but it is not this defect.
 *
 * Asserted as parity between the mark and its own swatch, not against a literal
 * ramp, so the guard survives any change to the high-contrast palette.
 */
describe('a legend swatch matches the mark it describes', () => {
  const markFill = (c: Element, i: number) =>
    c.shadowRoot!.querySelector(`[data-shape-index="${i}"]`)?.getAttribute('fill');

  const swatchFills = (c: Element) =>
    [...c.shadowRoot!.querySelectorAll('[part="legend-swatch"]')]
      .map(g => g.firstElementChild?.getAttribute('fill'));

  describe('pie', () => {
    const pie = (attrs: Record<string, string>) =>
      fixture<Element>('dc-pie-chart', { width: '500', height: '400', 'console-log': 'none', ...attrs },
        '<dc-legend></dc-legend>' +
        '<dc-pie-slice value="30" label="A"></dc-pie-slice>' +
        '<dc-pie-slice value="70" label="B"></dc-pie-slice>');

    /**
     * Pie slices take a *pattern* under high contrast, so the mark's `fill` is
     * a `url(#...)` while the swatch correctly shows a solid colour - a direct
     * comparison would be wrong. The contract that does hold: turning high
     * contrast on repaints the marks, so it must repaint the swatches too. It
     * did not, which is the defect.
     */
    it('repaints the swatches when high-contrast repaints the marks', async () => {
      const plain = await pie({});
      await elementUpdated(plain as never);
      const before = swatchFills(plain);

      const contrast = await pie({ 'high-contrast': '' });
      await elementUpdated(contrast as never);
      const after = swatchFills(contrast);

      expect(markFill(contrast, 0), 'premise: high contrast changes the mark')
        .not.toBe(markFill(plain, 0));
      expect(after, 'the legend kept the palette ramp while the slices moved')
        .not.toEqual(before);
    });

    it('takes its swatch colour from the high-contrast ramp', async () => {
      const c = await pie({ 'high-contrast': '' });
      await elementUpdated(c as never);
      // The high-contrast ramp is flat hex; the generated palette is hsl().
      for (const fill of swatchFills(c)) {
        expect(fill, `${fill} is a generated palette colour, not a high-contrast one`)
          .not.toMatch(/^hsl\(/);
      }
    });

    it('still agrees without high-contrast, so nothing regressed', async () => {
      const c = await pie({});
      await elementUpdated(c as never);
      expect(swatchFills(c)).toEqual([markFill(c, 0), markFill(c, 1)]);
    });
  });

  describe('radar', () => {
    const radar = (attrs: Record<string, string>) =>
      fixture<Element>('dc-radar-chart',
        { width: '500', height: '500', 'max-value': '100', 'console-log': 'none', ...attrs },
        '<dc-legend></dc-legend>' +
        '<dc-radar-axis label="S"></dc-radar-axis><dc-radar-axis label="P"></dc-radar-axis>' +
        '<dc-radar-axis label="R"></dc-radar-axis>' +
        '<dc-radar-series label="A"><dc-point value="80" label="S"></dc-point>' +
        '<dc-point value="60" label="P"></dc-point><dc-point value="90" label="R"></dc-point>' +
        '</dc-radar-series>' +
        '<dc-radar-series label="B"><dc-point value="40" label="S"></dc-point>' +
        '<dc-point value="70" label="P"></dc-point><dc-point value="50" label="R"></dc-point>' +
        '</dc-radar-series>');

    /**
     * A radar polygon is stroked, not filled, so its swatch is compared against
     * the ring's stroke.
     */
    const ringStroke = (c: Element, i: number) =>
      c.shadowRoot!.querySelector(`[data-shape-index="${i}"]`)?.getAttribute('stroke');

    it('agrees under high-contrast', async () => {
      const c = await radar({ 'high-contrast': '' });
      await elementUpdated(c as never);
      expect(swatchFills(c)[0]).toBe(ringStroke(c, 0));
    });

    it('agrees for every series', async () => {
      const c = await radar({ 'high-contrast': '' });
      await elementUpdated(c as never);
      expect(swatchFills(c)).toEqual([ringStroke(c, 0), ringStroke(c, 1)]);
    });

    it('still agrees without high-contrast', async () => {
      const c = await radar({});
      await elementUpdated(c as never);
      expect(swatchFills(c)).toEqual([ringStroke(c, 0), ringStroke(c, 1)]);
    });
  });
});
