import { describe, it, expect } from 'vitest';
import { AxisChart, ValueRange } from '../../src/axis-chart';
import { LegendItem } from '../../src/base-chart';

/**
 * Concrete test implementation of AxisChart that exposes protected methods
 * and allows setting test data via constructor.
 */
class TestAxisChart extends AxisChart {
  private testMaxValue: number;
  private testMinValue: number;
  private testValues: number[];
  private testLabels: string[];

  constructor(options: {
    maxValue?: number;
    minValue?: number;
    values?: number[];
    labels?: string[];
  } = {}) {
    super();
    this.testMaxValue = options.maxValue ?? 100;
    this.testMinValue = options.minValue ?? 0;
    this.testValues = options.values ?? [this.testMaxValue];
    this.testLabels = options.labels ?? ['Label'];
  }

  // Implement abstract methods
  protected getMaxValue(): number {
    return this.testMaxValue;
  }

  protected getMinValue(): number {
    return this.testMinValue;
  }

  protected getAllValues(): number[] {
    return this.testValues;
  }

  protected getCategoryLabels(): string[] {
    return this.testLabels;
  }

  protected getLegendItems(): LegendItem[] {
    return [];
  }

  protected renderChart() {
    return null as any;
  }

  // Expose protected methods for testing
  public testNiceNumber(value: number, round: boolean = false): number {
    return this.niceNumber(value, round);
  }

  public testGetNiceMax(): number {
    return this.getNiceMax();
  }

  public testGetNiceRange(): ValueRange {
    return this.getNiceRange();
  }

  // Override log to be a no-op in tests
  protected override log(): void {
    // Silent in tests
  }
}

// ============================================================================
// niceNumber
// ============================================================================

describe('niceNumber', () => {
  const chart = new TestAxisChart();

  describe('ceiling mode (round=false)', () => {
    it('returns 0 for 0', () => {
      expect(chart.testNiceNumber(0)).toBe(0);
    });

    it('preserves magnitude for fractional values', () => {
      // niceNumber works at the input's magnitude, not absolute
      expect(chart.testNiceNumber(0.1)).toBe(0.1);  // 1 × 10^-1
      expect(chart.testNiceNumber(0.5)).toBe(0.5);  // 5 × 10^-1
      expect(chart.testNiceNumber(1)).toBe(1);
    });

    it('ceilings to 2 for values <= 2', () => {
      expect(chart.testNiceNumber(1.1)).toBe(2);
      expect(chart.testNiceNumber(1.5)).toBe(2);
      expect(chart.testNiceNumber(2)).toBe(2);
    });

    it('ceilings to 5 for values <= 5', () => {
      expect(chart.testNiceNumber(2.1)).toBe(5);
      expect(chart.testNiceNumber(3)).toBe(5);
      expect(chart.testNiceNumber(4)).toBe(5);
      expect(chart.testNiceNumber(5)).toBe(5);
    });

    it('ceilings to 10 for values <= 10', () => {
      expect(chart.testNiceNumber(5.1)).toBe(10);
      expect(chart.testNiceNumber(7)).toBe(10);
      expect(chart.testNiceNumber(9)).toBe(10);
      expect(chart.testNiceNumber(10)).toBe(10);
    });

    it('scales correctly for larger values', () => {
      expect(chart.testNiceNumber(11)).toBe(20);
      expect(chart.testNiceNumber(25)).toBe(50);
      expect(chart.testNiceNumber(47)).toBe(50);
      expect(chart.testNiceNumber(51)).toBe(100);
      expect(chart.testNiceNumber(99)).toBe(100);
      expect(chart.testNiceNumber(100)).toBe(100);
    });

    it('handles hundreds', () => {
      expect(chart.testNiceNumber(150)).toBe(200);
      expect(chart.testNiceNumber(250)).toBe(500);
      expect(chart.testNiceNumber(500)).toBe(500);
      expect(chart.testNiceNumber(750)).toBe(1000);
    });

    it('handles thousands', () => {
      expect(chart.testNiceNumber(1500)).toBe(2000);
      expect(chart.testNiceNumber(3700)).toBe(5000);
      expect(chart.testNiceNumber(8000)).toBe(10000);
    });

    it('handles decimal values', () => {
      expect(chart.testNiceNumber(0.15)).toBe(0.2);
      expect(chart.testNiceNumber(0.37)).toBe(0.5);
      expect(chart.testNiceNumber(0.08)).toBe(0.1);
    });
  });

  describe('rounding mode (round=true)', () => {
    it('returns 0 for 0', () => {
      expect(chart.testNiceNumber(0, true)).toBe(0);
    });

    it('rounds to nearest nice number', () => {
      // fraction < 1.5 → 1
      expect(chart.testNiceNumber(1.2, true)).toBe(1);
      expect(chart.testNiceNumber(1.4, true)).toBe(1);

      // 1.5 <= fraction < 3 → 2
      expect(chart.testNiceNumber(1.5, true)).toBe(2);
      expect(chart.testNiceNumber(2.5, true)).toBe(2);

      // 3 <= fraction < 7 → 5
      expect(chart.testNiceNumber(3, true)).toBe(5);
      expect(chart.testNiceNumber(4, true)).toBe(5);
      expect(chart.testNiceNumber(6, true)).toBe(5);

      // fraction >= 7 → 10
      expect(chart.testNiceNumber(7, true)).toBe(10);
      expect(chart.testNiceNumber(8, true)).toBe(10);
      expect(chart.testNiceNumber(9, true)).toBe(10);
    });

    it('rounds larger values correctly', () => {
      expect(chart.testNiceNumber(37, true)).toBe(50);   // 3.7 rounds to 5
      expect(chart.testNiceNumber(73, true)).toBe(100);  // 7.3 rounds to 10
      expect(chart.testNiceNumber(150, true)).toBe(200); // 1.5 rounds to 2
      expect(chart.testNiceNumber(250, true)).toBe(200); // 2.5 rounds to 2
      expect(chart.testNiceNumber(140, true)).toBe(100); // 1.4 rounds to 1
    });
  });
});

// ============================================================================
// getNiceMax
// ============================================================================

describe('getNiceMax', () => {
  it('returns 1 for zero or negative max values', () => {
    const chart = new TestAxisChart({ maxValue: 0 });
    expect(chart.testGetNiceMax()).toBe(1);

    const chart2 = new TestAxisChart({ maxValue: -10 });
    expect(chart2.testGetNiceMax()).toBe(1);
  });

  it('calculates nice max for simple values', () => {
    const chart = new TestAxisChart({ maxValue: 85 });
    const niceMax = chart.testGetNiceMax();
    // 85 → range ~100, tickSpacing ~20, niceMax = ceil(85/20)*20 = 100
    expect(niceMax).toBeGreaterThanOrEqual(85);
    expect(niceMax % 20).toBe(0); // Should be divisible by tick spacing
  });

  it('returns value >= maxValue', () => {
    const testCases = [10, 50, 100, 237, 1000, 5678];
    for (const maxValue of testCases) {
      const chart = new TestAxisChart({ maxValue });
      expect(chart.testGetNiceMax()).toBeGreaterThanOrEqual(maxValue);
    }
  });

  it('returns nice round numbers', () => {
    const chart1 = new TestAxisChart({ maxValue: 47 });
    expect(chart1.testGetNiceMax()).toBe(50);

    const chart2 = new TestAxisChart({ maxValue: 93 });
    expect(chart2.testGetNiceMax()).toBe(100);

    const chart3 = new TestAxisChart({ maxValue: 180 });
    expect(chart3.testGetNiceMax()).toBe(200);
  });
});

// ============================================================================
// getNiceRange
// ============================================================================

describe('getNiceRange', () => {
  describe('all positive values', () => {
    it('returns min=0 for positive-only data', () => {
      const chart = new TestAxisChart({ maxValue: 100, minValue: 10 });
      const range = chart.testGetNiceRange();
      expect(range.min).toBe(0);
      expect(range.hasNegatives).toBe(false);
      expect(range.hasPositives).toBe(true);
    });

    it('sets zeroPosition to 1 (bottom) for positive data', () => {
      const chart = new TestAxisChart({ maxValue: 100, minValue: 0 });
      const range = chart.testGetNiceRange();
      expect(range.zeroPosition).toBe(1);
    });

    it('returns nice max >= actual max', () => {
      const chart = new TestAxisChart({ maxValue: 85, minValue: 20 });
      const range = chart.testGetNiceRange();
      expect(range.max).toBeGreaterThanOrEqual(85);
    });
  });

  describe('all negative values', () => {
    it('returns max=0 for negative-only data', () => {
      const chart = new TestAxisChart({ maxValue: -10, minValue: -100 });
      const range = chart.testGetNiceRange();
      expect(range.max).toBe(0);
      expect(range.hasNegatives).toBe(true);
      expect(range.hasPositives).toBe(false);
    });

    it('sets zeroPosition to 0 (top) for negative data', () => {
      const chart = new TestAxisChart({ maxValue: -10, minValue: -100 });
      const range = chart.testGetNiceRange();
      expect(range.zeroPosition).toBe(0);
    });

    it('returns nice min <= actual min', () => {
      const chart = new TestAxisChart({ maxValue: -5, minValue: -87 });
      const range = chart.testGetNiceRange();
      expect(range.min).toBeLessThanOrEqual(-87);
    });
  });

  describe('mixed positive and negative values', () => {
    it('includes both positive max and negative min', () => {
      const chart = new TestAxisChart({ maxValue: 50, minValue: -30 });
      const range = chart.testGetNiceRange();
      expect(range.max).toBeGreaterThanOrEqual(50);
      expect(range.min).toBeLessThanOrEqual(-30);
    });

    it('sets hasNegatives and hasPositives to true', () => {
      const chart = new TestAxisChart({ maxValue: 100, minValue: -50 });
      const range = chart.testGetNiceRange();
      expect(range.hasNegatives).toBe(true);
      expect(range.hasPositives).toBe(true);
    });

    it('calculates zeroPosition correctly', () => {
      // Equal positive and negative → zero at 50%
      const chart1 = new TestAxisChart({ maxValue: 50, minValue: -50 });
      const range1 = chart1.testGetNiceRange();
      expect(range1.zeroPosition).toBeCloseTo(0.5, 1);

      // More positive than negative → zero below center
      const chart2 = new TestAxisChart({ maxValue: 80, minValue: -20 });
      const range2 = chart2.testGetNiceRange();
      expect(range2.zeroPosition).toBeGreaterThan(0.5);
      expect(range2.zeroPosition).toBeLessThan(1);

      // More negative than positive → zero above center
      const chart3 = new TestAxisChart({ maxValue: 20, minValue: -80 });
      const range3 = chart3.testGetNiceRange();
      expect(range3.zeroPosition).toBeLessThan(0.5);
      expect(range3.zeroPosition).toBeGreaterThan(0);
    });

    it('uses consistent tick spacing for both sides', () => {
      const chart = new TestAxisChart({ maxValue: 75, minValue: -25 });
      const range = chart.testGetNiceRange();

      // The range should be divisible by a nice tick interval
      const totalRange = range.max - range.min;
      // With gridSteps=5, totalRange should be divisible by 5 tick spacings
      expect(totalRange % 5).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero max and zero min', () => {
      const chart = new TestAxisChart({ maxValue: 0, minValue: 0 });
      const range = chart.testGetNiceRange();
      // Should return a sensible default range
      expect(range.max).toBeGreaterThan(0);
      expect(range.min).toBe(0);
    });

    it('handles very small values', () => {
      const chart = new TestAxisChart({ maxValue: 0.005, minValue: 0 });
      const range = chart.testGetNiceRange();
      expect(range.max).toBeGreaterThanOrEqual(0.005);
      expect(range.min).toBe(0);
    });

    it('handles very large values', () => {
      const chart = new TestAxisChart({ maxValue: 1000000, minValue: 0 });
      const range = chart.testGetNiceRange();
      expect(range.max).toBeGreaterThanOrEqual(1000000);
    });
  });
});

// ============================================================================
// ValueRange interface validation
// ============================================================================

describe('ValueRange structure', () => {
  it('always has min <= max', () => {
    const testCases = [
      { maxValue: 100, minValue: 0 },
      { maxValue: 0, minValue: -100 },
      { maxValue: 50, minValue: -50 },
      { maxValue: 10, minValue: -1000 },
    ];

    for (const testCase of testCases) {
      const chart = new TestAxisChart(testCase);
      const range = chart.testGetNiceRange();
      expect(range.min).toBeLessThanOrEqual(range.max);
    }
  });

  it('zeroPosition is between 0 and 1 when zero is in range', () => {
    const testCases = [
      { maxValue: 100, minValue: 0 },
      { maxValue: 0, minValue: -100 },
      { maxValue: 50, minValue: -50 },
    ];

    for (const testCase of testCases) {
      const chart = new TestAxisChart(testCase);
      const range = chart.testGetNiceRange();
      expect(range.zeroPosition).toBeGreaterThanOrEqual(0);
      expect(range.zeroPosition).toBeLessThanOrEqual(1);
    }
  });

  it('correctly identifies negative/positive presence', () => {
    // Only positive
    const chart1 = new TestAxisChart({ maxValue: 100, minValue: 10 });
    const range1 = chart1.testGetNiceRange();
    expect(range1.hasNegatives).toBe(false);
    expect(range1.hasPositives).toBe(true);

    // Only negative
    const chart2 = new TestAxisChart({ maxValue: -10, minValue: -100 });
    const range2 = chart2.testGetNiceRange();
    expect(range2.hasNegatives).toBe(true);
    expect(range2.hasPositives).toBe(false);

    // Mixed
    const chart3 = new TestAxisChart({ maxValue: 50, minValue: -50 });
    const range3 = chart3.testGetNiceRange();
    expect(range3.hasNegatives).toBe(true);
    expect(range3.hasPositives).toBe(true);

    // Zero only (edge case)
    const chart4 = new TestAxisChart({ maxValue: 0, minValue: 0 });
    const range4 = chart4.testGetNiceRange();
    expect(range4.hasPositives).toBe(false); // 0 is not positive
  });
});
