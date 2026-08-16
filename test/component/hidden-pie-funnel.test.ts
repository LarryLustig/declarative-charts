import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { PieChart } from '../../src/pie-chart';
import { FunnelChart } from '../../src/funnel-chart';

/**
 * `<dc-pie-slice>` and `<dc-funnel-stage>` were the last two data walks without
 * a `hidden` filter - every other one has it, and `<dc-stage>` was fixed for
 * the same reason earlier.
 *
 * The chart contradicted itself. `countHiddenDataElements()` counts hidden
 * slices, so `hasHiddenDataElements()` reported them, while the extractor
 * handed them to the layout and drew them anyway - which also made `DC002`
 * unreachable on both chart types.
 *
 * The behaviour change is deliberate and user-approved: a hidden element now
 * leaves the *total* as well as the picture, so the remainder renormalise.
 * That is what a filter UI means by hiding one, and it is what every other
 * chart type already did.
 */
describe('hidden on pie slices and funnel stages', () => {
  const shapes = (c: Element) => c.shadowRoot!.querySelectorAll('[data-shape-index]').length;
  const emptyText = (c: Element) =>
    c.shadowRoot!.querySelector('[part="empty"]')?.textContent?.trim() ?? null;
  const codes = (c: Element) =>
    (c as unknown as { logEntries: Array<{ level: string; code?: string }> })
      .logEntries.filter(e => e.level === 'warning' || e.level === 'error').map(e => e.code);
  const labels = (c: Element) =>
    [...c.shadowRoot!.querySelectorAll('text')].map(t => t.textContent?.trim());

  describe('pie', () => {
    const pie = (body: string) =>
      fixture<PieChart>('dc-pie-chart', { width: '500', height: '400', 'console-log': 'none' }, body);

    it('does not draw a hidden slice', async () => {
      const c = await pie(
        '<dc-pie-slice value="50" label="A"></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="B" hidden></dc-pie-slice>');
      await elementUpdated(c);
      expect(shapes(c)).toBe(1);
    });

    /**
     * The load-bearing consequence. Before, a hidden slice still contributed to
     * the total, so the visible half-pie reported 50% of a number the reader
     * could not see.
     *
     * The expected string is "100.0%", not "100%": `percentFormat` defaults to
     * `'percent 1'` (base-chart.ts), one fraction digit.
     */
    it('renormalises the remaining slices to 100%', async () => {
      const c = await pie(
        '<dc-pie-chart-marker></dc-pie-chart-marker>'.replace(/.*/, '') +
        '<dc-pie-slice value="50" label="A" show-percent></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="B" hidden></dc-pie-slice>');
      await elementUpdated(c);
      expect(labels(c)).toContain('100.0%');
    });

    it('reaches the all-hidden empty state, which used to be unreachable', async () => {
      const c = await pie(
        '<dc-pie-slice value="50" label="A" hidden></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="B" hidden></dc-pie-slice>');
      await elementUpdated(c);
      expect(emptyText(c)).toBe('All series are hidden');
    });

    it('logs DC002 rather than drawing a full pie', async () => {
      const c = await pie(
        '<dc-pie-slice value="50" label="A" hidden></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="B" hidden></dc-pie-slice>');
      await elementUpdated(c);
      expect(codes(c)).toContain('DC002');
    });

    it('drops the hidden slice from the legend', async () => {
      const c = await pie(
        '<dc-legend></dc-legend>' +
        '<dc-pie-slice value="50" label="Alpha"></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="Beta" hidden></dc-pie-slice>');
      await elementUpdated(c);
      const text = c.shadowRoot!.textContent ?? '';
      expect(text).toContain('Alpha');
      expect(text).not.toContain('Beta');
    });

    it('leaves an unhidden chart untouched, so nothing else moves', async () => {
      const c = await pie(
        '<dc-pie-slice value="50" label="A"></dc-pie-slice>' +
        '<dc-pie-slice value="50" label="B"></dc-pie-slice>');
      await elementUpdated(c);
      expect(shapes(c)).toBe(2);
      expect(codes(c)).toEqual([]);
    });
  });

  describe('funnel', () => {
    const funnel = (body: string) =>
      fixture<FunnelChart>('dc-funnel-chart', { width: '500', height: '400', 'console-log': 'none' }, body);

    it('does not draw a hidden stage', async () => {
      const c = await funnel(
        '<dc-funnel-stage value="100" label="A"></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="B" hidden></dc-funnel-stage>');
      await elementUpdated(c);
      expect(shapes(c)).toBe(1);
    });

    /**
     * The label percent is share of total, not conversion against the first
     * stage - conversion is the popup's measure. So the visible consequence of
     * hiding is that the total shrinks and every remaining share grows.
     *
     * Asserted as a comparison rather than against a literal, because the
     * literal is what my first attempt got wrong: with 200 hidden, A is
     * 100/150 = 66.7%, not the 100% a conversion reading would predict.
     */
    it('renormalises the remaining shares over the visible total', async () => {
      const withHidden = await funnel(
        '<dc-funnel-stage value="200" label="Dropped" hidden></dc-funnel-stage>' +
        '<dc-funnel-stage value="100" label="A" show-percent></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="B" show-percent></dc-funnel-stage>');
      await elementUpdated(withHidden);

      const withoutIt = await funnel(
        '<dc-funnel-stage value="100" label="A" show-percent></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="B" show-percent></dc-funnel-stage>');
      await elementUpdated(withoutIt);

      // Hiding the 200 leaves a total of 150, which is exactly the total the
      // two-stage chart has - so the shares must agree.
      expect(labels(withHidden)).toEqual(labels(withoutIt));
      // And that share is not the one the hidden element would have produced.
      expect(labels(withHidden).join(' ')).toContain('66.7%');
    });

    it('reaches the all-hidden empty state', async () => {
      const c = await funnel(
        '<dc-funnel-stage value="100" label="A" hidden></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="B" hidden></dc-funnel-stage>');
      await elementUpdated(c);
      expect(emptyText(c)).toBe('All series are hidden');
    });

    it('drops the hidden stage from the legend', async () => {
      const c = await funnel(
        '<dc-legend></dc-legend>' +
        '<dc-funnel-stage value="100" label="Alpha"></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="Beta" hidden></dc-funnel-stage>');
      await elementUpdated(c);
      const text = c.shadowRoot!.textContent ?? '';
      expect(text).toContain('Alpha');
      expect(text).not.toContain('Beta');
    });

    it('leaves an unhidden chart untouched', async () => {
      const c = await funnel(
        '<dc-funnel-stage value="100" label="A"></dc-funnel-stage>' +
        '<dc-funnel-stage value="50" label="B"></dc-funnel-stage>');
      await elementUpdated(c);
      expect(shapes(c)).toBe(2);
      expect(codes(c)).toEqual([]);
    });
  });
});
