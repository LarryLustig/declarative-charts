import { describe, it, expect } from 'vitest';
import { ColorResolver, type ColorHost } from '../../src/color-resolver.js';

/**
 * The auto-generated fallback palette — what a chart draws with when the author
 * sets no `palette` and no per-element `fill`. That is the default path, so it
 * is what almost every first chart and every README image uses.
 *
 * It shipped generating `hsl(hue, 70%, 55%)` by golden-ratio hue rotation, and
 * the bug in that is not aesthetic: **HSL lightness is not perceptual**. At a
 * fixed 55%, blue lands near 0.45 perceptual lightness and yellow-green near
 * 0.85, so some hues came out nearly invisible on a white chart. The second
 * colour the generator ever produced, `hsl(120.98, 70%, 55%)`, sits at 1.76:1
 * against white — and it was the middle bar of the README's hero image.
 *
 * These tests fix the properties that were violated, not the specific colours.
 * A future generator may return anything it likes as long as every colour is
 * legible, the sequence is stable across renders, and no two adjacent series
 * get the same paint.
 */

/** Minimal host: the generator reads none of this, but the constructor wants it. */
function stubHost(): ColorHost {
  return {
    paletteId: undefined,
    highContrast: undefined,
    stroke: '',
    strokeWidth: undefined,
    chartInstanceId: 'test',
    querySelector: () => null,
    log: () => {},
    logError: () => {},
  };
}

/**
 * Parses both `#rrggbb` and `hsl(h, s%, l%)`, deliberately: the old generator
 * emitted HSL and the new one emits hex, and a test that understood only one of
 * them would fail on the format rather than on the property under test.
 */
function toRgb(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const hsl = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(color.trim());
  if (!hsl) throw new Error(`Unrecognised colour format: ${color}`);

  const h = parseFloat(hsl[1]) / 360, s = parseFloat(hsl[2]) / 100, l = parseFloat(hsl[3]) / 100;
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

/** WCAG relative luminance. */
function luminance(color: string): number {
  const [r, g, b] = toRgb(color).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio against the white a chart is drawn on by default. */
function contrastOnWhite(color: string): number {
  return 1.05 / (luminance(color) + 0.05);
}

describe('auto-generated fallback colours', () => {
  const generate = (count: number) => new ColorResolver(stubHost()).generatePaletteColors(count);

  /**
   * The guard the old generator failed. 3:1 is the WCAG non-text contrast
   * minimum — the threshold for a graphical object being distinguishable from
   * its background, which is exactly what a bar is.
   */
  it('every generated colour is legible on a white chart', () => {
    for (let count = 1; count <= 8; count++) {
      for (const color of generate(count)) {
        expect(
          contrastOnWhite(color),
          `${color} (of ${count} generated) is not distinguishable from a white background`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  /**
   * Fixed-lightness generation should give near-identical contrast across hues.
   * Stated as a spread rather than a bound so it catches a regression back to a
   * non-perceptual colour space, where the spread was over 5x.
   */
  it('contrast does not swing wildly between hues', () => {
    const ratios = generate(8).map(contrastOnWhite);
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeLessThan(1.6);
  });

  it('is deterministic across calls, so a re-render does not repaint the chart', () => {
    expect(generate(6)).toEqual(generate(6));
  });

  it('is a stable prefix, so adding a series does not recolour the existing ones', () => {
    expect(generate(7).slice(0, 4)).toEqual(generate(4));
  });

  it('never repeats a colour within one chart', () => {
    const colors = generate(10);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('returns nothing for an empty chart', () => {
    expect(generate(0)).toEqual([]);
  });
});
