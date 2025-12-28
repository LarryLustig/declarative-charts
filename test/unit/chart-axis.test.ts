import { describe, it, expect, beforeEach } from 'vitest';
import { ChartAxis, type AxisPosition, type AxisPositionOrName } from '../../src/chart-axis';

/**
 * Tests for ChartAxis configuration and parsing methods.
 *
 * Focuses on:
 * - getResolvedPosition() - position name mapping
 * - getLabelIntervalValue() - label interval parsing
 * - getLabelLinesValue() - label lines parsing
 * - getSvgStyleAttributes() - SVG attribute passthrough
 * - getStyleWarnings() - style issue detection
 * - Property defaults
 */

// ============================================================================
// Property defaults
// ============================================================================

describe('ChartAxis properties', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  describe('default values', () => {
    it('position defaults to "bottom"', () => {
      expect(axis.position).toBe('bottom');
    });

    it('labelInterval defaults to "auto"', () => {
      expect(axis.labelInterval).toBe('auto');
    });

    it('labelLines defaults to 1', () => {
      expect(axis.labelLines).toBe(1);
    });

    it('valueFormat defaults to undefined', () => {
      expect(axis.valueFormat).toBeUndefined();
    });
  });

  describe('property assignment', () => {
    it('can set position to positional names', () => {
      const positions: AxisPosition[] = ['left', 'right', 'top', 'bottom'];
      positions.forEach(pos => {
        axis.position = pos;
        expect(axis.position).toBe(pos);
      });
    });

    it('can set position to x/y names', () => {
      axis.position = 'x';
      expect(axis.position).toBe('x');

      axis.position = 'y';
      expect(axis.position).toBe('y');
    });

    it('can set labelInterval to number', () => {
      axis.labelInterval = 2;
      expect(axis.labelInterval).toBe(2);
    });

    it('can set labelInterval to "auto"', () => {
      axis.labelInterval = 'auto';
      expect(axis.labelInterval).toBe('auto');
    });

    it('can set labelLines to number', () => {
      axis.labelLines = 3;
      expect(axis.labelLines).toBe(3);
    });

    it('can set labelLines to "auto"', () => {
      axis.labelLines = 'auto';
      expect(axis.labelLines).toBe('auto');
    });

    it('can set valueFormat', () => {
      axis.valueFormat = 'compact 1';
      expect(axis.valueFormat).toBe('compact 1');
    });
  });

  describe('Phase 1 value axis properties', () => {
    it('type defaults to undefined', () => {
      expect(axis.type).toBeUndefined();
    });

    it('can set type to value, label, or time', () => {
      axis.type = 'value';
      expect(axis.type).toBe('value');

      axis.type = 'label';
      expect(axis.type).toBe('label');

      axis.type = 'time';
      expect(axis.type).toBe('time');
    });

    it('minValue defaults to undefined', () => {
      expect(axis.minValue).toBeUndefined();
    });

    it('maxValue defaults to undefined', () => {
      expect(axis.maxValue).toBeUndefined();
    });

    it('rangePadding defaults to undefined', () => {
      expect(axis.rangePadding).toBeUndefined();
    });

    it('tickCount defaults to undefined', () => {
      expect(axis.tickCount).toBeUndefined();
    });

    it('tickInterval defaults to undefined', () => {
      expect(axis.tickInterval).toBeUndefined();
    });

    it('tickValues defaults to undefined', () => {
      expect(axis.tickValues).toBeUndefined();
    });

    it('dateFormat defaults to undefined', () => {
      expect(axis.dateFormat).toBeUndefined();
    });

    it('dateLabelFormat defaults to undefined', () => {
      expect(axis.dateLabelFormat).toBeUndefined();
    });
  });
});

// ============================================================================
// Phase 1 getter methods
// ============================================================================

describe('Phase 1 getter methods', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  describe('getTypeValue', () => {
    it('returns undefined when type is not set', () => {
      expect(axis.getTypeValue()).toBeUndefined();
    });

    it('returns the type when set', () => {
      axis.type = 'value';
      expect(axis.getTypeValue()).toBe('value');

      axis.type = 'time';
      expect(axis.getTypeValue()).toBe('time');
    });
  });

  describe('getMinValue', () => {
    it('returns undefined when minValue is not set', () => {
      expect(axis.getMinValue()).toBeUndefined();
    });

    it('returns "auto" when minValue is "auto"', () => {
      axis.minValue = 'auto';
      expect(axis.getMinValue()).toBe('auto');
    });

    it('parses numeric string to number', () => {
      axis.minValue = '10';
      expect(axis.getMinValue()).toBe(10);
    });

    it('parses negative numbers', () => {
      axis.minValue = '-50';
      expect(axis.getMinValue()).toBe(-50);
    });

    it('parses decimal numbers', () => {
      axis.minValue = '0.5';
      expect(axis.getMinValue()).toBe(0.5);
    });

    it('returns undefined for invalid strings', () => {
      axis.minValue = 'invalid';
      expect(axis.getMinValue()).toBeUndefined();
    });
  });

  describe('getMaxValue', () => {
    it('returns undefined when maxValue is not set', () => {
      expect(axis.getMaxValue()).toBeUndefined();
    });

    it('returns "auto" when maxValue is "auto"', () => {
      axis.maxValue = 'auto';
      expect(axis.getMaxValue()).toBe('auto');
    });

    it('parses numeric string to number', () => {
      axis.maxValue = '100';
      expect(axis.getMaxValue()).toBe(100);
    });
  });

  describe('getRangePadding', () => {
    it('returns undefined when rangePadding is not set', () => {
      expect(axis.getRangePadding()).toBeUndefined();
    });

    it('parses percentage to decimal', () => {
      axis.rangePadding = '10%';
      expect(axis.getRangePadding()).toBe(0.1);
    });

    it('parses decimal value directly', () => {
      axis.rangePadding = '0.15';
      expect(axis.getRangePadding()).toBe(0.15);
    });

    it('returns undefined for invalid strings', () => {
      axis.rangePadding = 'invalid';
      expect(axis.getRangePadding()).toBeUndefined();
    });
  });

  describe('getTickCount', () => {
    it('returns undefined when tickCount is not set', () => {
      expect(axis.getTickCount()).toBeUndefined();
    });

    it('returns the value when set', () => {
      axis.tickCount = 10;
      expect(axis.getTickCount()).toBe(10);
    });
  });

  describe('getTickInterval', () => {
    it('returns undefined when tickInterval is not set', () => {
      expect(axis.getTickInterval()).toBeUndefined();
    });

    it('returns the value when set', () => {
      axis.tickInterval = 25;
      expect(axis.getTickInterval()).toBe(25);
    });
  });

  describe('getTickValues', () => {
    it('returns undefined when tickValues is not set', () => {
      expect(axis.getTickValues()).toBeUndefined();
    });

    it('parses comma-separated values', () => {
      axis.tickValues = '0, 25, 50, 75, 100';
      expect(axis.getTickValues()).toEqual([0, 25, 50, 75, 100]);
    });

    it('ignores invalid values in list', () => {
      axis.tickValues = '0, invalid, 50, , 100';
      expect(axis.getTickValues()).toEqual([0, 50, 100]);
    });

    it('returns undefined for empty or invalid string', () => {
      axis.tickValues = 'invalid';
      expect(axis.getTickValues()).toBeUndefined();
    });
  });

  describe('getDateFormat', () => {
    it('returns undefined when dateFormat is not set', () => {
      expect(axis.getDateFormat()).toBeUndefined();
    });

    it('returns the value when set', () => {
      axis.dateFormat = 'yyyy-MM-dd';
      expect(axis.getDateFormat()).toBe('yyyy-MM-dd');
    });
  });

  describe('getDateLabelFormat', () => {
    it('returns undefined when dateLabelFormat is not set', () => {
      expect(axis.getDateLabelFormat()).toBeUndefined();
    });

    it('returns the value when set', () => {
      axis.dateLabelFormat = 'MMM d';
      expect(axis.getDateLabelFormat()).toBe('MMM d');
    });
  });
});

// ============================================================================
// getResolvedPosition
// ============================================================================

describe('getResolvedPosition', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  describe('positional names pass through unchanged', () => {
    it('left returns left', () => {
      axis.position = 'left';
      expect(axis.getResolvedPosition()).toBe('left');
      expect(axis.getResolvedPosition('vertical')).toBe('left');
      expect(axis.getResolvedPosition('horizontal')).toBe('left');
    });

    it('right returns right', () => {
      axis.position = 'right';
      expect(axis.getResolvedPosition()).toBe('right');
      expect(axis.getResolvedPosition('vertical')).toBe('right');
      expect(axis.getResolvedPosition('horizontal')).toBe('right');
    });

    it('top returns top', () => {
      axis.position = 'top';
      expect(axis.getResolvedPosition()).toBe('top');
      expect(axis.getResolvedPosition('vertical')).toBe('top');
      expect(axis.getResolvedPosition('horizontal')).toBe('top');
    });

    it('bottom returns bottom', () => {
      axis.position = 'bottom';
      expect(axis.getResolvedPosition()).toBe('bottom');
      expect(axis.getResolvedPosition('vertical')).toBe('bottom');
      expect(axis.getResolvedPosition('horizontal')).toBe('bottom');
    });
  });

  describe('x/y name mapping', () => {
    it('x maps to bottom', () => {
      axis.position = 'x';
      expect(axis.getResolvedPosition()).toBe('bottom');
      expect(axis.getResolvedPosition('vertical')).toBe('bottom');
      expect(axis.getResolvedPosition('horizontal')).toBe('bottom');
    });

    it('y maps to left', () => {
      axis.position = 'y';
      expect(axis.getResolvedPosition()).toBe('left');
      expect(axis.getResolvedPosition('vertical')).toBe('left');
      expect(axis.getResolvedPosition('horizontal')).toBe('left');
    });
  });

  describe('fallback behavior', () => {
    it('unknown position falls back to bottom', () => {
      axis.position = 'invalid' as AxisPositionOrName;
      expect(axis.getResolvedPosition()).toBe('bottom');
    });

    it('empty string falls back to bottom', () => {
      axis.position = '' as AxisPositionOrName;
      expect(axis.getResolvedPosition()).toBe('bottom');
    });
  });
});

// ============================================================================
// getLabelIntervalValue
// ============================================================================

describe('getLabelIntervalValue', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  describe('auto handling', () => {
    it('returns "auto" when set to "auto"', () => {
      axis.labelInterval = 'auto';
      expect(axis.getLabelIntervalValue()).toBe('auto');
    });

    it('returns "auto" for default value', () => {
      expect(axis.getLabelIntervalValue()).toBe('auto');
    });
  });

  describe('numeric values', () => {
    it('returns 1 for value 1', () => {
      axis.labelInterval = 1;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });

    it('returns 2 for value 2', () => {
      axis.labelInterval = 2;
      expect(axis.getLabelIntervalValue()).toBe(2);
    });

    it('returns large values unchanged', () => {
      axis.labelInterval = 100;
      expect(axis.getLabelIntervalValue()).toBe(100);
    });
  });

  describe('string numeric values', () => {
    it('parses string "1" as 1', () => {
      axis.labelInterval = '1' as any;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });

    it('parses string "5" as 5', () => {
      axis.labelInterval = '5' as any;
      expect(axis.getLabelIntervalValue()).toBe(5);
    });

    it('parses string with whitespace', () => {
      axis.labelInterval = ' 3 ' as any;
      expect(axis.getLabelIntervalValue()).toBe(3);
    });
  });

  describe('invalid values fallback to 1', () => {
    it('returns 1 for 0', () => {
      axis.labelInterval = 0;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });

    it('returns 1 for negative numbers', () => {
      axis.labelInterval = -5;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });

    it('returns 1 for NaN-producing strings', () => {
      axis.labelInterval = 'abc' as any;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });

    it('returns 1 for empty string', () => {
      axis.labelInterval = '' as any;
      expect(axis.getLabelIntervalValue()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('preserves float values when set as number', () => {
      // When set as a number, it's returned as-is (no truncation)
      axis.labelInterval = 2.9;
      expect(axis.getLabelIntervalValue()).toBe(2.9);
    });

    it('truncates string float values via parseInt', () => {
      // When set as string, parseInt truncates to integer
      axis.labelInterval = '3.7' as any;
      expect(axis.getLabelIntervalValue()).toBe(3);
    });
  });
});

// ============================================================================
// getLabelLinesValue
// ============================================================================

describe('getLabelLinesValue', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  describe('auto handling', () => {
    it('returns "auto" when set to "auto"', () => {
      axis.labelLines = 'auto';
      expect(axis.getLabelLinesValue()).toBe('auto');
    });
  });

  describe('default value', () => {
    it('returns 1 for default value', () => {
      expect(axis.getLabelLinesValue()).toBe(1);
    });
  });

  describe('numeric values', () => {
    it('returns 1 for value 1', () => {
      axis.labelLines = 1;
      expect(axis.getLabelLinesValue()).toBe(1);
    });

    it('returns 2 for value 2', () => {
      axis.labelLines = 2;
      expect(axis.getLabelLinesValue()).toBe(2);
    });

    it('returns 3 for value 3', () => {
      axis.labelLines = 3;
      expect(axis.getLabelLinesValue()).toBe(3);
    });

    it('returns large values unchanged', () => {
      axis.labelLines = 10;
      expect(axis.getLabelLinesValue()).toBe(10);
    });
  });

  describe('string numeric values', () => {
    it('parses string "1" as 1', () => {
      axis.labelLines = '1' as any;
      expect(axis.getLabelLinesValue()).toBe(1);
    });

    it('parses string "2" as 2', () => {
      axis.labelLines = '2' as any;
      expect(axis.getLabelLinesValue()).toBe(2);
    });
  });

  describe('invalid values fallback to 1', () => {
    it('returns 1 for 0', () => {
      axis.labelLines = 0;
      expect(axis.getLabelLinesValue()).toBe(1);
    });

    it('returns 1 for negative numbers', () => {
      axis.labelLines = -3;
      expect(axis.getLabelLinesValue()).toBe(1);
    });

    it('returns 1 for NaN-producing strings', () => {
      axis.labelLines = 'invalid' as any;
      expect(axis.getLabelLinesValue()).toBe(1);
    });

    it('returns 1 for empty string', () => {
      axis.labelLines = '' as any;
      expect(axis.getLabelLinesValue()).toBe(1);
    });
  });
});

// ============================================================================
// getSvgStyleAttributes
// ============================================================================

describe('getSvgStyleAttributes', () => {
  let axis: ChartAxis;

  beforeEach(() => {
    axis = new ChartAxis();
  });

  it('returns empty object when no SVG attributes set', () => {
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs).toEqual({});
  });

  it('returns fill attribute', () => {
    axis.setAttribute('fill', '#333');
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs['fill']).toBe('#333');
  });

  it('returns font-size attribute', () => {
    axis.setAttribute('font-size', '12');
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs['font-size']).toBe('12');
  });

  it('returns font-family attribute', () => {
    axis.setAttribute('font-family', 'monospace');
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs['font-family']).toBe('monospace');
  });

  it('returns font-weight attribute', () => {
    axis.setAttribute('font-weight', '600');
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs['font-weight']).toBe('600');
  });

  it('returns multiple SVG attributes', () => {
    axis.setAttribute('fill', '#666');
    axis.setAttribute('font-size', '11');
    axis.setAttribute('font-family', 'Arial');
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs).toEqual({
      'fill': '#666',
      'font-size': '11',
      'font-family': 'Arial',
    });
  });

  it('ignores non-SVG attributes', () => {
    axis.setAttribute('fill', '#333');
    axis.setAttribute('position', 'left'); // Not an SVG style attr
    axis.setAttribute('label-interval', '2'); // Not an SVG style attr
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
    expect(attrs['position']).toBeUndefined();
    expect(attrs['label-interval']).toBeUndefined();
  });

  it('ignores HTML-style attributes', () => {
    axis.setAttribute('fill', '#333');
    axis.setAttribute('color', 'red'); // HTML, not SVG
    const attrs = axis.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
    expect(attrs['color']).toBeUndefined();
  });
});

// ============================================================================
// getStyleWarnings
// ============================================================================
// NOTE: getStyleWarnings() calls getTitleElement() which uses querySelector.
// This requires DOM environment and component-level testing.
// The warning logic is the same as chart-legend.ts which is already tested.

// ============================================================================
// AxisPosition and AxisPositionOrName types
// ============================================================================

describe('Type definitions', () => {
  it('AxisPosition includes all four positions', () => {
    const positions: AxisPosition[] = ['left', 'right', 'top', 'bottom'];
    expect(positions).toHaveLength(4);
  });

  it('AxisPositionOrName includes positions and x/y', () => {
    const allValues: AxisPositionOrName[] = ['left', 'right', 'top', 'bottom', 'x', 'y'];
    expect(allValues).toHaveLength(6);
  });
});

// ============================================================================
// NOTE: getTitleElement and getTitleInfo tests require DOM
// environment (querySelector). These would need component-level testing.
// ============================================================================
