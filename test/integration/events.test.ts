import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated, queryShadow, queryShadowAll } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-line';
import '../../src/chart-point';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import type { ChartInteractionDetail, ChartRenderDetail } from '../../src/base-chart';
import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';

/**
 * Interaction events. Before these, the only ways to respond to a click were
 * `href` navigation and a declarative popup — "click a bar, filter the table
 * below" was impossible without reaching into the shadow DOM for a selector the
 * library never promised. See docs/review.md 4.3.
 */
describe('interaction events', () => {
  const barChart = () => fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
    <dc-bar value="10" label="A"></dc-bar>
    <dc-bar value="30" label="B"></dc-bar>
  `);

  const fire = (el: Element, type: string) =>
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: 5, clientY: 5 }));

  it('emits dc-click with the datum, from the chart', async () => {
    const chart = await barChart();
    const seen: ChartInteractionDetail[] = [];
    chart.addEventListener('dc-click', e => seen.push((e as CustomEvent<ChartInteractionDetail>).detail));

    fire(queryShadowAll(chart, 'rect[data-shape-index]')[1], 'click');

    expect(seen).toHaveLength(1);
    expect(seen[0].label).toBe('B');
    expect(seen[0].value).toBe(30);
    expect(seen[0].index).toBe(1);
    expect(seen[0].percent).toBeCloseTo(30 / 40, 5);
    expect(seen[0].chart).toBe(chart);
  });

  it('targets the authored element, so listeners can attach to <dc-bar> directly', async () => {
    const chart = await barChart();
    const bar = chart.querySelectorAll('dc-bar')[1];
    const seen: Event[] = [];
    bar.addEventListener('dc-click', e => seen.push(e));

    fire(queryShadowAll(chart, 'rect[data-shape-index]')[1], 'click');

    expect(seen).toHaveLength(1);
    expect(seen[0].target).toBe(bar);
  });

  it('bubbles and is composed, so document-level delegation works', async () => {
    const chart = await barChart();
    const seen: ChartInteractionDetail[] = [];
    const onDoc = (e: Event) => seen.push((e as CustomEvent<ChartInteractionDetail>).detail);
    document.addEventListener('dc-click', onDoc);

    fire(queryShadow(chart, 'rect[data-shape-index]')!, 'click');
    document.removeEventListener('dc-click', onDoc);

    expect(seen).toHaveLength(1);
    expect(seen[0].label).toBe('A');
  });

  it('emits dc-mouseenter and dc-mouseleave', async () => {
    const chart = await barChart();
    const order: string[] = [];
    chart.addEventListener('dc-mouseenter', e =>
      order.push('enter:' + (e as CustomEvent<ChartInteractionDetail>).detail.label));
    chart.addEventListener('dc-mouseleave', e =>
      order.push('leave:' + (e as CustomEvent<ChartInteractionDetail>).detail.label));

    const rect = queryShadow(chart, 'rect[data-shape-index]')!;
    fire(rect, 'mouseenter');
    fire(rect, 'mouseleave');

    expect(order).toEqual(['enter:A', 'leave:A']);
  });

  it('dc-click is cancelable and preventDefault suppresses the popup', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"><dc-popup trigger="click">Details</dc-popup></dc-bar>
    `);
    chart.addEventListener('dc-click', e => e.preventDefault());

    fire(queryShadow(chart, 'rect[data-shape-index]')!, 'click');
    await elementUpdated(chart);

    expect(queryShadow(chart, '.popup.visible')).toBeNull();
  });

  it('hover events are not cancelable', async () => {
    const chart = await barChart();
    let cancelable: boolean | null = null;
    chart.addEventListener('dc-mouseenter', e => { cancelable = e.cancelable; });

    fire(queryShadow(chart, 'rect[data-shape-index]')!, 'mouseenter');

    expect(cancelable).toBe(false);
  });

  it('carries series context for points inside a line', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-line label="Series A">
        <dc-point value="10" label="Mon"></dc-point>
        <dc-point value="20" label="Tue"></dc-point>
      </dc-line>
    `);
    const seen: ChartInteractionDetail[] = [];
    chart.addEventListener('dc-click', e => seen.push((e as CustomEvent<ChartInteractionDetail>).detail));

    const points = queryShadowAll(chart, 'circle[data-shape-index], circle');
    fire(points[points.length - 1], 'click');

    expect(seen.length).toBeGreaterThan(0);
    const detail = seen[seen.length - 1];
    expect(detail.seriesLabel).toBe('Series A');
    expect(detail.seriesIndex).toBe(0);
  });

  it('works for non-axis charts', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, `
      <dc-pie-slice value="25" label="A"></dc-pie-slice>
      <dc-pie-slice value="75" label="B"></dc-pie-slice>
    `);
    const seen: ChartInteractionDetail[] = [];
    chart.addEventListener('dc-click', e => seen.push((e as CustomEvent<ChartInteractionDetail>).detail));

    fire(queryShadow(chart, 'path[data-shape-index]')!, 'click');

    expect(seen).toHaveLength(1);
    expect(seen[0].label).toBe('A');
    expect(seen[0].percent).toBeCloseTo(0.25, 2);
  });

  it('reports percent as a decimal, matching the library convention', async () => {
    const chart = await barChart();
    const seen: ChartInteractionDetail[] = [];
    chart.addEventListener('dc-click', e => seen.push((e as CustomEvent<ChartInteractionDetail>).detail));

    fire(queryShadow(chart, 'rect[data-shape-index]')!, 'click');

    // 10 of 40 is 0.25, not 25.
    expect(seen[0].percent).toBeCloseTo(0.25, 5);
  });

  it('emits dc-render after rendering, and again after a data change', async () => {
    const renders: ChartRenderDetail[] = [];
    const onRender = (e: Event) => renders.push((e as CustomEvent<ChartRenderDetail>).detail);
    document.addEventListener('dc-render', onRender);

    const chart = await barChart();
    const afterMount = renders.length;

    chart.querySelector('dc-bar')!.setAttribute('value', '99');
    await elementUpdated(chart);
    document.removeEventListener('dc-render', onRender);

    expect(afterMount).toBeGreaterThan(0);
    expect(renders.length).toBeGreaterThan(afterMount);
    expect(renders[renders.length - 1].count).toBe(2);
    expect(renders[renders.length - 1].chart).toBe(chart);
  });
});
