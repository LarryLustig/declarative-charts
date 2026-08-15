import { describe, it, expect } from 'vitest';
import { isMarkerGlyph, MARKER_SHAPES } from '../../src/chart-utils';

/**
 * `shape="★"` is a documented feature, so the legal values are not a closed
 * set and an unrecognised one cannot simply be rejected. This is the split
 * between "a glyph the author meant" and "a name the author misspelled".
 *
 * It used to not exist: every unrecognised value was drawn as text, so
 * `shape="none"` painted the word "none" across the chart. That is the report
 * this came from.
 */
describe('isMarkerGlyph', () => {
  it('accepts a single symbol', () => {
    expect(isMarkerGlyph('★')).toBe(true);
    expect(isMarkerGlyph('▲')).toBe(true);
    expect(isMarkerGlyph('●')).toBe(true);
  });

  it('accepts a single letter, which is a legitimate marker', () => {
    expect(isMarkerGlyph('A')).toBe(true);
    expect(isMarkerGlyph('x')).toBe(true);
  });

  it('accepts a single-code-point emoji', () => {
    expect(isMarkerGlyph('😀')).toBe(true);
  });

  /**
   * The reason this is not just a length check. "❤️" is U+2764 plus a
   * variation selector, and "👍🏽" carries a skin-tone modifier, so counting
   * code points reads both as words.
   */
  it('accepts a multi-code-point emoji', () => {
    expect(Array.from('❤️').length, 'premise: this is not one code point')
      .toBeGreaterThan(1);
    expect(isMarkerGlyph('❤️')).toBe(true);
    expect(isMarkerGlyph('👍🏽')).toBe(true);
  });

  it('rejects a run of letters, which is a misspelled name', () => {
    expect(isMarkerGlyph('sqaure')).toBe(false);
    expect(isMarkerGlyph('blob')).toBe(false);
    expect(isMarkerGlyph('nonw')).toBe(false);
  });

  it('rejects the shape names themselves, which are handled before it', () => {
    for (const name of MARKER_SHAPES) {
      expect(isMarkerGlyph(name), `${name} should not reach the glyph branch`).toBe(false);
    }
  });
});
