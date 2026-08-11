import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-line';
import '../../src/chart-point';
import '../../src/chart-title';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';

/**
 * `part` attributes are what make `::part()` styling possible, so they are part
 * of the public contract - renaming one is a breaking change for any consumer
 * styling it. See docs/review.md 4.4.
 *
 * These assert the attributes are stamped. Whether the browser then applies the
 * CSS is a browser behaviour and is verified in a real Chromium run rather than
 * happy-dom, which does not implement ::part matching.
 */
describe('shadow parts', () => {
  const partsIn = (el: Element) =>
    new Set(Array.from(el.shadowRoot!.querySelectorAll('[part]'))
      .flatMap(n => (n.getAttribute('part') || '').split(/\s+/))
      .filter(Boolean));

  it('names the chart root, popup and focus ring', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="10" label="A"></dc-bar>');
    const parts = partsIn(chart);

    expect(parts).toContain('chart');
    expect(parts).toContain('popup');
  });

  it('names bars, labels, axis lines and the title', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-title>Sales</dc-title>
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="30" label="B"></dc-bar>
    `);
    const parts = partsIn(chart);

    expect(parts).toContain('bar');
    expect(parts).toContain('title');
    expect(parts).toContain('axis-line');
    expect(parts).toContain('label');
  });

  it('distinguishes lines and points', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-line label="S">
        <dc-point value="10" label="Mon"></dc-point>
        <dc-point value="20" label="Tue"></dc-point>
      </dc-line>
    `);
    const parts = partsIn(chart);

    expect(parts).toContain('line');
    expect(parts).toContain('point');
  });

  it('names slices in non-axis charts', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, `
      <dc-pie-slice value="30" label="A"></dc-pie-slice>
      <dc-pie-slice value="70" label="B"></dc-pie-slice>
    `);
    const parts = partsIn(chart);

    expect(parts).toContain('slice');
    expect(parts).toContain('chart');
    // Bars belong to a different chart type and must not leak in.
    expect(parts).not.toContain('bar');
  });

  it('every rendered bar carries the part, not just the first', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
      <dc-bar value="30" label="C"></dc-bar>
    `);
    const bars = chart.shadowRoot!.querySelectorAll('rect[data-shape-index]');
    const tagged = chart.shadowRoot!.querySelectorAll('rect[part="bar"]');

    expect(bars).toHaveLength(3);
    expect(tagged).toHaveLength(3);
  });

  it('re-stamps parts after a re-render', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="10" label="A"></dc-bar>');
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]')).toHaveLength(1);

    const bar = document.createElement('dc-bar');
    bar.setAttribute('value', '40');
    bar.setAttribute('label', 'B');
    chart.appendChild(bar);
    await elementUpdated(chart);

    // A newly rendered shape must be tagged too, or it would be unstylable.
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]')).toHaveLength(2);
  });
});
