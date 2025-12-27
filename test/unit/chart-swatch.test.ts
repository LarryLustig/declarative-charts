import { describe, it, expect, beforeEach } from 'vitest';
import { ChartSwatch, STANDARD_SHAPES, type StandardShape } from '../../src/chart-swatch';

/**
 * Tests for ChartSwatch element and related constants.
 *
 * Focuses on:
 * - STANDARD_SHAPES constant
 * - ChartSwatch property defaults
 *
 * Note: ChartSwatch.renderShape() static method returns SVG templates
 * which require DOM environment to test (Lit render function needs document).
 */

// ============================================================================
// STANDARD_SHAPES constant
// ============================================================================

describe('STANDARD_SHAPES', () => {
  it('is an array', () => {
    expect(Array.isArray(STANDARD_SHAPES)).toBe(true);
  });

  it('contains expected shape names', () => {
    const expected = ['circle', 'square', 'rect', 'line', 'triangle', 'diamond', 'star', 'cross', 'plus'];
    expect([...STANDARD_SHAPES]).toEqual(expected);
  });

  it('contains 9 shapes', () => {
    expect(STANDARD_SHAPES.length).toBe(9);
  });

  it('values can be used as StandardShape type', () => {
    const shapes: StandardShape[] = [...STANDARD_SHAPES];
    expect(shapes).toHaveLength(9);
  });
});

// ============================================================================
// ChartSwatch properties
// ============================================================================

describe('ChartSwatch properties', () => {
  let swatch: ChartSwatch;

  beforeEach(() => {
    swatch = new ChartSwatch();
  });

  describe('default values', () => {
    it('palette defaults to undefined', () => {
      expect(swatch.palette).toBeUndefined();
    });

    it('label defaults to undefined', () => {
      expect(swatch.label).toBeUndefined();
    });

    it('value defaults to undefined', () => {
      expect(swatch.value).toBeUndefined();
    });

    it('shape defaults to "circle"', () => {
      expect(swatch.shape).toBe('circle');
    });

    it('fill defaults to undefined', () => {
      expect(swatch.fill).toBeUndefined();
    });

    it('stroke defaults to undefined', () => {
      expect(swatch.stroke).toBeUndefined();
    });

    it('size defaults to 16', () => {
      expect(swatch.size).toBe(16);
    });
  });

  describe('property assignment', () => {
    it('can set palette', () => {
      swatch.palette = 'my-palette';
      expect(swatch.palette).toBe('my-palette');
    });

    it('can set label', () => {
      swatch.label = 'Revenue';
      expect(swatch.label).toBe('Revenue');
    });

    it('can set value', () => {
      swatch.value = 100;
      expect(swatch.value).toBe(100);
    });

    it('can set shape to standard shapes', () => {
      STANDARD_SHAPES.forEach(shape => {
        swatch.shape = shape;
        expect(swatch.shape).toBe(shape);
      });
    });

    it('can set shape to unicode character', () => {
      swatch.shape = '★';
      expect(swatch.shape).toBe('★');
    });

    it('can set fill', () => {
      swatch.fill = '#ff0000';
      expect(swatch.fill).toBe('#ff0000');
    });

    it('can set stroke', () => {
      swatch.stroke = '#000000';
      expect(swatch.stroke).toBe('#000000');
    });

    it('can set size', () => {
      swatch.size = 24;
      expect(swatch.size).toBe(24);
    });
  });
});

// ============================================================================
// NOTE: The following require DOM environment for testing:
// - ChartSwatch.renderShape() - returns SVG templates (Lit render needs DOM)
// - resolveColors() - looks up palette by ID
// - isStandardShape() - simple but requires instance
// - render() - full component rendering
// ============================================================================
