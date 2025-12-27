import { describe, it, expect, beforeEach } from 'vitest';
import { ChartFill } from '../../src/chart-fill';
import { PATTERN_TYPES } from '../../src/patterns';

/**
 * Tests for ChartFill matching methods.
 *
 * ChartFill is a Lit element used in palettes for color/pattern matching.
 * These tests focus on the pure logic methods: hasPattern, matchesValue, matchesLabel.
 */

// ============================================================================
// hasPattern
// ============================================================================

describe('hasPattern', () => {
  let fill: ChartFill;

  beforeEach(() => {
    fill = new ChartFill();
  });

  it('returns false when pattern is undefined', () => {
    expect(fill.hasPattern()).toBe(false);
  });

  it('returns true for all valid pattern types', () => {
    PATTERN_TYPES.forEach(patternType => {
      fill.pattern = patternType;
      expect(fill.hasPattern()).toBe(true);
    });
  });

  it('returns false for invalid pattern strings', () => {
    fill.pattern = 'invalid' as any;
    expect(fill.hasPattern()).toBe(false);
  });

  it('returns false for empty string', () => {
    fill.pattern = '' as any;
    expect(fill.hasPattern()).toBe(false);
  });

  it('returns false for similar but incorrect pattern names', () => {
    const invalidPatterns = [
      'diagonal',
      'diagonallines',
      'diagonal_lines',
      'DIAGONAL-LINES',
      'stripes',
      'polka-dots',
    ];

    invalidPatterns.forEach(invalid => {
      fill.pattern = invalid as any;
      expect(fill.hasPattern()).toBe(false);
    });
  });
});

// ============================================================================
// matchesValue
// ============================================================================

describe('matchesValue', () => {
  let fill: ChartFill;

  beforeEach(() => {
    fill = new ChartFill();
  });

  describe('no constraints', () => {
    it('returns false when no value constraints are set', () => {
      expect(fill.matchesValue(50)).toBe(false);
      expect(fill.matchesValue(0)).toBe(false);
      expect(fill.matchesValue(-100)).toBe(false);
    });

    it('returns false even with label set but no value constraints', () => {
      fill.label = 'Test';
      expect(fill.matchesValue(50)).toBe(false);
    });
  });

  describe('exact value matching', () => {
    it('matches when value equals exact value', () => {
      fill.value = 50;
      expect(fill.matchesValue(50)).toBe(true);
    });

    it('does not match values below exact value', () => {
      fill.value = 50;
      expect(fill.matchesValue(49)).toBe(false);
      expect(fill.matchesValue(49.99)).toBe(false);
    });

    it('does not match values above exact value', () => {
      fill.value = 50;
      expect(fill.matchesValue(51)).toBe(false);
      expect(fill.matchesValue(50.01)).toBe(false);
    });

    it('handles zero as exact value', () => {
      fill.value = 0;
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(0.001)).toBe(false);
      expect(fill.matchesValue(-0.001)).toBe(false);
    });

    it('handles negative exact values', () => {
      fill.value = -25;
      expect(fill.matchesValue(-25)).toBe(true);
      expect(fill.matchesValue(-24)).toBe(false);
      expect(fill.matchesValue(-26)).toBe(false);
    });

    it('exact value takes precedence over min/max', () => {
      fill.value = 50;
      fill.minValue = 0;
      fill.maxValue = 100;
      // Should use value (50) as both min and max, ignoring minValue/maxValue
      expect(fill.matchesValue(50)).toBe(true);
      expect(fill.matchesValue(75)).toBe(false);
      expect(fill.matchesValue(25)).toBe(false);
    });
  });

  describe('min-value only', () => {
    it('matches values at or above minValue', () => {
      fill.minValue = 30;
      expect(fill.matchesValue(30)).toBe(true);
      expect(fill.matchesValue(31)).toBe(true);
      expect(fill.matchesValue(100)).toBe(true);
      expect(fill.matchesValue(1000000)).toBe(true);
    });

    it('does not match values below minValue', () => {
      fill.minValue = 30;
      expect(fill.matchesValue(29)).toBe(false);
      expect(fill.matchesValue(29.99)).toBe(false);
      expect(fill.matchesValue(0)).toBe(false);
      expect(fill.matchesValue(-100)).toBe(false);
    });

    it('handles zero as minValue', () => {
      fill.minValue = 0;
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(1)).toBe(true);
      expect(fill.matchesValue(-1)).toBe(false);
    });

    it('handles negative minValue', () => {
      fill.minValue = -50;
      expect(fill.matchesValue(-50)).toBe(true);
      expect(fill.matchesValue(-49)).toBe(true);
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(-51)).toBe(false);
    });
  });

  describe('max-value only', () => {
    it('matches values at or below maxValue', () => {
      fill.maxValue = 70;
      expect(fill.matchesValue(70)).toBe(true);
      expect(fill.matchesValue(69)).toBe(true);
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(-1000)).toBe(true);
    });

    it('does not match values above maxValue', () => {
      fill.maxValue = 70;
      expect(fill.matchesValue(71)).toBe(false);
      expect(fill.matchesValue(70.01)).toBe(false);
      expect(fill.matchesValue(100)).toBe(false);
    });

    it('handles zero as maxValue', () => {
      fill.maxValue = 0;
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(-1)).toBe(true);
      expect(fill.matchesValue(1)).toBe(false);
    });

    it('handles negative maxValue', () => {
      fill.maxValue = -20;
      expect(fill.matchesValue(-20)).toBe(true);
      expect(fill.matchesValue(-21)).toBe(true);
      expect(fill.matchesValue(-100)).toBe(true);
      expect(fill.matchesValue(-19)).toBe(false);
      expect(fill.matchesValue(0)).toBe(false);
    });
  });

  describe('min-value and max-value range', () => {
    it('matches values within range (inclusive)', () => {
      fill.minValue = 30;
      fill.maxValue = 70;
      expect(fill.matchesValue(30)).toBe(true);
      expect(fill.matchesValue(50)).toBe(true);
      expect(fill.matchesValue(70)).toBe(true);
    });

    it('does not match values outside range', () => {
      fill.minValue = 30;
      fill.maxValue = 70;
      expect(fill.matchesValue(29)).toBe(false);
      expect(fill.matchesValue(71)).toBe(false);
      expect(fill.matchesValue(0)).toBe(false);
      expect(fill.matchesValue(100)).toBe(false);
    });

    it('handles single-value range (min equals max)', () => {
      fill.minValue = 50;
      fill.maxValue = 50;
      expect(fill.matchesValue(50)).toBe(true);
      expect(fill.matchesValue(49)).toBe(false);
      expect(fill.matchesValue(51)).toBe(false);
    });

    it('handles negative ranges', () => {
      fill.minValue = -100;
      fill.maxValue = -50;
      expect(fill.matchesValue(-100)).toBe(true);
      expect(fill.matchesValue(-75)).toBe(true);
      expect(fill.matchesValue(-50)).toBe(true);
      expect(fill.matchesValue(-49)).toBe(false);
      expect(fill.matchesValue(-101)).toBe(false);
    });

    it('handles ranges crossing zero', () => {
      fill.minValue = -25;
      fill.maxValue = 25;
      expect(fill.matchesValue(-25)).toBe(true);
      expect(fill.matchesValue(0)).toBe(true);
      expect(fill.matchesValue(25)).toBe(true);
      expect(fill.matchesValue(-26)).toBe(false);
      expect(fill.matchesValue(26)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles very large values', () => {
      fill.minValue = 1000000;
      expect(fill.matchesValue(1000000)).toBe(true);
      expect(fill.matchesValue(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('handles very small values', () => {
      fill.maxValue = -1000000;
      expect(fill.matchesValue(-1000000)).toBe(true);
      expect(fill.matchesValue(Number.MIN_SAFE_INTEGER)).toBe(true);
    });

    it('handles decimal values', () => {
      fill.minValue = 0.1;
      fill.maxValue = 0.9;
      expect(fill.matchesValue(0.1)).toBe(true);
      expect(fill.matchesValue(0.5)).toBe(true);
      expect(fill.matchesValue(0.9)).toBe(true);
      expect(fill.matchesValue(0.09)).toBe(false);
      expect(fill.matchesValue(0.91)).toBe(false);
    });

    it('handles Infinity', () => {
      fill.minValue = 0;
      expect(fill.matchesValue(Infinity)).toBe(true);

      fill.minValue = undefined;
      fill.maxValue = 0;
      expect(fill.matchesValue(-Infinity)).toBe(true);
    });
  });
});

// ============================================================================
// matchesLabel
// ============================================================================

describe('matchesLabel', () => {
  let fill: ChartFill;

  beforeEach(() => {
    fill = new ChartFill();
  });

  it('returns false when label is undefined', () => {
    expect(fill.matchesLabel('Test')).toBe(false);
    expect(fill.matchesLabel('')).toBe(false);
  });

  it('returns true for exact label match', () => {
    fill.label = 'Revenue';
    expect(fill.matchesLabel('Revenue')).toBe(true);
  });

  it('returns false for partial matches', () => {
    fill.label = 'Revenue';
    expect(fill.matchesLabel('Rev')).toBe(false);
    expect(fill.matchesLabel('Revenue Growth')).toBe(false);
  });

  it('is case-sensitive', () => {
    fill.label = 'Revenue';
    expect(fill.matchesLabel('revenue')).toBe(false);
    expect(fill.matchesLabel('REVENUE')).toBe(false);
    expect(fill.matchesLabel('ReVeNuE')).toBe(false);
  });

  it('handles empty string label', () => {
    fill.label = '';
    expect(fill.matchesLabel('')).toBe(true);
    expect(fill.matchesLabel('anything')).toBe(false);
  });

  it('handles labels with spaces', () => {
    fill.label = 'Q1 Revenue';
    expect(fill.matchesLabel('Q1 Revenue')).toBe(true);
    expect(fill.matchesLabel('Q1Revenue')).toBe(false);
    expect(fill.matchesLabel('Q1  Revenue')).toBe(false);
  });

  it('handles labels with special characters', () => {
    fill.label = 'Revenue ($)';
    expect(fill.matchesLabel('Revenue ($)')).toBe(true);
    expect(fill.matchesLabel('Revenue')).toBe(false);
  });

  it('handles unicode characters', () => {
    fill.label = '收入';
    expect(fill.matchesLabel('收入')).toBe(true);
    expect(fill.matchesLabel('收')).toBe(false);
  });

  it('handles labels with leading/trailing whitespace', () => {
    fill.label = '  Revenue  ';
    expect(fill.matchesLabel('  Revenue  ')).toBe(true);
    expect(fill.matchesLabel('Revenue')).toBe(false);
  });
});

// ============================================================================
// Combined scenarios (integration-style tests)
// ============================================================================

describe('ChartFill combined scenarios', () => {
  it('can have both pattern and label for palette matching', () => {
    const fill = new ChartFill();
    fill.label = 'Critical';
    fill.fill = '#fee2e2';
    fill.stroke = '#dc2626';
    fill.pattern = 'crosshatch';

    expect(fill.hasPattern()).toBe(true);
    expect(fill.matchesLabel('Critical')).toBe(true);
    expect(fill.matchesLabel('Warning')).toBe(false);
  });

  it('can have both pattern and value range for threshold matching', () => {
    const fill = new ChartFill();
    fill.maxValue = 30;
    fill.fill = '#fee2e2';
    fill.stroke = '#dc2626';
    fill.pattern = 'diagonal-lines';

    expect(fill.hasPattern()).toBe(true);
    expect(fill.matchesValue(25)).toBe(true);
    expect(fill.matchesValue(35)).toBe(false);
  });

  it('solid fill (no pattern) with label matching', () => {
    const fill = new ChartFill();
    fill.label = 'Revenue';
    fill.fill = '#2563eb';

    expect(fill.hasPattern()).toBe(false);
    expect(fill.matchesLabel('Revenue')).toBe(true);
  });

  it('fill with all value range properties', () => {
    const fill = new ChartFill();
    fill.minValue = 30;
    fill.maxValue = 70;
    fill.fill = '#fef3c7';

    expect(fill.matchesValue(29)).toBe(false);
    expect(fill.matchesValue(30)).toBe(true);
    expect(fill.matchesValue(50)).toBe(true);
    expect(fill.matchesValue(70)).toBe(true);
    expect(fill.matchesValue(71)).toBe(false);
  });

  it('fill with scale property', () => {
    const fill = new ChartFill();
    fill.pattern = 'dots';
    fill.scale = 2;

    expect(fill.hasPattern()).toBe(true);
    expect(fill.scale).toBe(2);
  });
});

// ============================================================================
// Property access tests
// ============================================================================

describe('ChartFill properties', () => {
  it('has all expected properties accessible', () => {
    const fill = new ChartFill();

    // Set all properties
    fill.fill = '#ffffff';
    fill.stroke = '#000000';
    fill.pattern = 'dots';
    fill.scale = 1.5;
    fill.label = 'Test';
    fill.value = 50;
    fill.minValue = 0;
    fill.maxValue = 100;

    // Verify they're all accessible
    expect(fill.fill).toBe('#ffffff');
    expect(fill.stroke).toBe('#000000');
    expect(fill.pattern).toBe('dots');
    expect(fill.scale).toBe(1.5);
    expect(fill.label).toBe('Test');
    expect(fill.value).toBe(50);
    expect(fill.minValue).toBe(0);
    expect(fill.maxValue).toBe(100);
  });

  it('properties default to undefined', () => {
    const fill = new ChartFill();

    expect(fill.fill).toBeUndefined();
    expect(fill.stroke).toBeUndefined();
    expect(fill.pattern).toBeUndefined();
    expect(fill.scale).toBeUndefined();
    expect(fill.label).toBeUndefined();
    expect(fill.value).toBeUndefined();
    expect(fill.minValue).toBeUndefined();
    expect(fill.maxValue).toBeUndefined();
  });
});
