import { describe, it, expect } from 'vitest';
import {
  average,
  standardDeviation,
  findPeaks,
  findValleys,
  analyzeLineTrend,
  analyzeLines,
  analyzeBars,
  analyzePie,
  analyzeFunnel,
  analyzeBubbles,
  type LinePoint,
  type LineData,
  type BarData,
  type SliceData,
  type StageData,
  type BubbleData,
} from '../../src/accessibility/insights';

// ============================================================================
// Utility Functions
// ============================================================================

describe('average', () => {
  it('calculates average of positive numbers', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
  });

  it('calculates average of mixed positive and negative', () => {
    expect(average([-10, 10])).toBe(0);
  });

  it('calculates average with decimals', () => {
    expect(average([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
  });

  it('returns 0 for empty array', () => {
    expect(average([])).toBe(0);
  });

  it('returns the value for single-element array', () => {
    expect(average([42])).toBe(42);
  });

  it('handles large numbers', () => {
    expect(average([1000000, 2000000, 3000000])).toBe(2000000);
  });
});

describe('standardDeviation', () => {
  it('calculates standard deviation correctly', () => {
    // Values: 2, 4, 4, 4, 5, 5, 7, 9
    // Mean: 5, Variance: 4, StdDev: 2
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('returns 0 for identical values', () => {
    expect(standardDeviation([5, 5, 5, 5])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(standardDeviation([42])).toBe(0);
  });

  it('calculates for two values', () => {
    // [0, 10]: mean=5, variance=25, stddev=5
    expect(standardDeviation([0, 10])).toBe(5);
  });

  it('handles negative values', () => {
    // [-5, 5]: mean=0, variance=25, stddev=5
    expect(standardDeviation([-5, 5])).toBe(5);
  });
});

describe('findPeaks', () => {
  it('finds local maxima in the middle of array', () => {
    const values = [1, 3, 2, 5, 2, 4, 1];
    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(findPeaks(values, labels)).toEqual(['b', 'd', 'f']);
  });

  it('includes global max at start if highest', () => {
    const values = [10, 5, 3, 2, 1];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    expect(findPeaks(values, labels)).toContain('a');
  });

  it('includes global max at end if highest', () => {
    const values = [1, 2, 3, 5, 10];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    expect(findPeaks(values, labels)).toContain('e');
  });

  it('returns empty array for monotonically increasing', () => {
    const values = [1, 2, 3, 4, 5];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    const peaks = findPeaks(values, labels);
    // Should only contain 'e' (global max at end)
    expect(peaks).toEqual(['e']);
  });

  it('returns empty array for monotonically decreasing', () => {
    const values = [5, 4, 3, 2, 1];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    const peaks = findPeaks(values, labels);
    // Should only contain 'a' (global max at start)
    expect(peaks).toEqual(['a']);
  });

  it('handles empty arrays', () => {
    expect(findPeaks([], [])).toEqual([]);
  });

  it('handles single element', () => {
    expect(findPeaks([5], ['a'])).toEqual([]);
  });

  it('handles two elements', () => {
    expect(findPeaks([5, 10], ['a', 'b'])).toContain('b');
  });

  it('handles plateau (equal adjacent values)', () => {
    const values = [1, 5, 5, 5, 1];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    // Middle values are not strictly greater than neighbors
    const peaks = findPeaks(values, labels);
    expect(peaks).toEqual([]);
  });
});

describe('findValleys', () => {
  it('finds local minima in the middle of array', () => {
    const values = [5, 2, 4, 1, 3, 2, 5];
    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(findValleys(values, labels)).toEqual(['b', 'd', 'f']);
  });

  it('does not include endpoints', () => {
    const values = [1, 5, 3, 5, 1];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    // Only 'c' is a local minimum (endpoints not considered by findValleys)
    expect(findValleys(values, labels)).toEqual(['c']);
  });

  it('returns empty for monotonically increasing', () => {
    const values = [1, 2, 3, 4, 5];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    expect(findValleys(values, labels)).toEqual([]);
  });

  it('returns empty for monotonically decreasing', () => {
    const values = [5, 4, 3, 2, 1];
    const labels = ['a', 'b', 'c', 'd', 'e'];
    expect(findValleys(values, labels)).toEqual([]);
  });

  it('handles empty arrays', () => {
    expect(findValleys([], [])).toEqual([]);
  });

  it('handles single element', () => {
    expect(findValleys([5], ['a'])).toEqual([]);
  });

  it('handles two elements', () => {
    expect(findValleys([5, 10], ['a', 'b'])).toEqual([]);
  });
});

// ============================================================================
// Line Chart Analysis
// ============================================================================

describe('analyzeLineTrend', () => {
  it('returns empty string for empty points', () => {
    expect(analyzeLineTrend([])).toBe('');
  });

  it('describes single point', () => {
    const points: LinePoint[] = [{ value: 100, label: 'Jan' }];
    expect(analyzeLineTrend(points)).toBe('single point at 100');
  });

  it('identifies strong upward trend', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 150, label: 'Feb' },
      { value: 200, label: 'Mar' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('strong upward trend');
  });

  it('identifies gradual upward trend', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 105, label: 'Feb' },
      { value: 110, label: 'Mar' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('gradual upward trend');
  });

  it('identifies strong downward trend', () => {
    const points: LinePoint[] = [
      { value: 200, label: 'Jan' },
      { value: 150, label: 'Feb' },
      { value: 100, label: 'Mar' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('strong downward trend');
  });

  it('identifies gradual downward trend', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 95, label: 'Feb' },
      { value: 90, label: 'Mar' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('gradual downward trend');
  });

  it('identifies flat trend', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 101, label: 'Feb' },
      { value: 100, label: 'Mar' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('relatively flat');
  });

  it('identifies volatile data', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 200, label: 'Feb' },
      { value: 50, label: 'Mar' },
      { value: 180, label: 'Apr' },
      { value: 120, label: 'May' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('volatile');
  });

  it('mentions peak when in middle of data', () => {
    const points: LinePoint[] = [
      { value: 100, label: 'Jan' },
      { value: 200, label: 'Feb' },
      { value: 150, label: 'Mar' },
      { value: 120, label: 'Apr' },
    ];
    const result = analyzeLineTrend(points);
    expect(result).toContain('peaked at Feb');
  });

  it('uses custom formatter', () => {
    const points: LinePoint[] = [{ value: 1000, label: 'Jan' }];
    const formatter = (v: number) => `$${v.toLocaleString()}`;
    const result = analyzeLineTrend(points, formatter);
    expect(result).toContain('$1,000');
  });

  it('handles zero starting value', () => {
    const points: LinePoint[] = [
      { value: 0, label: 'Jan' },
      { value: 100, label: 'Feb' },
    ];
    // Should not crash with division by zero
    const result = analyzeLineTrend(points);
    expect(result).toBeDefined();
  });
});

describe('analyzeLines', () => {
  it('returns empty string for empty lines', () => {
    expect(analyzeLines([])).toBe('');
  });

  it('describes single line with label', () => {
    const lines: LineData[] = [{
      label: 'Revenue',
      points: [
        { value: 100, label: 'Q1' },
        { value: 150, label: 'Q2' },
      ],
    }];
    const result = analyzeLines(lines);
    expect(result).toContain('Revenue:');
  });

  it('describes single line without label', () => {
    const lines: LineData[] = [{
      label: '',
      points: [
        { value: 100, label: 'Q1' },
        { value: 150, label: 'Q2' },
      ],
    }];
    const result = analyzeLines(lines);
    expect(result).not.toContain(':');
  });

  it('summarizes multiple lines with direction', () => {
    const lines: LineData[] = [
      {
        label: 'Revenue',
        points: [
          { value: 100, label: 'Q1' },
          { value: 200, label: 'Q2' },
        ],
      },
      {
        label: 'Costs',
        points: [
          { value: 150, label: 'Q1' },
          { value: 100, label: 'Q2' },
        ],
      },
    ];
    const result = analyzeLines(lines);
    expect(result).toContain('Revenue (up)');
    expect(result).toContain('Costs (down)');
  });

  it('identifies flat lines in multi-line summary', () => {
    const lines: LineData[] = [
      {
        label: 'Stable',
        points: [
          { value: 100, label: 'Q1' },
          { value: 100, label: 'Q2' },
        ],
      },
    ];
    const result = analyzeLines(lines);
    // Single line uses full analysis
    expect(result).toContain('Stable:');
  });
});

// ============================================================================
// Bar Chart Analysis
// ============================================================================

describe('analyzeBars', () => {
  it('returns empty string for empty bars', () => {
    expect(analyzeBars([])).toBe('');
  });

  it('describes single bar', () => {
    const bars: BarData[] = [{ label: 'Sales', value: 100 }];
    const result = analyzeBars(bars);
    expect(result).toBe('single bar: Sales at 100');
  });

  it('identifies highest and lowest bars', () => {
    const bars: BarData[] = [
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 200 },
      { label: 'Q3', value: 150 },
      { label: 'Q4', value: 50 },
    ];
    const result = analyzeBars(bars);
    expect(result).toContain('Q2 highest');
    expect(result).toContain('Q4 lowest');
  });

  it('identifies consistent values', () => {
    const bars: BarData[] = [
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 105 },
      { label: 'Q3', value: 98 },
      { label: 'Q4', value: 102 },
    ];
    const result = analyzeBars(bars);
    expect(result).toContain('relatively consistent');
  });

  it('compares against reference value - all exceed', () => {
    const bars: BarData[] = [
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 120 },
    ];
    const result = analyzeBars(bars, 50);
    expect(result).toContain('all exceed target');
  });

  it('compares against reference value - all below', () => {
    const bars: BarData[] = [
      { label: 'Q1', value: 30 },
      { label: 'Q2', value: 40 },
    ];
    const result = analyzeBars(bars, 50);
    expect(result).toContain('all below target');
  });

  it('compares against reference value - mixed', () => {
    const bars: BarData[] = [
      { label: 'Q1', value: 60 },
      { label: 'Q2', value: 40 },
      { label: 'Q3', value: 70 },
    ];
    const result = analyzeBars(bars, 50);
    expect(result).toContain('target');
  });

  it('compares against reference value - many above, few below (lists missed)', () => {
    // More than 3 above target, 3 or fewer below - should list those that missed
    const bars: BarData[] = [
      { label: 'A', value: 60 },
      { label: 'B', value: 70 },
      { label: 'C', value: 80 },
      { label: 'D', value: 90 },
      { label: 'E', value: 30 },
      { label: 'F', value: 40 },
    ];
    const result = analyzeBars(bars, 50);
    expect(result).toContain('target missed in E, F');
  });

  it('compares against reference value - many above, many below (shows count)', () => {
    // More than 3 above target AND more than 3 below - should show count
    const bars: BarData[] = [
      { label: 'A', value: 60 },
      { label: 'B', value: 70 },
      { label: 'C', value: 80 },
      { label: 'D', value: 90 },
      { label: 'E', value: 10 },
      { label: 'F', value: 20 },
      { label: 'G', value: 30 },
      { label: 'H', value: 40 },
    ];
    const result = analyzeBars(bars, 50);
    expect(result).toContain('4 of 8 met target');
  });

  it('uses custom formatter', () => {
    const bars: BarData[] = [{ label: 'Sales', value: 1000 }];
    const formatter = (v: number) => `$${v}`;
    const result = analyzeBars(bars, undefined, formatter);
    expect(result).toContain('$1000');
  });
});

// ============================================================================
// Pie Chart Analysis
// ============================================================================

describe('analyzePie', () => {
  it('returns empty string for empty slices', () => {
    expect(analyzePie([])).toBe('');
  });

  it('describes single slice as 100%', () => {
    const slices: SliceData[] = [{ label: 'Only', value: 100 }];
    const result = analyzePie(slices);
    expect(result).toBe('single category: Only (100%)');
  });

  it('identifies dominant slice (>50%)', () => {
    const slices: SliceData[] = [
      { label: 'Major', value: 70 },
      { label: 'Minor1', value: 20 },
      { label: 'Minor2', value: 10 },
    ];
    const result = analyzePie(slices);
    expect(result).toContain('dominated by Major');
    expect(result).toContain('70%');
  });

  it('identifies evenly distributed slices', () => {
    const slices: SliceData[] = [
      { label: 'A', value: 25 },
      { label: 'B', value: 26 },
      { label: 'C', value: 24 },
      { label: 'D', value: 25 },
    ];
    const result = analyzePie(slices);
    expect(result).toContain('relatively evenly distributed');
    expect(result).toContain('4 categories');
  });

  it('describes range for uneven non-dominant distribution', () => {
    const slices: SliceData[] = [
      { label: 'Large', value: 40 },
      { label: 'Medium', value: 35 },
      { label: 'Small', value: 25 },
    ];
    const result = analyzePie(slices);
    expect(result).toContain('Large leads');
    expect(result).toContain('Small smallest');
  });

  it('returns "no data" when total is zero', () => {
    const slices: SliceData[] = [
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
    ];
    const result = analyzePie(slices);
    expect(result).toBe('no data');
  });
});

// ============================================================================
// Funnel Chart Analysis
// ============================================================================

describe('analyzeFunnel', () => {
  it('returns empty string for empty stages', () => {
    expect(analyzeFunnel([])).toBe('');
  });

  it('describes single stage', () => {
    const stages: StageData[] = [{ label: 'Visitors', value: 1000 }];
    const result = analyzeFunnel(stages);
    expect(result).toBe('single stage: Visitors with 1000');
  });

  it('calculates overall conversion rate', () => {
    const stages: StageData[] = [
      { label: 'Visitors', value: 1000 },
      { label: 'Leads', value: 500 },
      { label: 'Customers', value: 100 },
    ];
    const result = analyzeFunnel(stages);
    expect(result).toContain('10.0% overall conversion');
  });

  it('identifies biggest drop-off', () => {
    const stages: StageData[] = [
      { label: 'Visitors', value: 1000 },
      { label: 'Signups', value: 800 },
      { label: 'Activated', value: 200 },
      { label: 'Paid', value: 150 },
    ];
    const result = analyzeFunnel(stages);
    expect(result).toContain('biggest drop from Signups to Activated');
  });

  it('handles zero starting value', () => {
    const stages: StageData[] = [
      { label: 'Start', value: 0 },
      { label: 'End', value: 100 },
    ];
    const result = analyzeFunnel(stages);
    expect(result).toBe('starts at zero');
  });

  it('does not mention small drop-offs', () => {
    const stages: StageData[] = [
      { label: 'Start', value: 100 },
      { label: 'End', value: 90 },
    ];
    const result = analyzeFunnel(stages);
    // Only 10% drop, shouldn't be mentioned as "biggest drop"
    expect(result).not.toContain('biggest drop');
  });

  it('uses custom formatter', () => {
    const stages: StageData[] = [{ label: 'Stage', value: 1000 }];
    const formatter = (v: number) => `${v} users`;
    const result = analyzeFunnel(stages, formatter);
    expect(result).toContain('1000 users');
  });
});

// ============================================================================
// Bubble Chart Analysis
// ============================================================================

describe('analyzeBubbles', () => {
  it('returns empty string for empty bubbles', () => {
    expect(analyzeBubbles([])).toBe('');
  });

  it('describes single bubble', () => {
    const bubbles: BubbleData[] = [
      { label: 'Product A', value: 100, sizeValue: 50 },
    ];
    const result = analyzeBubbles(bubbles);
    expect(result).toBe('single bubble: Product A at value 100');
  });

  it('identifies highest value bubble', () => {
    const bubbles: BubbleData[] = [
      { label: 'Product A', value: 100, sizeValue: 50 },
      { label: 'Product B', value: 200, sizeValue: 30 },
      { label: 'Product C', value: 150, sizeValue: 40 },
    ];
    const result = analyzeBubbles(bubbles);
    expect(result).toContain('Product B has highest value');
    expect(result).toContain('200');
  });

  it('identifies largest size bubble when different from highest value', () => {
    const bubbles: BubbleData[] = [
      { label: 'High Value', value: 200, sizeValue: 10 },
      { label: 'Large Size', value: 50, sizeValue: 100 },
    ];
    const result = analyzeBubbles(bubbles);
    expect(result).toContain('High Value has highest value');
    expect(result).toContain('Large Size is largest by size');
  });

  it('does not duplicate when highest value is also largest', () => {
    const bubbles: BubbleData[] = [
      { label: 'Winner', value: 200, sizeValue: 100 },
      { label: 'Loser', value: 50, sizeValue: 10 },
    ];
    const result = analyzeBubbles(bubbles);
    expect(result).toContain('Winner has highest value');
    expect(result).not.toContain('largest by size');
  });

  it('uses custom formatter', () => {
    const bubbles: BubbleData[] = [
      { label: 'Product', value: 1000, sizeValue: 50 },
    ];
    const formatter = (v: number) => `$${v}`;
    const result = analyzeBubbles(bubbles, formatter);
    expect(result).toContain('$1000');
  });
});
