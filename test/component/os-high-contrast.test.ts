import { describe, it, expect, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * `isHighContrastActive()` documents three states: the attribute set true, set
 * false, or absent - in which case the OS `prefers-contrast: high` decides.
 *
 * The third was unreachable. The `ColorResolver` host adapter read
 * `chart.highContrast ?? false`, collapsing the absent case to `false`, and the
 * resolver returns early on `=== false`. So the `matchMedia` branch below it
 * was dead code, and a reader who had asked their OS for high contrast got the
 * ordinary palette with nothing to indicate why.
 *
 * Only the explicit attribute worked, despite the documented auto-detect.
 */
const realMatchMedia = window.matchMedia;

/** Pretend the OS is set to high contrast (or not). */
function osPrefersContrast(high: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: high && q.includes('prefers-contrast: high'),
    media: q,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false, onchange: null
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => { window.matchMedia = realMatchMedia; });

describe('OS high contrast', () => {
  const barFills = (c: Chart) =>
    [...c.shadowRoot!.querySelectorAll('rect[data-shape-kind="bar"]')]
      .map(e => e.getAttribute('fill') ?? '');

  const chart = (attrs: Record<string, string> = {}) =>
    fixture<Chart>('dc-chart', { width: '600', height: '400', 'console-log': 'none', ...attrs },
      '<dc-bar value="30" label="A"></dc-bar><dc-bar value="70" label="B"></dc-bar>');

  /** The generated palette is hsl(); the high-contrast ramp is flat hex. */
  const generated = (fills: string[]) => fills.every(f => f.startsWith('hsl('));

  it('is honoured when no attribute is present', async () => {
    osPrefersContrast(true);
    const c = await chart();
    await elementUpdated(c);
    expect(generated(barFills(c)), 'the OS setting never reached colour resolution').toBe(false);
  });

  it('leaves an ordinary chart on the generated palette', async () => {
    osPrefersContrast(false);
    const c = await chart();
    await elementUpdated(c);
    expect(generated(barFills(c))).toBe(true);
  });

  /**
   * The attribute is the explicit answer and must still outrank the OS in both
   * directions - that is what the three-state logic is for.
   */
  it('is overridden by an explicit high-contrast attribute', async () => {
    osPrefersContrast(false);
    const c = await chart({ 'high-contrast': '' });
    await elementUpdated(c);
    expect(generated(barFills(c))).toBe(false);
  });

  it('does not override an explicit false set as a property', async () => {
    osPrefersContrast(true);
    const c = await chart();
    (c as unknown as { highContrast?: boolean }).highContrast = false;
    await elementUpdated(c);
    expect(generated(barFills(c)), 'an explicit false was ignored in favour of the OS').toBe(true);
  });
});
