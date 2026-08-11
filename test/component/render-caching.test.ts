import { describe, it, expect, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import { Chart } from '../../src/chart';

/**
 * Guards the per-render memo cache in BaseChart.
 *
 * Several O(n) derivations are reachable from inside per-element render loops -
 * `shouldShowLabel()` leads to `getChartPadding()` -> `getAxisLabelPadding()` ->
 * `getFlattenedBars()` -> `getBarStructure()`. Uncached, that made rendering
 * quadratic: 400 bars produced 2,900,800 calls to extractBarData and 482,406
 * text measurements, and 1,000 bars locked the main thread for 45 seconds.
 *
 * These assertions are about call *counts*, not wall time, so they are stable in
 * CI. `npm run bench` measures the timings. See docs/review.md 3.4.
 */
describe('per-render caching keeps render linear', () => {
  const restores: Array<() => void> = [];

  afterEach(() => {
    while (restores.length) restores.pop()!();
  });

  /** Count calls to a private method for the duration of one test. */
  function countCalls(name: string): { calls: number } {
    const proto = Chart.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    const original = proto[name];
    const counter = { calls: 0 };
    proto[name] = function (this: unknown, ...args: unknown[]) {
      counter.calls++;
      return original.apply(this, args);
    };
    restores.push(() => { proto[name] = original; });
    return counter;
  }

  const chartWith = (n: number) => fixture<Chart>('dc-chart', { width: '900', height: '400' },
    Array.from({ length: n }, (_, i) => `<dc-bar value="${10 + (i % 9) * 5}" label="P${i}"></dc-bar>`).join(''));

  it('derives the bar structure a bounded number of times, independent of bar count', async () => {
    const small = countCalls('computeBarStructure');
    await chartWith(10);
    const forTen = small.calls;

    restores.pop()!();
    const large = countCalls('computeBarStructure');
    await chartWith(400);
    const forFourHundred = large.calls;

    // The count must not scale with n. Before the cache this grew ~6x per
    // doubling; 400 bars produced thousands of derivations.
    expect(forTen).toBeLessThan(10);
    expect(forFourHundred).toBeLessThan(10);
    expect(forFourHundred).toBeLessThanOrEqual(forTen + 2);
  });

  it('measures each distinct label at most once per render', async () => {
    const measure = countCalls('measureText');
    const n = 200;
    await chartWith(n);

    // Labels are P0..P199 plus axis ticks and chrome. Uncached this was
    // n-per-label, i.e. n^2 - 200 bars alone would have exceeded 40,000.
    expect(measure.calls).toBeLessThan(n * 4);
  });

  it('recomputes after the data changes rather than serving a stale cache', async () => {
    const chart = await chartWith(5);
    const heightOf = () =>
      parseFloat(chart.shadowRoot!.querySelector('rect[data-shape-index]')!.getAttribute('height') || '0');
    const before = heightOf();

    const compute = countCalls('computeBarStructure');
    chart.querySelector('dc-bar')!.setAttribute('value', '500');
    await elementUpdated(chart);

    expect(compute.calls).toBeGreaterThan(0);
    expect(heightOf()).toBeGreaterThan(before);
  });

  it('serves the same derivation to event handlers as to the render', async () => {
    const chart = await chartWith(5);
    const compute = countCalls('computeBarStructure');

    // Reading padding after the render must not trigger a fresh derivation:
    // handlers should see exactly the data that produced the current picture.
    const padA = (chart as unknown as { getChartPadding(): object }).getChartPadding();
    const padB = (chart as unknown as { getChartPadding(): object }).getChartPadding();

    expect(padA).toBe(padB);
    expect(compute.calls).toBe(0);
  });
});
