import { describe, it, expect } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-area';
import '../../src/chart-point';
import '../../src/chart-title';
import '../../src/chart-empty';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';

/**
 * A chart with no data used to render a blank bordered box: DC001 was logged,
 * but diagnostics are off by default so the log went nowhere, leaving the reader
 * to guess whether the data was empty, still loading, or broken.
 *
 * This matters more here than for a config-driven library. A chart whose markup
 * arrives from the server necessarily has a frame where the element exists and
 * its children do not - that is the normal first frame, not an error.
 * See docs/review.md 4.2.
 */
describe('empty state', () => {
  const emptyText = (chart: Chart | PieChart) =>
    chart.shadowRoot!.querySelector('[part="empty"]')?.textContent?.trim() ?? null;

  it('says so instead of drawing a blank frame', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(emptyText(chart)).toBe('No data');
  });

  it('uses the message from <dc-empty>', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-empty>Nothing for Q3</dc-empty>');
    expect(emptyText(chart)).toBe('Nothing for Q3');
  });

  it('distinguishes hidden series from absent data', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="5" label="A" hidden></dc-bar>');
    expect(emptyText(chart)).toBe('All series are hidden');
  });

  it('keeps the title, which still describes the chart', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-title>Q3 Sales</dc-title>');
    expect(chart.shadowRoot!.textContent).toContain('Q3 Sales');
    expect(emptyText(chart)).toBe('No data');
  });

  it('draws no plot when empty', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(chart.shadowRoot!.querySelectorAll('[data-shape-index]')).toHaveLength(0);
  });

  it('applies to non-axis charts', async () => {
    const chart = await fixture<PieChart>('dc-pie-chart', { width: '600', height: '400' }, '');
    expect(emptyText(chart)).toBe('No data');
  });

  it('does not report an area-only chart as empty', async () => {
    // Areas are not focusable, so a focusable-count check would call this empty.
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, `
      <dc-area label="A">
        <dc-point value="3" label="x"></dc-point>
        <dc-point value="6" label="y"></dc-point>
      </dc-area>`);
    expect(emptyText(chart)).toBeNull();
  });

  it('clears once data arrives', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(emptyText(chart)).toBe('No data');

    const bar = document.createElement('dc-bar');
    bar.setAttribute('value', '10');
    bar.setAttribute('label', 'A');
    chart.appendChild(bar);
    await elementUpdated(chart);

    expect(emptyText(chart)).toBeNull();
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]').length).toBeGreaterThan(0);
  });

  it('returns when the last datum is removed', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' },
      '<dc-bar value="10" label="A"></dc-bar>');
    expect(emptyText(chart)).toBeNull();

    chart.querySelector('dc-bar')!.remove();
    await elementUpdated(chart);

    expect(emptyText(chart)).toBe('No data');
  });

  it('announces the state rather than describing an absent chart', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(chart.shadowRoot!.querySelector('svg')!.getAttribute('aria-label')).toContain('no data');
  });

  it('is not keyboard focusable when there is nothing to navigate', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400' }, '');
    expect(chart.shadowRoot!.querySelector('svg')!.getAttribute('tabindex')).toBe('-1');
  });
});

describe('loading state', () => {
  const skeleton = (chart: Chart) => chart.shadowRoot!.querySelector('[part="skeleton"]');

  it('shows a skeleton', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' }, '');
    expect(skeleton(chart)!.querySelectorAll('rect')).toHaveLength(5);
  });

  it('takes precedence over data, so a refresh does not flash stale values', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' },
      '<dc-bar value="10" label="A"></dc-bar>');
    expect(skeleton(chart)).not.toBeNull();
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]')).toHaveLength(0);
  });

  it('takes precedence over the empty message', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' },
      '<dc-empty>Nothing here</dc-empty>');
    expect(skeleton(chart)).not.toBeNull();
    expect(chart.shadowRoot!.querySelector('[part="empty"]')).toBeNull();
  });

  it('resolves to the plot when loading finishes', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' },
      '<dc-bar value="10" label="A"></dc-bar>');
    expect(skeleton(chart)).not.toBeNull();

    chart.loading = false;
    await elementUpdated(chart);

    expect(skeleton(chart)).toBeNull();
    expect(chart.shadowRoot!.querySelectorAll('rect[part="bar"]').length).toBeGreaterThan(0);
  });

  it('announces itself as loading', async () => {
    const chart = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' }, '');
    expect(chart.shadowRoot!.querySelector('svg')!.getAttribute('aria-label')).toContain('loading');
  });

  it('uses a fixed skeleton so snapshots stay stable', async () => {
    const a = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' }, '');
    const b = await fixture<Chart>('dc-chart', { width: '600', height: '400', loading: '' }, '');
    const heights = (c: Chart) => Array.from(c.shadowRoot!.querySelectorAll('[part="skeleton"] rect'))
      .map(r => r.getAttribute('height'));

    expect(heights(a)).toEqual(heights(b));
  });
});
