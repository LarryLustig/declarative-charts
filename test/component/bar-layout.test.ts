import { describe, it, expect } from 'vitest';
import { fixture } from './setup';
import '../../src/chart';
import '../../src/chart-bar';
import { Chart } from '../../src/chart';

/**
 * Bar width shrinks as bar count rises, because each unit carries a fixed gutter.
 * Before the fix, past ~84 bars on a 900-unit chart the computed width crossed zero;
 * a negative `width` is invalid SVG, so the browser discarded every <rect> and the
 * chart rendered nothing at all, with no warning. See REVIEW.md §3.5.
 */
describe('bar layout: width never degenerates', () => {
  const barsMarkup = (n: number) =>
    Array.from({ length: n }, (_, i) => `<dc-bar value="${50 + (i % 7) * 5}" label="P${i}"></dc-bar>`).join('');

  const widthsFor = async (n: number, attrs: Record<string, string> = {}) => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '900', height: '400', 'show-value': 'false', ...attrs },
      barsMarkup(n)
    );
    const rects = Array.from(
      chart.shadowRoot!.querySelectorAll('rect[data-shape-index]')
    ) as SVGRectElement[];
    return rects.map(r => parseFloat(r.getAttribute('width') || 'NaN'));
  };

  // 85 is the first count that produced a negative width on a 900-unit chart.
  for (const n of [10, 50, 80, 85, 100, 200]) {
    it(`renders ${n} bars with positive, finite widths`, async () => {
      const widths = await widthsFor(n);

      expect(widths).toHaveLength(n);
      expect(widths.every(w => Number.isFinite(w))).toBe(true);
      expect(Math.min(...widths)).toBeGreaterThan(0);
    });
  }

  it('holds for horizontal orientation too', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '900', height: '400', 'show-value': 'false', orientation: 'horizontal' },
      barsMarkup(150)
    );
    const heights = Array.from(chart.shadowRoot!.querySelectorAll('rect[data-shape-index]'))
      .map(r => parseFloat(r.getAttribute('height') || 'NaN'));

    expect(heights).toHaveLength(150);
    expect(heights.every(h => Number.isFinite(h))).toBe(true);
    expect(Math.min(...heights)).toBeGreaterThan(0);
  });

  it('compresses gutters rather than shrinking bars to nothing', async () => {
    const roomy = await widthsFor(20);
    const crowded = await widthsFor(200);

    // Bars still get narrower as count rises...
    expect(Math.min(...crowded)).toBeLessThan(Math.min(...roomy));
    // ...but never collapse: the gutter budget absorbs the pressure first.
    expect(Math.min(...crowded)).toBeGreaterThanOrEqual(1);
  });

  it('keeps total laid-out width within the chart', async () => {
    const widths = await widthsFor(200);
    const total = widths.reduce((a, b) => a + b, 0);

    // 200 bars at the 1-unit floor is 200 units — must still fit a 900-unit chart.
    expect(total).toBeLessThanOrEqual(900);
  });
});
