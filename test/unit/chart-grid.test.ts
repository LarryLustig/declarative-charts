import { describe, it, expect, beforeEach } from 'vitest';
import { ChartGrid } from '../../src/chart-grid';

/**
 * Tests for the ChartGrid configuration element.
 *
 * `<dc-grid>` used to take `color` and `style`. `style` is the sharpest
 * convention violation the review found (docs/review.md 6.1): every HTML element
 * already has a `style` attribute, so `<dc-grid style="dashed">` shadowed a
 * global one and put an unparseable declaration in the DOM. The attributes are
 * now `stroke` and `stroke-dasharray`, named for the SVG properties they set
 * and matching what `<dc-fill>` already accepted.
 *
 * Three things in this element were dead before that change: `getStyleWarnings()`
 * had no caller, `getStrokeDasharray()` had no caller (the renderer re-derived
 * the value from its own copy of the dash table), and every shipped example
 * spelled the attribute `line-style`, which matched nothing at all. Those paths
 * are covered here.
 */

describe('ChartGrid properties', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  describe('default values', () => {
    it('stroke defaults to #ddd', () => {
      expect(grid.stroke).toBe('#ddd');
    });

    it('strokeDasharray defaults to solid', () => {
      expect(grid.strokeDasharray).toBe('solid');
    });

    it('hidden defaults to false', () => {
      expect(grid.hidden).toBe(false);
    });
  });

  describe('property assignment', () => {
    it('can set stroke', () => {
      grid.stroke = '#ff0000';
      expect(grid.stroke).toBe('#ff0000');
    });

    it('can set strokeDasharray to a named pattern', () => {
      grid.strokeDasharray = 'dashed';
      expect(grid.strokeDasharray).toBe('dashed');
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
    expect(grid.getGridConfig().show).toBe(true);
  });

  it('returns show=false when hidden', () => {
    grid.hidden = true;
    expect(grid.getGridConfig().show).toBe(false);
  });

  it('returns the stroke value', () => {
    grid.stroke = '#eee';
    expect(grid.getGridConfig().stroke).toBe('#eee');
  });

  // The config now carries a resolved dasharray rather than a style name, so
  // the renderer has nothing left to translate.
  it('returns a resolved dasharray, not the name it was given', () => {
    grid.strokeDasharray = 'dashed';
    expect(grid.getGridConfig().strokeDasharray).toBe('5 5');
  });

  it('returns complete config with defaults', () => {
    expect(grid.getGridConfig()).toEqual({
      show: true,
      stroke: '#ddd',
      strokeDasharray: 'none'
    });
  });

  it('returns complete config with custom values', () => {
    grid.stroke = '#000';
    grid.strokeDasharray = 'dotted';
    expect(grid.getGridConfig()).toEqual({
      show: true,
      stroke: '#000',
      strokeDasharray: '1 3'
    });
  });
});

describe('getStrokeDasharray', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  // The named patterns are <dc-fill>'s, so the same word means the same dash
  // pattern on both elements. They used to disagree: a grid's "dashed" was
  // "5,5" and a fill's was "5 5".
  it.each([
    ['solid', 'none'],
    ['dashed', '5 5'],
    ['dotted', '1 3'],
    ['dash-dot', '5 3 1 3'],
    ['long-dash', '10 5']
  ])('resolves %s to %s', (name, expected) => {
    grid.strokeDasharray = name;
    expect(grid.getStrokeDasharray()).toBe(expected);
  });

  it('defaults to solid', () => {
    expect(grid.getStrokeDasharray()).toBe('none');
  });

  it('passes a raw SVG dash list through untouched', () => {
    grid.strokeDasharray = '4 2 1 2';
    expect(grid.getStrokeDasharray()).toBe('4 2 1 2');
  });

  it('is case-insensitive about named patterns', () => {
    grid.strokeDasharray = 'DASHED';
    expect(grid.getStrokeDasharray()).toBe('5 5');
  });

  it('treats an empty value as solid rather than emitting nothing', () => {
    grid.strokeDasharray = '';
    expect(grid.getStrokeDasharray()).toBe('');
  });
});

describe('getStyleWarnings', () => {
  let grid: ChartGrid;

  beforeEach(() => {
    grid = new ChartGrid();
  });

  it('returns empty array for the default configuration', () => {
    expect(grid.getStyleWarnings()).toEqual([]);
  });

  it('accepts every named pattern without warning', () => {
    for (const name of ['solid', 'dashed', 'dotted', 'dash-dot', 'long-dash']) {
      grid.strokeDasharray = name;
      expect(grid.getStyleWarnings(), name).toEqual([]);
    }
  });

  it('accepts raw dash lists without warning', () => {
    for (const list of ['5 3', '5,3', '4 2 1 2', '2.5 1.5']) {
      grid.strokeDasharray = list;
      expect(grid.getStyleWarnings(), list).toEqual([]);
    }
  });

  // This is the case that used to render a solid grid and say nothing - which
  // is exactly what every shipped example was doing via `line-style`.
  it('warns about an unrecognised dash pattern', () => {
    grid.strokeDasharray = 'wavy';
    const warnings = grid.getStyleWarnings();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].attribute).toBe('stroke-dasharray');
    expect(warnings[0].value).toBe('wavy');
    expect(warnings[0].message).toContain('wavy');
  });

  it('does not warn about an empty value', () => {
    grid.strokeDasharray = '';
    expect(grid.getStyleWarnings()).toEqual([]);
  });
});
