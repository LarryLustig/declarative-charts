import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-line';
import '../../src/chart-scatter';
import '../../src/chart-point';
import { Chart } from '../../src/chart';

/**
 * API.md ("When JavaScript Does Not Run") documents putting a fallback table
 * inside the chart, where it is the only thing rendered until the element
 * upgrades and the author's `dc-chart:defined` rule hides it.
 *
 * That pattern rests on the chart tolerating a foreign light-DOM child, and
 * nobody ever decided it should. `chart.ts` gathers data with tag-targeted
 * selectors - `querySelectorAll('dc-bar')`, `'dc-line'`, and so on - so a
 * `<table>` is ignored by accident rather than by intent, and `errors.ts` has
 * no unknown-child code to raise. These tests turn the accident into a
 * contract: an unknown-child diagnostic added later, or a child walk rewritten
 * to count elements positionally, fails here rather than silently falsifying
 * the documentation.
 *
 * There is no guard to mutation-test - the tolerance is emergent, not
 * defended - so these are regression tripwires, and that is the whole of their
 * value.
 */
describe('a foreign light-DOM child', () => {
  const FALLBACK = '<table class="dc-fallback"><tr><td>Q1</td><td>95</td></tr></table>';

  const chartWithFallback = (extra: string) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400' }, FALLBACK + extra);

  const warnings = (chart: Chart) =>
    (chart as unknown as { logEntries: Array<{ level: string; code?: string; message: string }> })
      .logEntries.filter(e => e.level === 'warning' || e.level === 'error');

  it('is not counted as data', async () => {
    const chart = await chartWithFallback(
      '<dc-bar value="95" label="Q1"></dc-bar><dc-bar value="80" label="Q2"></dc-bar>'
    );
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelectorAll('[data-shape-index]')).toHaveLength(2);
  });

  it('does not shift the indices of the data that follows it', async () => {
    const chart = await chartWithFallback(
      '<dc-bar value="95" label="Q1"></dc-bar><dc-bar value="80" label="Q2"></dc-bar>'
    );
    await elementUpdated(chart);
    const indices = [...chart.shadowRoot!.querySelectorAll('[data-shape-index]')]
      .map(el => el.getAttribute('data-shape-index'));
    expect(indices).toEqual(['0', '1']);
  });

  it('raises no diagnostic of its own', async () => {
    const chart = await chartWithFallback('<dc-bar value="95" label="Q1"></dc-bar>');
    await elementUpdated(chart);
    expect(warnings(chart)).toEqual([]);
  });

  it('is left in the light DOM, not adopted or removed', async () => {
    const chart = await chartWithFallback('<dc-bar value="95" label="Q1"></dc-bar>');
    await elementUpdated(chart);
    expect(chart.querySelector('table.dc-fallback')).not.toBeNull();
  });

  it('cannot stand in for data - a chart holding only a fallback is still empty', async () => {
    const chart = await chartWithFallback('');
    await elementUpdated(chart);
    expect(chart.shadowRoot!.querySelector('[part="empty"]')?.textContent?.trim()).toBe('No data');
  });

  it('reports DC001 when it is the only child, so the blank chart is explained', async () => {
    const chart = await chartWithFallback('');
    await elementUpdated(chart);
    expect(warnings(chart).map(w => w.code)).toContain('DC001');
  });

  /**
   * A series nested inside the fallback is not data.
   *
   * This used to depend on which series you nested. Bars came from
   * `this.children` and ignored a nested `<dc-bar>`; lines, areas, bubbles and
   * scatter were gathered with a descendant `querySelectorAll` and drew a
   * nested one as real data - twice over, if the same series also appeared
   * outside the fallback. Every chart-level walk now reads direct children, so
   * the answer is the same whichever element it is.
   */
  it('is not searched for data elements, whichever series is nested in it', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '600', height: '400' },
      '<table class="dc-fallback"><tr><td>' +
        '<dc-line label="Nested"><dc-point value="10"></dc-point>' +
        '<dc-point value="20"></dc-point></dc-line>' +
        '</td></tr></table>' +
        '<dc-line label="Real"><dc-point value="30"></dc-point>' +
        '<dc-point value="40"></dc-point></dc-line>'
    );
    await elementUpdated(chart);
    const drawn = chart.shadowRoot!.querySelectorAll(
      'path[data-shape-index], polyline[data-shape-index]'
    );
    expect(drawn, 'the nested series was drawn as if it were data').toHaveLength(1);
  });

  /**
   * The nested series must not reach the axis domain either. `getXRange()` once
   * gathered `<dc-point>` with a chart-wide descendant search, so a point that
   * was never drawn could still stretch the axis - a fallback table quietly
   * changing the scale of the chart above it.
   */
  it('cannot widen the numeric x axis from inside the fallback', async () => {
    const withNested = await fixture<Chart>(
      'dc-chart',
      { width: '600', height: '400' },
      '<table class="dc-fallback"><tr><td>' +
        '<dc-scatter label="Nested"><dc-point x="9999" value="5"></dc-point></dc-scatter>' +
        '</td></tr></table>' +
        '<dc-scatter label="Real"><dc-point x="1" value="10"></dc-point>' +
        '<dc-point x="2" value="20"></dc-point></dc-scatter>'
    );
    await elementUpdated(withNested);

    const clean = await fixture<Chart>(
      'dc-chart',
      { width: '600', height: '400' },
      '<dc-scatter label="Real"><dc-point x="1" value="10"></dc-point>' +
        '<dc-point x="2" value="20"></dc-point></dc-scatter>'
    );
    await elementUpdated(clean);

    const ticks = (c: Chart) =>
      [...c.shadowRoot!.querySelectorAll('text')].map(t => t.textContent?.trim()).join('|');
    expect(ticks(withNested), 'the buried point moved the axis').toBe(ticks(clean));
  });

  /**
   * The reason the documented pattern needs a stylesheet rule at all.
   * `BaseChart.render()` ends with an unconditional catch-all `<slot>`, so
   * every light-DOM child is assigned and *rendered* - the data elements are
   * invisible only because their own `render()` returns null. A `<table>` has
   * no such courtesy and paints below the SVG until the author hides it.
   *
   * If this ever fails because the slot was removed or hidden, the fallback
   * hides itself and the `dc-chart:defined` rule in API.md and
   * examples/empty-loading.html becomes unnecessary. Update them.
   */
  it('is assigned to the default slot, which is why hiding it is the author-s job', async () => {
    const chart = await chartWithFallback('<dc-bar value="95" label="Q1"></dc-bar>');
    await elementUpdated(chart);
    const slot = chart.shadowRoot!.querySelector('slot') as HTMLSlotElement;
    expect(slot, 'BaseChart no longer renders a catch-all slot').not.toBeNull();
    const assigned = slot.assignedNodes({ flatten: true })
      .filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE)
      .map(n => n.tagName);
    expect(assigned).toContain('TABLE');
  });
});
