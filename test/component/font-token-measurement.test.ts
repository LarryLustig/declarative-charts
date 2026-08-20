import { describe, it, expect, beforeAll } from 'vitest';
import { fixture, elementUpdated } from './setup';
import '../../src/index';
import { Chart } from '../../src/chart';

/**
 * The SVG draws in `font-family: var(--dc-font-family, inherit)`, but
 * `TextMeasurer` resolved its default from `getComputedStyle(host).fontFamily`
 * - and a custom property does not change that. So a chart themed with the
 * token was drawn in one font and measured in another, and every label was
 * fitted to the wrong width: axis label intervals, legend boxes, title padding
 * and collision handling all downstream of a measurement of a font that was
 * never on screen.
 *
 * The token is the documented way to theme a chart from outside - the whole
 * point of it inheriting through the shadow boundary - so this was the themed
 * path, not an edge case. `examples/colors.html` uses it.
 *
 * The default mock in `setup.ts` ignores the family, so this installs a
 * family-aware one.
 */
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (id: string): unknown {
    if (id !== '2d') return null;
    let font = '12px sans-serif';
    return {
      set font(v: string) { font = v; },
      get font() { return font; },
      measureText(t: string) {
        const size = parseFloat(font) || 12;
        return { width: t.length * size * 0.6 * (/Wide/i.test(font) ? 4 : 1) };
      }
    };
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('--dc-font-family reaches the measurer', () => {
  const measure = (c: Chart) =>
    (c as unknown as { measureText(t: string, s: number): number }).measureText('Alphabetical', 12);

  const chart = (style: string) =>
    fixture<Chart>('dc-chart',
      { width: '600', height: '400', 'console-log': 'none', ...(style ? { style } : {}) },
      '<dc-bar value="10" label="Alphabetical"></dc-bar>');

  it('measures the token-s font, not the inherited one', async () => {
    const themed = await chart('--dc-font-family: WideFont');
    await elementUpdated(themed);
    const plain = await chart('');
    await elementUpdated(plain);
    expect(measure(themed), 'the token never reached the measurement')
      .toBeGreaterThan(measure(plain));
  });

  /**
   * The token supplies the *default*, so it must agree with what a direct
   * `font-family` produces - both end up on the same `<svg>`.
   */
  it('agrees with a direct font-family', async () => {
    const viaToken = await chart('--dc-font-family: WideFont');
    await elementUpdated(viaToken);
    const viaFont = await chart('font-family: WideFont');
    await elementUpdated(viaFont);
    expect(measure(viaToken)).toBe(measure(viaFont));
  });

  /**
   * `var(--dc-font-family, inherit)` means the token wins when set. Measurement
   * has to make the same choice or the two disagree again.
   */
  it('prefers the token over an inherited font-family', async () => {
    const both = await chart('font-family: Serif; --dc-font-family: WideFont');
    await elementUpdated(both);
    const wideOnly = await chart('font-family: WideFont');
    await elementUpdated(wideOnly);
    expect(measure(both)).toBe(measure(wideOnly));
  });

  it('falls back to the inherited font when the token is unset', async () => {
    const inherited = await chart('font-family: WideFont');
    await elementUpdated(inherited);
    const plain = await chart('');
    await elementUpdated(plain);
    expect(measure(inherited)).toBeGreaterThan(measure(plain));
  });

  it('leaves an unthemed chart measuring exactly as before', async () => {
    const plain = await chart('');
    await elementUpdated(plain);
    expect(measure(plain)).toBe('Alphabetical'.length * 12 * 0.6);
  });
});
