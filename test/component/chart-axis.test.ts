import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/chart-axis';
import '../../src/chart-title';
import { ChartAxis } from '../../src/chart-axis';

/**
 * Component tests for ChartAxis.
 *
 * Tests DOM-dependent methods:
 * - getTitleElement() - queries child dc-title element
 * - getTitleInfo() - returns text and SVG styles from title
 * - getStyleWarnings() - includes warnings from nested title
 *
 * Unit tests already cover:
 * - getResolvedPosition()
 * - getLabelIntervalValue()
 * - getLabelLinesValue()
 * - getSvgStyleAttributes()
 * - Property defaults
 */

describe('ChartAxis component', () => {
  let axis: ChartAxis;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-axis element', async () => {
      axis = await fixture<ChartAxis>('dc-axis');
      expect(axis).toBeInstanceOf(ChartAxis);
      expect(axis.tagName.toLowerCase()).toBe('dc-axis');
    });

    it('creates with position attribute', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { position: 'left' });
      expect(axis.position).toBe('left');
    });

    it('creates with nested dc-title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { position: 'left' },
        '<dc-title>Y Axis</dc-title>'
      );
      const title = axis.querySelector('dc-title');
      expect(title).not.toBeNull();
      expect(title?.textContent).toBe('Y Axis');
    });

    it('creates with multiple attributes', async () => {
      axis = await fixture<ChartAxis>('dc-axis', {
        position: 'bottom',
        'label-interval': '2',
        'label-lines': '2',
        'value-format': 'compact 1',
      });
      expect(axis.position).toBe('bottom');
      expect(axis.labelInterval).toBe('2');
      expect(axis.labelLines).toBe('2');
      expect(axis.valueFormat).toBe('compact 1');
    });
  });

  // ============================================================================
  // getTitleElement()
  // ============================================================================

  describe('getTitleElement', () => {
    it('returns null when no title element', async () => {
      axis = await fixture<ChartAxis>('dc-axis');
      expect(axis.getTitleElement()).toBeNull();
    });

    it('returns dc-title element when present', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>Axis Title</dc-title>'
      );
      const titleEl = axis.getTitleElement();
      expect(titleEl).not.toBeNull();
      expect(titleEl?.tagName.toLowerCase()).toBe('dc-title');
    });

    it('returns first direct child dc-title only', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        `
        <dc-title>First Title</dc-title>
        <dc-title>Second Title</dc-title>
        `
      );
      const titleEl = axis.getTitleElement();
      expect(titleEl?.textContent?.trim()).toBe('First Title');
    });

    it('ignores nested dc-title (not direct child)', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<div><dc-title>Nested Title</dc-title></div>'
      );
      // :scope > dc-title only matches direct children
      expect(axis.getTitleElement()).toBeNull();
    });
  });

  // ============================================================================
  // getTitleInfo()
  // ============================================================================

  describe('getTitleInfo', () => {
    it('returns null when no title element', async () => {
      axis = await fixture<ChartAxis>('dc-axis');
      expect(axis.getTitleInfo()).toBeNull();
    });

    it('returns null for empty title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title></dc-title>'
      );
      expect(axis.getTitleInfo()).toBeNull();
    });

    it('returns null for whitespace-only title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>   </dc-title>'
      );
      expect(axis.getTitleInfo()).toBeNull();
    });

    it('returns title text', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>Revenue ($)</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info).not.toBeNull();
      expect(info?.text).toBe('Revenue ($)');
    });

    it('trims title text', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>  Trimmed  </dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.text).toBe('Trimmed');
    });

    it('returns empty svgStyles when no styles set', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>Plain Title</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles).toEqual({});
    });

    it('returns fill style from title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title fill="#1a1a1a">Styled</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles['fill']).toBe('#1a1a1a');
    });

    it('returns font-size style from title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title font-size="14">Sized</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles['font-size']).toBe('14');
    });

    it('returns font-family style from title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title font-family="Georgia, serif">Serif</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles['font-family']).toBe('Georgia, serif');
    });

    it('returns multiple styles from title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title fill="#333" font-size="16" font-weight="bold">Multi</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles).toEqual({
        'fill': '#333',
        'font-size': '16',
        'font-weight': 'bold',
      });
    });

    it('ignores non-SVG attributes on title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title fill="#333" position="top" id="my-title">Filtered</dc-title>'
      );
      const info = axis.getTitleInfo();
      expect(info?.svgStyles['fill']).toBe('#333');
      expect(info?.svgStyles['position']).toBeUndefined();
      expect(info?.svgStyles['id']).toBeUndefined();
    });
  });

  // ============================================================================
  // getStyleWarnings() with nested title
  // ============================================================================

  describe('getStyleWarnings with nested title', () => {
    it('returns empty array when no issues', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { fill: '#333' },
        '<dc-title fill="#1a1a1a">Clean</dc-title>'
      );
      const warnings = axis.getStyleWarnings();
      expect(warnings).toEqual([]);
    });

    it('warns about color attribute on axis', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { color: 'red' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.attribute === 'color')).toBe(true);
      expect(warnings.some(w => w.message.includes('<dc-axis>'))).toBe(true);
    });

    it('warns about color attribute on nested title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title color="blue">Bad Color</dc-title>'
      );
      const warnings = axis.getStyleWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.attribute === 'color')).toBe(true);
      expect(warnings.some(w => w.message.includes('<dc-axis> <dc-title>'))).toBe(true);
    });

    it('warns about font-size with px on axis', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '14px' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(true);
      expect(warnings.some(w => w.message.includes('unitless'))).toBe(true);
    });

    it('warns about font-size with px on nested title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title font-size="16px">Bad Size</dc-title>'
      );
      const warnings = axis.getStyleWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(true);
      expect(warnings.some(w => w.message.includes('<dc-axis> <dc-title>'))).toBe(true);
    });

    it('collects warnings from both axis and title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { color: 'red' },
        '<dc-title color="blue">Double Bad</dc-title>'
      );
      const warnings = axis.getStyleWarnings();
      expect(warnings.length).toBe(2);
      expect(warnings.some(w => w.message.includes('<dc-axis>:'))).toBe(true);
      expect(warnings.some(w => w.message.includes('<dc-axis> <dc-title>'))).toBe(true);
    });

    it('warns about font-size with em unit', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '1.2em' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(true);
    });

    it('warns about font-size with rem unit', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '0.875rem' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(true);
    });

    it('warns about font-size with percent', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '120%' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(true);
    });

    it('no warning for unitless font-size', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '14' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(false);
    });

    it('no warning for decimal font-size', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'font-size': '12.5' });
      const warnings = axis.getStyleWarnings();
      expect(warnings.some(w => w.attribute === 'font-size')).toBe(false);
    });
  });

  // ============================================================================
  // Axis with title - integration tests
  // ============================================================================

  describe('axis with title integration', () => {
    it('left axis with title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { position: 'left' },
        '<dc-title>Y Axis Label</dc-title>'
      );
      expect(axis.position).toBe('left');
      expect(axis.getResolvedPosition()).toBe('left');
      expect(axis.getTitleInfo()?.text).toBe('Y Axis Label');
    });

    it('bottom axis with styled title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { position: 'bottom', 'label-interval': '2' },
        '<dc-title fill="#666" font-size="12">Categories</dc-title>'
      );
      expect(axis.position).toBe('bottom');
      expect(axis.getLabelIntervalValue()).toBe(2);
      const info = axis.getTitleInfo();
      expect(info?.text).toBe('Categories');
      expect(info?.svgStyles['fill']).toBe('#666');
      expect(info?.svgStyles['font-size']).toBe('12');
    });

    it('y axis maps to left with title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { position: 'y' },
        '<dc-title>Value Axis</dc-title>'
      );
      expect(axis.position).toBe('y');
      expect(axis.getResolvedPosition()).toBe('left');
      expect(axis.getTitleInfo()?.text).toBe('Value Axis');
    });

    it('x axis maps to bottom with title', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        { position: 'x' },
        '<dc-title>Category Axis</dc-title>'
      );
      expect(axis.position).toBe('x');
      expect(axis.getResolvedPosition()).toBe('bottom');
      expect(axis.getTitleInfo()?.text).toBe('Category Axis');
    });
  });

  // ============================================================================
  // valueFormat attribute
  // ============================================================================

  describe('valueFormat attribute', () => {
    it('defaults to undefined', async () => {
      axis = await fixture<ChartAxis>('dc-axis');
      expect(axis.valueFormat).toBeUndefined();
    });

    it('can be set to format string', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'value-format': 'currency USD' });
      expect(axis.valueFormat).toBe('currency USD');
    });

    it('can be set to compact format', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'value-format': 'compact 1' });
      expect(axis.valueFormat).toBe('compact 1');
    });

    it('can be set to d3 format', async () => {
      axis = await fixture<ChartAxis>('dc-axis', { 'value-format': '$,.2f' });
      expect(axis.valueFormat).toBe('$,.2f');
    });
  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles title with special characters', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>Revenue ($) & Profit (%)</dc-title>'
      );
      expect(axis.getTitleInfo()?.text).toBe('Revenue ($) & Profit (%)');
    });

    it('handles title with unicode', async () => {
      axis = await fixture<ChartAxis>(
        'dc-axis',
        {},
        '<dc-title>Umsatz (€) 📈</dc-title>'
      );
      expect(axis.getTitleInfo()?.text).toBe('Umsatz (€) 📈');
    });

    it('handles empty axis with all attributes', async () => {
      axis = await fixture<ChartAxis>('dc-axis', {
        position: 'right',
        'label-interval': 'auto',
        'label-lines': 'auto',
        'value-format': 'percent 1',
        fill: '#333',
        'font-size': '11',
      });
      expect(axis.position).toBe('right');
      expect(axis.getLabelIntervalValue()).toBe('auto');
      expect(axis.getLabelLinesValue()).toBe('auto');
      expect(axis.valueFormat).toBe('percent 1');
      expect(axis.getSvgStyleAttributes()['fill']).toBe('#333');
      expect(axis.getSvgStyleAttributes()['font-size']).toBe('11');
    });
  });
});
