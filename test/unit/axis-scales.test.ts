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

  public testCalculateAutoLabelLines(): number {
    return this.calculateAutoLabelLines();
  }

  public testCalculateAutoLabelInterval(): number {
    return this.calculateAutoLabelInterval();
  }

  public testGetAxisLabelPadding(): { top: number; right: number; bottom: number; left: number } {
    return this.getAxisLabelPadding();
  }

  // Allow setting width for testing
  public setDimensions(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  // Allow setting labels for testing
  public setLabels(labels: string[]): void {
    this.testLabels = labels;
  }

  // Override measureText to return predictable values for testing
  protected override measureText(text: string, _fontSize: number): number {
    // Simple approximation: 8 pixels per character
    return text.length * 8;
  }

  // Override getChartPadding to return predictable values without DOM
  protected override getChartPadding(): { top: number; right: number; bottom: number; left: number } {
    return { top: 50, right: 20, bottom: 50, left: 80 };
  }

  // Override getAxisTitleDimensions to return null (no axis titles in unit tests)
  protected override getAxisTitleDimensions(_position: string): { text: string; width: number; height: number } | null {
    return null;
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

// ============================================================================
// calculateAutoLabelLines
// ============================================================================

describe('calculateAutoLabelLines', () => {
  it('returns 1 for empty labels', () => {
    const chart = new TestAxisChart({ labels: [] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelLines()).toBe(1);
  });

  it('returns 1 when labels fit comfortably', () => {
    // 5 labels, each ~40px (5 chars * 8px), 600px chart with ~100px padding
    // Chart width ~500px, space per label = 100px, fits in 1 line
    const chart = new TestAxisChart({ labels: ['Label', 'Label', 'Label', 'Label', 'Label'] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelLines()).toBe(1);
  });

  it('returns 2 when labels need two lines', () => {
    // 10 labels with longer names, less space per label
    const chart = new TestAxisChart({
      labels: ['VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel',
               'VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel', 'VeryLongLabel']
    });
    chart.setDimensions(400, 400);  // Narrower chart
    const lines = chart.testCalculateAutoLabelLines();
    expect(lines).toBeGreaterThanOrEqual(2);
  });

  it('caps at 4 lines for very crowded labels', () => {
    // Many very long labels in a narrow chart
    const chart = new TestAxisChart({
      labels: Array(20).fill('VeryVeryLongLabelName')
    });
    chart.setDimensions(300, 400);
    expect(chart.testCalculateAutoLabelLines()).toBe(4);
  });

  it('handles single label', () => {
    const chart = new TestAxisChart({ labels: ['Single'] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelLines()).toBe(1);
  });
});

// ============================================================================
// calculateAutoLabelInterval
// ============================================================================

describe('calculateAutoLabelInterval', () => {
  it('returns 1 for empty labels', () => {
    const chart = new TestAxisChart({ labels: [] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelInterval()).toBe(1);
  });

  it('returns 1 when labels fit without skipping', () => {
    // Few short labels with plenty of space
    const chart = new TestAxisChart({ labels: ['A', 'B', 'C', 'D', 'E'] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelInterval()).toBe(1);
  });

  it('returns higher interval when labels are crowded', () => {
    // Many labels with moderate length
    const chart = new TestAxisChart({
      labels: Array(20).fill('LabelText')
    });
    chart.setDimensions(400, 400);
    const interval = chart.testCalculateAutoLabelInterval();
    expect(interval).toBeGreaterThan(1);
  });

  it('returns appropriate interval for very crowded labels', () => {
    // Many long labels in narrow chart
    const chart = new TestAxisChart({
      labels: Array(30).fill('VeryLongLabel')
    });
    chart.setDimensions(300, 400);
    const interval = chart.testCalculateAutoLabelInterval();
    expect(interval).toBeGreaterThanOrEqual(3);
  });

  it('handles single label', () => {
    const chart = new TestAxisChart({ labels: ['Single'] });
    chart.setDimensions(600, 400);
    expect(chart.testCalculateAutoLabelInterval()).toBe(1);
  });
});

// ============================================================================
// getAxisLabelPadding
// ============================================================================

describe('getAxisLabelPadding', () => {
  it('returns default padding for basic chart', () => {
    const chart = new TestAxisChart({ maxValue: 100 });
    chart.setDimensions(600, 400);
    const padding = chart.testGetAxisLabelPadding();

    // Should have some padding on all sides
    expect(padding.top).toBeGreaterThan(0);
    expect(padding.right).toBeGreaterThanOrEqual(0);
    expect(padding.bottom).toBeGreaterThan(0);
    expect(padding.left).toBeGreaterThan(0);
  });

  it('left padding accounts for value width', () => {
    // Larger values need more space for axis labels
    const chart1 = new TestAxisChart({ maxValue: 100 });
    chart1.setDimensions(600, 400);
    const padding1 = chart1.testGetAxisLabelPadding();

    const chart2 = new TestAxisChart({ maxValue: 1000000 });
    chart2.setDimensions(600, 400);
    const padding2 = chart2.testGetAxisLabelPadding();

    // Larger numbers need more left padding for Y-axis labels
    expect(padding2.left).toBeGreaterThan(padding1.left);
  });

  it('considers negative values for padding', () => {
    // Chart with negative values needs space for minus sign
    const chart = new TestAxisChart({ maxValue: 100, minValue: -100 });
    chart.setDimensions(600, 400);
    const padding = chart.testGetAxisLabelPadding();

    // Should account for "-100" being wider than "100"
    expect(padding.left).toBeGreaterThan(0);
  });

  it('has consistent bottom padding for category labels', () => {
    const chart1 = new TestAxisChart({ labels: ['A', 'B', 'C'] });
    chart1.setDimensions(600, 400);
    const padding1 = chart1.testGetAxisLabelPadding();

    const chart2 = new TestAxisChart({ labels: ['Long', 'Labels', 'Here'] });
    chart2.setDimensions(600, 400);
    const padding2 = chart2.testGetAxisLabelPadding();

    // Bottom padding is fixed height for labels (25px default)
    expect(padding1.bottom).toBe(padding2.bottom);
  });

  it('includes fixed value label height in top padding', () => {
    const chart = new TestAxisChart({ maxValue: 50 });
    chart.setDimensions(600, 400);
    const padding = chart.testGetAxisLabelPadding();

    // Top padding includes space for value labels above bars (25px default)
    expect(padding.top).toBe(25);
  });
});
