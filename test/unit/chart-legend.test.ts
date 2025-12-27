import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChartLegend,
  isDimensionless,
  type LegendItem,
  type ValuedLegendItem,
  type DimensionlessLegendItem,
  type LegendShape,
} from '../../src/chart-legend';

/**
 * Tests for ChartLegend utilities and methods.
 *
 * Focuses on:
 * - isDimensionless type guard function
 * - getSvgStyleAttributes method
 * - getStyleWarnings method
 * - Static constants
 */

// ============================================================================
// isDimensionless type guard
// ============================================================================

describe('isDimensionless', () => {
  describe('returns true for dimensionless items', () => {
    it('identifies item with dimensionless: true', () => {
      const item: DimensionlessLegendItem = {
        label: 'Trend Line',
        color: '#ff0000',
        dimensionless: true,
      };
      expect(isDimensionless(item)).toBe(true);
    });

    it('identifies dimensionless item with shape', () => {
      const item: DimensionlessLegendItem = {
        label: 'Reference',
        color: '#00ff00',
        dimensionless: true,
        shape: 'line',
      };
      expect(isDimensionless(item)).toBe(true);
    });
  });

  describe('returns false for valued items', () => {
    it('identifies item with value property', () => {
      const item: ValuedLegendItem = {
        label: 'Sales',
        color: '#0000ff',
        value: 100,
      };
      expect(isDimensionless(item)).toBe(false);
    });

    it('identifies valued item with shape', () => {
      const item: ValuedLegendItem = {
        label: 'Revenue',
        color: '#ff00ff',
        value: 500,
        shape: 'square',
      };
      expect(isDimensionless(item)).toBe(false);
    });

    it('identifies valued item with zero value', () => {
      const item: ValuedLegendItem = {
        label: 'Empty',
        color: '#cccccc',
        value: 0,
      };
      expect(isDimensionless(item)).toBe(false);
    });

    it('identifies valued item with negative value', () => {
      const item: ValuedLegendItem = {
        label: 'Loss',
        color: '#dc2626',
        value: -50,
      };
      expect(isDimensionless(item)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false if dimensionless property is missing', () => {
      // Cast to test edge case - object without dimensionless property
      const item = {
        label: 'Test',
        color: '#000',
        value: 10,
      } as LegendItem;
      expect(isDimensionless(item)).toBe(false);
    });

    it('returns false if dimensionless is false', () => {
      // Explicitly false (edge case - shouldn't normally happen)
      const item = {
        label: 'Test',
        color: '#000',
        dimensionless: false,
      } as unknown as LegendItem;
      expect(isDimensionless(item)).toBe(false);
    });

    it('returns false if dimensionless is truthy but not true', () => {
      // Truthy but not exactly true
      const item = {
        label: 'Test',
        color: '#000',
        dimensionless: 1,
      } as unknown as LegendItem;
      expect(isDimensionless(item)).toBe(false);
    });
  });
});

// ============================================================================
// LegendShape type
// ============================================================================

describe('LegendShape type', () => {
  it('accepts valid shape values', () => {
    const shapes: LegendShape[] = ['square', 'line', 'circle'];
    shapes.forEach(shape => {
      const item: ValuedLegendItem = {
        label: 'Test',
        color: '#000',
        value: 10,
        shape,
      };
      expect(item.shape).toBe(shape);
    });
  });
});

// ============================================================================
// ChartLegend static constants
// ============================================================================

describe('ChartLegend static constants', () => {
  describe('DEFAULT_FONT_SIZE', () => {
    it('is defined', () => {
      expect(ChartLegend.DEFAULT_FONT_SIZE).toBeDefined();
    });

    it('is a reasonable font size', () => {
      expect(ChartLegend.DEFAULT_FONT_SIZE).toBeGreaterThan(8);
      expect(ChartLegend.DEFAULT_FONT_SIZE).toBeLessThan(24);
    });
  });

  describe('DEFAULT_TITLE_FONT_SIZE', () => {
    it('is defined', () => {
      expect(ChartLegend.DEFAULT_TITLE_FONT_SIZE).toBeDefined();
    });

    it('is larger than or equal to item font size', () => {
      expect(ChartLegend.DEFAULT_TITLE_FONT_SIZE).toBeGreaterThanOrEqual(
        ChartLegend.DEFAULT_FONT_SIZE
      );
    });
  });

  describe('TABULAR layout constants', () => {
    it('has all required properties', () => {
      expect(ChartLegend.TABULAR).toHaveProperty('itemHeight');
      expect(ChartLegend.TABULAR).toHaveProperty('colorBoxWidth');
      expect(ChartLegend.TABULAR).toHaveProperty('colorBoxGap');
      expect(ChartLegend.TABULAR).toHaveProperty('labelValueGap');
      expect(ChartLegend.TABULAR).toHaveProperty('itemPadding');
      expect(ChartLegend.TABULAR).toHaveProperty('fontSize');
      expect(ChartLegend.TABULAR).toHaveProperty('columnGap');
      expect(ChartLegend.TABULAR).toHaveProperty('padding');
    });

    it('has positive values', () => {
      Object.values(ChartLegend.TABULAR).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('WRAPPED layout constants', () => {
    it('has all required properties', () => {
      expect(ChartLegend.WRAPPED).toHaveProperty('lineHeight');
      expect(ChartLegend.WRAPPED).toHaveProperty('colorBoxWidth');
      expect(ChartLegend.WRAPPED).toHaveProperty('colorBoxGap');
      expect(ChartLegend.WRAPPED).toHaveProperty('itemGap');
      expect(ChartLegend.WRAPPED).toHaveProperty('fontSize');
      expect(ChartLegend.WRAPPED).toHaveProperty('padding');
    });

    it('has positive values', () => {
      Object.values(ChartLegend.WRAPPED).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================================================
// ChartLegend instance properties
// ============================================================================

describe('ChartLegend properties', () => {
  let legend: ChartLegend;

  beforeEach(() => {
    legend = new ChartLegend();
  });

  describe('default values', () => {
    it('showValue defaults to true', () => {
      expect(legend.showValue).toBe(true);
    });

    it('showPercent defaults to false', () => {
      expect(legend.showPercent).toBe(false);
    });

    it('showLabel defaults to true', () => {
      expect(legend.showLabel).toBe(true);
    });

    it('columns defaults to "auto"', () => {
      expect(legend.columns).toBe('auto');
    });

    it('position defaults to "right"', () => {
      expect(legend.position).toBe('right');
    });

    it('maxWidth defaults to undefined', () => {
      expect(legend.maxWidth).toBeUndefined();
    });

    it('valueFormat defaults to undefined', () => {
      expect(legend.valueFormat).toBeUndefined();
    });

    it('percentFormat defaults to undefined', () => {
      expect(legend.percentFormat).toBeUndefined();
    });
  });

  describe('property assignment', () => {
    it('can set showValue', () => {
      legend.showValue = false;
      expect(legend.showValue).toBe(false);
    });

    it('can set showPercent', () => {
      legend.showPercent = true;
      expect(legend.showPercent).toBe(true);
    });

    it('can set columns to integer string', () => {
      legend.columns = '3';
      expect(legend.columns).toBe('3');
    });

    it('can set columns to "*" for wrapped layout', () => {
      legend.columns = '*';
      expect(legend.columns).toBe('*');
    });

    it('can set position to valid values', () => {
      const positions = [
        'top', 'top-left', 'top-right',
        'left', 'right',
        'bottom', 'bottom-left', 'bottom-right'
      ];
      positions.forEach(pos => {
        legend.position = pos as any;
        expect(legend.position).toBe(pos);
      });
    });

    it('can set maxWidth', () => {
      legend.maxWidth = '200px';
      expect(legend.maxWidth).toBe('200px');
    });

    it('can set valueFormat', () => {
      legend.valueFormat = 'currency USD';
      expect(legend.valueFormat).toBe('currency USD');
    });

    it('can set percentFormat', () => {
      legend.percentFormat = 'percent 0';
      expect(legend.percentFormat).toBe('percent 0');
    });
  });
});

// ============================================================================
// getSvgStyleAttributes
// ============================================================================

describe('getSvgStyleAttributes', () => {
  let legend: ChartLegend;

  beforeEach(() => {
    legend = new ChartLegend();
  });

  it('returns empty object when no SVG attributes set', () => {
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs).toEqual({});
  });

  it('returns fill attribute', () => {
    legend.setAttribute('fill', '#333');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs['fill']).toBe('#333');
  });

  it('returns font-size attribute', () => {
    legend.setAttribute('font-size', '14');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs['font-size']).toBe('14');
  });

  it('returns font-family attribute', () => {
    legend.setAttribute('font-family', 'Arial');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs['font-family']).toBe('Arial');
  });

  it('returns font-weight attribute', () => {
    legend.setAttribute('font-weight', 'bold');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs['font-weight']).toBe('bold');
  });

  it('returns font-style attribute', () => {
    legend.setAttribute('font-style', 'italic');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs['font-style']).toBe('italic');
  });

  it('returns multiple SVG attributes', () => {
    legend.setAttribute('fill', '#1a1a1a');
    legend.setAttribute('font-size', '16');
    legend.setAttribute('font-family', 'Helvetica');
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs).toEqual({
      'fill': '#1a1a1a',
      'font-size': '16',
      'font-family': 'Helvetica',
    });
  });

  it('ignores non-SVG attributes', () => {
    legend.setAttribute('fill', '#333');
    legend.setAttribute('position', 'top'); // Not an SVG style attr
    legend.setAttribute('show-value', 'true'); // Not an SVG style attr
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
    expect(attrs['position']).toBeUndefined();
    expect(attrs['show-value']).toBeUndefined();
  });

  it('ignores HTML-style attributes', () => {
    legend.setAttribute('fill', '#333');
    legend.setAttribute('color', 'red'); // HTML, not SVG
    const attrs = legend.getSvgStyleAttributes();
    expect(attrs).toEqual({ 'fill': '#333' });
    expect(attrs['color']).toBeUndefined();
  });
});

// ============================================================================
// getStyleWarnings
// ============================================================================

describe('getStyleWarnings', () => {
  let legend: ChartLegend;

  beforeEach(() => {
    legend = new ChartLegend();
  });

  it('returns empty array when no problematic attributes', () => {
    legend.setAttribute('fill', '#333');
    legend.setAttribute('font-size', '14');
    const warnings = legend.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('warns about color attribute (should be fill)', () => {
    legend.setAttribute('color', 'red');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('color');
    expect(warnings[0].value).toBe('red');
    expect(warnings[0].message).toContain('dc-legend');
    expect(warnings[0].message).toContain('fill');
  });

  it('warns about font-size with px unit', () => {
    legend.setAttribute('font-size', '14px');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
    expect(warnings[0].value).toBe('14px');
    expect(warnings[0].message).toContain('unitless');
  });

  it('warns about font-size with em unit', () => {
    legend.setAttribute('font-size', '1.2em');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
    expect(warnings[0].message).toContain('unitless');
  });

  it('warns about font-size with rem unit', () => {
    legend.setAttribute('font-size', '0.875rem');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('warns about font-size with percent', () => {
    legend.setAttribute('font-size', '80%');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(1);
    expect(warnings[0].attribute).toBe('font-size');
  });

  it('does not warn about unitless font-size', () => {
    legend.setAttribute('font-size', '14');
    const warnings = legend.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('does not warn about font-size with decimal', () => {
    legend.setAttribute('font-size', '13.5');
    const warnings = legend.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('returns multiple warnings for multiple issues', () => {
    legend.setAttribute('color', 'blue');
    legend.setAttribute('font-size', '16px');
    const warnings = legend.getStyleWarnings();
    expect(warnings.length).toBe(2);
    expect(warnings.map(w => w.attribute)).toContain('color');
    expect(warnings.map(w => w.attribute)).toContain('font-size');
  });
});

// ============================================================================
// NOTE: getDimensions, generateSvg, and getTitleInfo tests require DOM
// environment (querySelector, document.createElement). These would need
// component-level testing with a DOM environment like jsdom or happy-dom.
// ============================================================================
