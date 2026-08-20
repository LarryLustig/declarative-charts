import { describe, it, expect, vi } from 'vitest';
import { fixture } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * Bar width has a floor. Once the data no longer fits at that floor the layout
 * keeps allocating a unit per bar, and the surplus is drawn past the right edge
 * of the plot — correctly, and invisibly.
 *
 * `DC107` already reported that gutters were compressed, but it fires from a
 * hundred bars upward, where nothing is wrong. A reader who learns to ignore it
 * there has no way to notice the count at which most of their data stops being
 * on screen. `DC116` says that, and only that.
 */

const barsMarkup = (n: number) =>
  Array.from({ length: n }, (_, i) => `<dc-bar value="50" label="${i}"></dc-bar>`).join('');

const chart = (n: number, attrs: Record<string, string> = {}) =>
  fixture<Chart>('dc-chart', { width: '900', height: '400', 'show-value': 'false', ...attrs }, barsMarkup(n));

/**
 * The same overflow on a narrow chart: a 300-unit plot runs out at about 240
 * bars, so the condition is reached with a fraction of the elements. Rendering
 * five thousand of them in happy-dom took longer than the default timeout and
 * measured the runner rather than the library.
 */
const narrow = (n: number) =>
  fixture<Chart>('dc-chart', { width: '300', height: '200', 'show-value': 'false' }, barsMarkup(n));

/**
 * Every case here renders hundreds of bars, and three of them sit within a
 * second or two of the 5s default when the file runs alone. In a full run they
 * compete for the machine and tip over intermittently - observed failing 4, 3
 * and 1 of the same assertions across consecutive runs, always as timeouts and
 * never as wrong answers.
 *
 * The fixtures were already narrowed once for this reason, so that this suite
 * measures the library rather than the runner. Raising the ceiling finishes
 * that job: the alternative is a flaky gate on `prepublishOnly`, which is the
 * one place a spurious red blocks a release.
 */
vi.setConfig({ testTimeout: 30_000 });

const overflow = (c: Chart) => c.getLogEntries().find(e => e.path === 'bars.overflow');

/** Bars whose left edge is past the plot: drawn, and impossible to see. */
const offPlot = (c: Chart) => {
  const right = c.width - c['getChartPadding']().right;
  return [...c.shadowRoot!.querySelectorAll('rect[data-shape-index]')]
    .filter(r => +r.getAttribute('x')! > right).length;
};

describe('bars that do not fit the plot', () => {
  it('says nothing while they all fit', async () => {
    expect(overflow(await chart(100))).toBeUndefined();
    expect(overflow(await chart(800))).toBeUndefined();
  });

  it('reports as soon as one is pushed off', async () => {
    const c = await chart(820);
    expect(overflow(c)).toBeDefined();
    expect(offPlot(c)).toBeGreaterThan(0);
  });

  it('counts them exactly, not approximately', async () => {
    // The message states a number, so it has to be the number. A ratio estimate
    // was off by three or four, which is immaterial to the decision and wrong
    // in the text.
    for (const n of [250, 400, 600]) {
      const c = await narrow(n);
      const claimed = Number(overflow(c)!.message.match(/^(\d+) of/)![1]);
      expect(claimed, `${n} bars`).toBe(offPlot(c));
    }
  });

  it('names both the count and the total, so the scale is legible', async () => {
    const msg = overflow(await narrow(400))!.message;
    expect(msg).toMatch(/of 400 bars/);
    expect(msg).toContain('cannot be seen');
  });

  it('says what to do about it', async () => {
    const msg = overflow(await narrow(400))!.message;
    expect(msg).toMatch(/Widen the chart|fewer bars/);
  });

  it('is a separate diagnostic from the gutter compression', async () => {
    // DC107 fires at 100 bars, where nothing is wrong; DC116 must not.
    const fine = await chart(100);
    expect(fine.getLogEntries().some(e => e.path === 'bars.layout')).toBe(true);
    expect(overflow(fine)).toBeUndefined();
  });

  it('goes away when the chart is wide enough for the data', async () => {
    // The remedy the message suggests has to actually work.
    const tight = await narrow(400);
    const wide = await fixture<Chart>('dc-chart',
      { width: '2000', height: '200', 'show-value': 'false' }, barsMarkup(400));
    expect(overflow(tight)).toBeDefined();
    expect(overflow(wide)).toBeUndefined();
    expect(offPlot(wide)).toBe(0);
  });

  it('does not fire for lines, which have no width floor', async () => {
    const c = await fixture<Chart>('dc-chart', { width: '300', height: '200', 'show-value': 'false' },
      `<dc-line label="L">${Array.from({ length: 600 }, (_, i) =>
        `<dc-point value="50" label="${i}"></dc-point>`).join('')}</dc-line>`);
    expect(overflow(c)).toBeUndefined();
  });
});
