import { describe, it, expect, beforeEach } from 'vitest';
import { ChartGrid } from '../../src/chart-grid';

/**
 * Tests for ChartGrid configuration element.
 *
 * Focuses on:
 * - Default property values
 * - Property setters
 * - getGridConfig() method
 * - getStrokeDasharray() method
 * - getStyleWarnings() method
 */

describe('ChartGrid properties', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  describe('default values', () => {
    it('color defaults to #ddd', () => {
      expect(grid.color).toBe('#ddd');
    });

    it('lineStyle defaults to solid', () => {
      expect(grid.lineStyle).toBe('solid');
    });

    it('hidden defaults to false', () => {
      expect(grid.hidden).toBe(false);
    });
  });

  describe('property assignment', () => {
    it('can set color', () => {
      grid.color = '#ff0000';
      expect(grid.color).toBe('#ff0000');
    });

    it('can set lineStyle to dashed', () => {
      grid.lineStyle = 'dashed';
      expect(grid.lineStyle).toBe('dashed');
    });

    it('can set lineStyle to dotted', () => {
      grid.lineStyle = 'dotted';
      expect(grid.lineStyle).toBe('dotted');
    });

    it('can set hidden', () => {
      grid.hidden = true;
      expect(grid.hidden).toBe(true);
    });
  });
});

describe('getGridConfig', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  it('returns show=true when not hidden', () => {
    const config = grid.getGridConfig();
    expect(config.show).toBe(true);
  });

  it('returns show=false when hidden', () => {
    grid.hidden = true;
    const config = grid.getGridConfig();
    expect(config.show).toBe(false);
  });

  it('returns the color value', () => {
    grid.color = '#eee';
    const config = grid.getGridConfig();
    expect(config.color).toBe('#eee');
  });

  it('returns the lineStyle value', () => {
    grid.lineStyle = 'dashed';
    const config = grid.getGridConfig();
    expect(config.lineStyle).toBe('dashed');
  });

  it('returns complete config with defaults', () => {
    const config = grid.getGridConfig();
    expect(config).toEqual({
      show: true,
      color: '#ddd',
      lineStyle: 'solid'
    });
  });

  it('returns complete config with custom values', () => {
    grid.color = '#000';
    grid.lineStyle = 'dotted';
    grid.hidden = false;
    const config = grid.getGridConfig();
    expect(config).toEqual({
      show: true,
      color: '#000',
      lineStyle: 'dotted'
    });
  });
});

describe('getStrokeDasharray', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  it('returns empty string for solid', () => {
    grid.lineStyle = 'solid';
    expect(grid.getStrokeDasharray()).toBe('');
  });

  it('returns "5,5" for dashed', () => {
    grid.lineStyle = 'dashed';
    expect(grid.getStrokeDasharray()).toBe('5,5');
  });

  it('returns "2,4" for dotted', () => {
    grid.lineStyle = 'dotted';
    expect(grid.getStrokeDasharray()).toBe('2,4');
  });

  it('returns empty string for default', () => {
    // Default is solid
    expect(grid.getStrokeDasharray()).toBe('');
  });
});

describe('getStyleWarnings', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  it('returns empty array for valid configuration', () => {
    const warnings = grid.getStyleWarnings();
    expect(warnings).toEqual([]);
  });

  it('returns empty array for valid lineStyle values', () => {
    grid.lineStyle = 'solid';
    expect(grid.getStyleWarnings()).toEqual([]);

    grid.lineStyle = 'dashed';
    expect(grid.getStyleWarnings()).toEqual([]);

    grid.lineStyle = 'dotted';
    expect(grid.getStyleWarnings()).toEqual([]);
  });

  it('returns warning for invalid lineStyle', () => {
    // Force an invalid value by bypassing type checking
    (grid as any).lineStyle = 'wavy';
    const warnings = grid.getStyleWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].attribute).toBe('style');
    expect(warnings[0].message).toContain('Invalid style');
  });
});
