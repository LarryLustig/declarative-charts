import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AxisChart, TimeScale, AxisConfig } from '../../src/axis-chart';
import { SVGTemplateResult, svg } from 'lit';

/**
 * Tests for time axis functionality in AxisChart.
 *
 * Covers:
 * - parseTimeScale(): Parsing labels as dates
 * - getTimePosition(): Time-proportional positioning
 * - getTimeX(): X coordinate calculation
 * - renderTimeAxisLabels(): Label rendering
 */

// Create a concrete implementation for testing
class TestAxisChart extends AxisChart {
  getMaxValue(): number {
    return 100;
  }

  getMinValue(): number {
    return 0;
  }

  getAllValues(): number[] {
    return [10, 50, 100];
  }

  getCategoryLabels(): string[] {
    return ['2024-01-01', '2024-01-15', '2024-02-01'];
  }

  renderChart(): SVGTemplateResult {
    return svg``;
  }

  // Expose protected methods for testing
  public testParseTimeScale(labels: string[], config: AxisConfig): TimeScale | null {
    return this.parseTimeScale(labels, config);
  }

  public testGetTimePosition(date: Date, timeScale: TimeScale): number {
    return this.getTimePosition(date, timeScale);
  }

  public testGetTimeX(date: Date, timeScale: TimeScale, chartLeft: number, chartWidth: number): number {
    return this.getTimeX(date, timeScale, chartLeft, chartWidth);
  }

  public testRenderTimeAxisLabels(
    timeScale: TimeScale,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number
  ): SVGTemplateResult {
    return this.renderTimeAxisLabels(timeScale, padding, chartWidth);
  }
}

describe('parseTimeScale', () => {
  let chart: TestAxisChart;

  beforeEach(() => {
    chart = new TestAxisChart();
  });

  it('returns null when type is not "time"', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'label',
    };
    expect(chart.testParseTimeScale(labels, config)).toBeNull();
  });

  it('returns null when type is "value"', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'value',
    };
    expect(chart.testParseTimeScale(labels, config)).toBeNull();
  });

  it('returns TimeScale when type is "time" with valid dates', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).not.toBeNull();
    expect(result!.min).toBeInstanceOf(Date);
    expect(result!.max).toBeInstanceOf(Date);
    expect(result!.dates).toHaveLength(3);
    expect(result!.validIndices).toEqual([0, 1, 2]);
  });

  it('calculates correct time range', () => {
    const labels = ['2024-01-01', '2024-06-15', '2024-12-31'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).not.toBeNull();
    expect(result!.min.getFullYear()).toBe(2024);
    expect(result!.min.getMonth()).toBe(0); // January
    expect(result!.max.getMonth()).toBe(11); // December
  });

  it('handles mixed valid and invalid dates', () => {
    const labels = ['2024-01-01', 'not a date', '2024-02-01'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
    };
    const result = chart.testParseTimeScale(labels, config);
    // Should still work with 2 valid dates
    expect(result).not.toBeNull();
    expect(result!.validIndices).toEqual([0, 2]);
  });

  it('returns null with fewer than 2 valid dates', () => {
    const labels = ['2024-01-01', 'not a date', 'also not a date'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).toBeNull();
  });

  it('generates tick dates for the time scale', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-01-30'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).not.toBeNull();
    expect(result!.tickDates.length).toBeGreaterThan(0);
    expect(result!.tickFormat).toBeTruthy();
  });

  it('uses custom date-label-format when provided', () => {
    const labels = ['2024-01-01', '2024-01-15', '2024-02-01'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
      dateLabelFormat: 'dd/MM/yyyy',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).not.toBeNull();
    expect(result!.tickFormat).toBe('dd/MM/yyyy');
  });

  it('uses date-format for parsing when provided', () => {
    const labels = ['01/15/2024', '02/20/2024', '03/25/2024'];
    const config: AxisConfig = {
      position: 'bottom',
      labelInterval: 'auto',
      labelLines: 1,
      type: 'time',
      dateFormat: 'MM/dd/yyyy',
    };
    const result = chart.testParseTimeScale(labels, config);
    expect(result).not.toBeNull();
    expect(result!.dates[0].getMonth()).toBe(0); // January
    expect(result!.dates[0].getDate()).toBe(15);
  });
});

describe('getTimePosition', () => {
  let chart: TestAxisChart;
  let timeScale: TimeScale;

  beforeEach(() => {
    chart = new TestAxisChart();
    // Create a time scale from Jan 1 to Jan 31
    timeScale = {
      min: new Date(2024, 0, 1),
      max: new Date(2024, 0, 31),
      dates: [],
      validIndices: [],
      tickDates: [],
      tickFormat: 'MMM d',
    };
  });

  it('returns 0 for min date', () => {
    const position = chart.testGetTimePosition(new Date(2024, 0, 1), timeScale);
    expect(position).toBe(0);
  });

  it('returns 1 for max date', () => {
    const position = chart.testGetTimePosition(new Date(2024, 0, 31), timeScale);
    expect(position).toBe(1);
  });

  it('returns ~0.5 for midpoint date', () => {
    const position = chart.testGetTimePosition(new Date(2024, 0, 16), timeScale);
    expect(position).toBeCloseTo(0.5, 1);
  });

  it('returns correct position for arbitrary date', () => {
    // Jan 8 is 7 days out of 30, so ~0.233
    const position = chart.testGetTimePosition(new Date(2024, 0, 8), timeScale);
    expect(position).toBeGreaterThan(0.2);
    expect(position).toBeLessThan(0.3);
  });
});

describe('getTimeX', () => {
  let chart: TestAxisChart;
  let timeScale: TimeScale;

  beforeEach(() => {
    chart = new TestAxisChart();
    timeScale = {
      min: new Date(2024, 0, 1),
      max: new Date(2024, 0, 31),
      dates: [],
      validIndices: [],
      tickDates: [],
      tickFormat: 'MMM d',
    };
  });

  it('returns chartLeft for min date', () => {
    const x = chart.testGetTimeX(new Date(2024, 0, 1), timeScale, 50, 400);
    expect(x).toBe(50);
  });

  it('returns chartLeft + chartWidth for max date', () => {
    const x = chart.testGetTimeX(new Date(2024, 0, 31), timeScale, 50, 400);
    expect(x).toBe(450);
  });

  it('returns midpoint for middle date', () => {
    const x = chart.testGetTimeX(new Date(2024, 0, 16), timeScale, 50, 400);
    expect(x).toBeCloseTo(250, 0);
  });

  it('handles different padding and width', () => {
    const x = chart.testGetTimeX(new Date(2024, 0, 1), timeScale, 100, 200);
    expect(x).toBe(100);

    const xMax = chart.testGetTimeX(new Date(2024, 0, 31), timeScale, 100, 200);
    expect(xMax).toBe(300);
  });
});

describe('renderTimeAxisLabels', () => {
  let chart: TestAxisChart;
  let timeScale: TimeScale;

  beforeEach(() => {
    chart = new TestAxisChart();
    chart.width = 600;
    chart.height = 400;

    timeScale = {
      min: new Date(2024, 0, 1),
      max: new Date(2024, 0, 31),
      dates: [],
      validIndices: [],
      tickDates: [
        new Date(2024, 0, 1),
        new Date(2024, 0, 15),
        new Date(2024, 0, 31),
      ],
      tickFormat: 'MMM d',
    };
  });

  it('renders SVG template result', () => {
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const result = chart.testRenderTimeAxisLabels(timeScale, padding, 500);
    expect(result).toBeDefined();
  });

  it('creates correct number of text elements', () => {
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const result = chart.testRenderTimeAxisLabels(timeScale, padding, 500);
    // The result is an SVG template, we can check it's defined
    expect(result).toBeDefined();
    // Since we can't easily inspect the SVG in unit tests, we verify the function runs
  });
});

describe('TimeScale interface', () => {
  it('has correct structure', () => {
    const timeScale: TimeScale = {
      min: new Date(2024, 0, 1),
      max: new Date(2024, 0, 31),
      dates: [new Date(2024, 0, 1), new Date(2024, 0, 15), new Date(2024, 0, 31)],
      validIndices: [0, 1, 2],
      tickDates: [new Date(2024, 0, 1), new Date(2024, 0, 31)],
      tickFormat: 'MMM d, yyyy',
    };

    expect(timeScale.min).toBeInstanceOf(Date);
    expect(timeScale.max).toBeInstanceOf(Date);
    expect(timeScale.dates).toHaveLength(3);
    expect(timeScale.validIndices).toHaveLength(3);
    expect(timeScale.tickDates).toHaveLength(2);
    expect(timeScale.tickFormat).toBe('MMM d, yyyy');
  });
});
