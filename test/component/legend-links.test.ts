import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Legend entries could not be links. `<dc-legend-item>` had no `href`, the
 * derived legend had no way to carry one, and the legend rendered no
 * interactive element of any kind.
 *
 * Two spellings, because the legend has two sources. `legend-href` on the
 * element an entry describes covers the derived legend - the common case, and
 * the one `<dc-legend-item href>` cannot reach, because declaring any custom
 * item replaces the derived legend wholesale.
 */
describe('legend links', () => {
  const anchors = (c: Element) =>
    [...c.shadowRoot!.querySelectorAll('a[part="legend-link"]')];
  const hrefs = (c: Element) => anchors(c).map(a => a.getAttribute('href'));
  const codes = (c: Element) =>
    (c as unknown as { logEntries: Array<{ level: string; code?: string; message: string }> })
      .logEntries.filter(e => e.level === 'warning' || e.level === 'error').map(e => e.code);

  const chart = (body: string) =>
    fixture<Chart>('dc-chart', { width: '500', height: '300', 'console-log': 'none' }, body);

  describe('legend-href on the element the entry describes', () => {
    it('links that entry and leaves the others alone', async () => {
      const c = await chart(
        '<dc-bar value="10" label="A" legend-href="/a"></dc-bar>' +
        '<dc-bar value="20" label="B"></dc-bar><dc-legend></dc-legend>');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/a']);
    });

    it('carries legend-target', async () => {
      const c = await chart(
        '<dc-line label="L" legend-href="/l" legend-target="_blank">' +
        '<dc-point value="1"></dc-point><dc-point value="2"></dc-point></dc-line>' +
        '<dc-legend></dc-legend>');
      await elementUpdated(c);
      expect(anchors(c)[0].getAttribute('target')).toBe('_blank');
    });

    /**
     * The deliberate non-inheritance. A chart whose bars link somewhere did not
     * ask its legend to navigate too, and a legend that silently starts
     * navigating is worse than one that never does.
     */
    it('is not inherited from the mark-s own href', async () => {
      const c = await chart(
        '<dc-bar value="10" label="A" href="/mark"></dc-bar><dc-legend></dc-legend>');
      await elementUpdated(c);
      expect(anchors(c)).toHaveLength(0);
    });

    it('draws no anchor when nothing asks for one', async () => {
      const c = await chart('<dc-bar value="10" label="A"></dc-bar><dc-legend></dc-legend>');
      await elementUpdated(c);
      expect(anchors(c)).toHaveLength(0);
    });

    /**
     * The whole entry, not just the words - a link covering only the label is a
     * smaller target than it looks.
     */
    it('wraps the swatch as well as the label', async () => {
      const c = await chart(
        '<dc-bar value="10" label="A" legend-href="/a"></dc-bar><dc-legend></dc-legend>');
      await elementUpdated(c);
      const a = anchors(c)[0];
      expect(a.querySelector('[part="legend-swatch"]'), 'swatch outside the link').not.toBeNull();
      expect(a.querySelector('[part="legend-label"]'), 'label outside the link').not.toBeNull();
    });
  });

  /**
   * These four build their legend from `getLegendItems()` like `<dc-chart>`
   * does. Pie, funnel and stage used to construct a second list inline in
   * `render()`, so a link set here reached the padding pass and never the
   * picture - which is how that duplication was found.
   */
  describe('every chart type', () => {
    it('links a pie slice', async () => {
      const c = await fixture<Element>('dc-pie-chart',
        { width: '500', height: '300', 'console-log': 'none' },
        '<dc-pie-slice value="30" label="X" legend-href="/x"></dc-pie-slice>' +
        '<dc-pie-slice value="70" label="Y"></dc-pie-slice><dc-legend></dc-legend>');
      await elementUpdated(c as never);
      expect(hrefs(c)).toEqual(['/x']);
    });

    it('links a funnel stage', async () => {
      const c = await fixture<Element>('dc-funnel-chart',
        { width: '500', height: '300', 'console-log': 'none' },
        '<dc-funnel-stage value="100" label="X" legend-href="/x"></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="Y"></dc-funnel-stage><dc-legend></dc-legend>');
      await elementUpdated(c as never);
      expect(hrefs(c)).toEqual(['/x']);
    });

    it('links a stage', async () => {
      const c = await fixture<Element>('dc-stage-chart',
        { width: '500', height: '400', 'console-log': 'none' },
        '<dc-stage value="100" label="X" legend-href="/x"></dc-stage>' +
        '<dc-stage value="50" label="Y"></dc-stage><dc-legend></dc-legend>');
      await elementUpdated(c as never);
      expect(hrefs(c)).toEqual(['/x']);
    });

    it('links a radar series', async () => {
      const c = await fixture<Element>('dc-radar-chart',
        { width: '500', height: '500', 'max-value': '100', 'console-log': 'none' },
        '<dc-radar-axis label="S"></dc-radar-axis><dc-radar-axis label="P"></dc-radar-axis>' +
        '<dc-radar-axis label="R"></dc-radar-axis>' +
        '<dc-radar-series label="A" legend-href="/a"><dc-point value="80" label="S"></dc-point>' +
        '<dc-point value="60" label="P"></dc-point><dc-point value="90" label="R"></dc-point>' +
        '</dc-radar-series><dc-legend></dc-legend>');
      await elementUpdated(c as never);
      expect(hrefs(c)).toEqual(['/a']);
    });

    it('links a scatter series', async () => {
      const c = await chart(
        '<dc-scatter label="S" legend-href="/s"><dc-point x="1" value="10"></dc-point>' +
        '<dc-point x="2" value="20"></dc-point></dc-scatter><dc-legend></dc-legend>');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/s']);
    });
  });

  describe('href on a custom legend item', () => {
    it('links the entry', async () => {
      const c = await chart(
        '<dc-bar value="10" label="A"></dc-bar>' +
        '<dc-legend><dc-legend-item label="Key" fill="#333" href="/key"></dc-legend-item></dc-legend>');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/key']);
    });

    it('carries target', async () => {
      const c = await chart(
        '<dc-bar value="10" label="A"></dc-bar>' +
        '<dc-legend><dc-legend-item label="Key" fill="#333" href="/k" target="_blank">' +
        '</dc-legend-item></dc-legend>');
      await elementUpdated(c);
      expect(anchors(c)[0].getAttribute('target')).toBe('_blank');
    });
  });

  /**
   * A stacked legend has one entry per segment *label*, but the label appears
   * once per bar - so several elements can claim the same entry.
   */
  describe('when several elements claim one entry', () => {
    const stacked = (first: string, second: string) =>
      chart(
        `<dc-bar label="Q1"><dc-bar-segment value="5" label="S" ${first}></dc-bar-segment></dc-bar>` +
        `<dc-bar label="Q2"><dc-bar-segment value="7" label="S" ${second}></dc-bar-segment></dc-bar>` +
        '<dc-legend></dc-legend>');

    it('takes the first non-empty one', async () => {
      const c = await stacked('', 'legend-href="/s"');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/s']);
    });

    it('keeps the first when they agree, without complaint', async () => {
      const c = await stacked('legend-href="/s"', 'legend-href="/s"');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/s']);
      expect(codes(c)).toEqual([]);
    });

    it('reports DC118 when they disagree', async () => {
      const c = await stacked('legend-href="/s"', 'legend-href="/other"');
      await elementUpdated(c);
      expect(codes(c)).toContain('DC118');
    });

    it('uses the first of the two it was given', async () => {
      const c = await stacked('legend-href="/s"', 'legend-href="/other"');
      await elementUpdated(c);
      expect(hrefs(c)).toEqual(['/s']);
    });

    /**
     * `getLegendItems()` runs more than once per cycle - the padding pass sizes
     * the legend before the render draws it - so an uncached warning fired
     * three times for one mistake.
     */
    it('reports the conflict once, not once per pass', async () => {
      const c = await stacked('legend-href="/s"', 'legend-href="/other"');
      await elementUpdated(c);
      expect(codes(c).filter(code => code === 'DC118')).toHaveLength(1);
    });

    it('names the entry in the message', async () => {
      const c = await stacked('legend-href="/s"', 'legend-href="/other"');
      await elementUpdated(c);
      const entry = (c as unknown as { logEntries: Array<{ code?: string; message: string }> })
        .logEntries.find(e => e.code === 'DC118');
      expect(entry!.message).toContain('"S"');
    });
  });
});
