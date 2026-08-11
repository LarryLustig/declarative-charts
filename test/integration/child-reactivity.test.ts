import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated, queryShadow, queryShadowAll } from './setup';
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
 * Charts read their data by querying children on every render, but until the
 * MutationObserver in BaseChart nothing told them when that data changed.
 * `slotchange` covers add/remove only, so mutating an existing child updated the
 * child and stopped there - see docs/review.md 3.1.
 *
 * Every assertion here deliberately avoids calling `chart.requestUpdate()`. That
 * call is what the old tests used to paper over the defect, and using it here
 * would make these tests pass against the broken behaviour.
 */
describe('child mutations re-render the chart without requestUpdate()', () => {
  const barHeights = (chart: Chart) =>
    Array.from(queryShadowAll(chart, 'rect[data-shape-index]'))
      .map(r => parseFloat(r.getAttribute('height') || '0'));

  it('reacts to a value change on an existing bar', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
    `);
    const before = barHeights(chart);

    chart.querySelector('dc-bar')!.setAttribute('value', '80');
    await elementUpdated(chart);

    const after = barHeights(chart);
    expect(after[0]).not.toBeCloseTo(before[0], 1);
    expect(after[0]).toBeGreaterThan(before[0]);
  });

  it('reacts to a label change', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="Before"></dc-bar>
    `);
    expect(chart.shadowRoot!.textContent).toContain('Before');

    chart.querySelector('dc-bar')!.setAttribute('label', 'After');
    await elementUpdated(chart);

    expect(chart.shadowRoot!.textContent).toContain('After');
    expect(chart.shadowRoot!.textContent).not.toContain('Before');
  });

  it('reacts to a fill change', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A" fill="#ff0000"></dc-bar>
    `);
    expect(queryShadow(chart, 'rect[data-shape-index]')!.getAttribute('fill')).toBe('#ff0000');

    chart.querySelector('dc-bar')!.setAttribute('fill', '#00ff00');
    await elementUpdated(chart);

    expect(queryShadow(chart, 'rect[data-shape-index]')!.getAttribute('fill')).toBe('#00ff00');
  });

  // `hidden` is a plain HTML attribute read via hasAttribute(), not a reactive
  // property - so a Lit `updated()` hook on the child would not have caught it.
  // CLAUDE.md previously documented the manual requestUpdate() as the workaround.
  it('reacts to the hidden attribute being toggled', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
      <dc-bar value="30" label="C"></dc-bar>
    `);
    expect(barHeights(chart)).toHaveLength(3);

    const b = chart.querySelectorAll('dc-bar')[1];
    b.setAttribute('hidden', '');
    await elementUpdated(chart);
    expect(barHeights(chart)).toHaveLength(2);

    b.removeAttribute('hidden');
    await elementUpdated(chart);
    expect(barHeights(chart)).toHaveLength(3);
  });

  it('reacts to a nested dc-point inside a dc-line', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-line label="Series">
        <dc-point value="10" label="Mon"></dc-point>
        <dc-point value="20" label="Tue"></dc-point>
        <dc-point value="30" label="Wed"></dc-point>
      </dc-line>
    `);
    const before = queryShadow(chart, 'path.line-path')!.getAttribute('d');

    chart.querySelector('dc-point')!.setAttribute('value', '95');
    await elementUpdated(chart);

    expect(queryShadow(chart, 'path.line-path')!.getAttribute('d')).not.toBe(before);
  });

  it('reacts to dc-title text content changing', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-title>Original</dc-title>
      <dc-bar value="10" label="A"></dc-bar>
    `);
    expect(chart.shadowRoot!.textContent).toContain('Original');

    chart.querySelector('dc-title')!.textContent = 'Replaced';
    await elementUpdated(chart);

    expect(chart.shadowRoot!.textContent).toContain('Replaced');
  });

  it('reacts to a new child appended', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
    `);
    expect(barHeights(chart)).toHaveLength(1);

    const bar = document.createElement('dc-bar');
    bar.setAttribute('value', '40');
    bar.setAttribute('label', 'B');
    chart.appendChild(bar);
    await elementUpdated(chart);

    expect(barHeights(chart)).toHaveLength(2);
  });

  it('reacts to a child being removed', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
    `);
    expect(barHeights(chart)).toHaveLength(2);

    chart.querySelector('dc-bar')!.remove();
    await elementUpdated(chart);

    expect(barHeights(chart)).toHaveLength(1);
  });

  it('applies to non-axis charts too', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, `
      <dc-pie-slice value="30" label="A"></dc-pie-slice>
      <dc-pie-slice value="70" label="B"></dc-pie-slice>
    `);
    const before = queryShadow(chart, 'path[data-shape-index]')!.getAttribute('d');

    chart.querySelector('dc-pie-slice')!.setAttribute('value', '90');
    await elementUpdated(chart);

    expect(queryShadow(chart, 'path[data-shape-index]')!.getAttribute('d')).not.toBe(before);
  });

  it('coalesces a burst of mutations into a settled render', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
      <dc-bar value="20" label="B"></dc-bar>
      <dc-bar value="30" label="C"></dc-bar>
    `);

    chart.querySelectorAll('dc-bar').forEach((bar, i) => {
      bar.setAttribute('value', String((i + 1) * 25));
      bar.setAttribute('fill', '#123456');
    });
    await elementUpdated(chart);

    const rects = Array.from(queryShadowAll(chart, 'rect[data-shape-index]'));
    expect(rects).toHaveLength(3);
    expect(rects.every(r => r.getAttribute('fill') === '#123456')).toBe(true);
  });

  it('stops observing once disconnected', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-bar value="10" label="A"></dc-bar>
    `);
    chart.remove();

    // Must not throw or schedule work against a detached chart.
    chart.querySelector('dc-bar')!.setAttribute('value', '99');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(chart.isConnected).toBe(false);
  });
});
