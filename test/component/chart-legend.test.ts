import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/chart-legend';
import '../../src/chart-title';
import { ChartLegend, type LegendItem, type ValuedLegendItem, type DimensionlessLegendItem } from '../../src/chart-legend';

/**
 * Component tests for ChartLegend.
 *
 * Tests DOM-dependent methods that require querySelector:
 * - getTitleInfo() - queries child dc-title element
 * - customTitle getter - queries child dc-title element
 * - getDimensions() - calculates legend size based on items and configuration
 * - generateSvg() - generates SVG template for legend rendering
 */

// Sample legend items for testing
const sampleValuedItems: ValuedLegendItem[] = [
  { label: 'Revenue', color: '#2563eb', value: 1000 },
  { label: 'Expenses', color: '#dc2626', value: 750 },
  { label: 'Profit', color: '#16a34a', value: 250 },
];

const sampleDimensionlessItem: DimensionlessLegendItem = {
  label: 'Trend Line',
  color: '#8b5cf6',
  dimensionless: true,
  shape: 'line',
};

const mixedItems: LegendItem[] = [
  ...sampleValuedItems,
  sampleDimensionlessItem,
];

describe('ChartLegend component', () => {
  let legend: ChartLegend;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-legend element', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      expect(legend).toBeInstanceOf(ChartLegend);
      expect(legend.tagName.toLowerCase()).toBe('dc-legend');
    });

    it('creates with dc-title child', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Legend Title</dc-title>'
      );
      const title = legend.querySelector('dc-title');
      expect(title).not.toBeNull();
      expect(title?.textContent).toBe('Legend Title');
    });
  });

  // ============================================================================
  // customTitle getter (deprecated)
  // ============================================================================

  describe('customTitle getter', () => {
    it('returns undefined when no title element', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      expect(legend.customTitle).toBeUndefined();
    });

    it('returns title text when title element exists', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>My Legend</dc-title>'
      );
      expect(legend.customTitle).toBe('My Legend');
    });

    it('trims whitespace from title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>  Trimmed Title  </dc-title>'
      );
      expect(legend.customTitle).toBe('Trimmed Title');
    });

    it('returns undefined for empty title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>   </dc-title>'
      );
      expect(legend.customTitle).toBeUndefined();
    });
  });

  // ============================================================================
  // getTitleInfo()
  // ============================================================================

  describe('getTitleInfo', () => {
    it('returns null when no title element', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      expect(legend.getTitleInfo()).toBeNull();
    });

    it('returns null for empty title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title></dc-title>'
      );
      expect(legend.getTitleInfo()).toBeNull();
    });

    it('returns title info with text', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Categories</dc-title>'
      );
      const info = legend.getTitleInfo();
      expect(info).not.toBeNull();
      expect(info?.text).toBe('Categories');
    });

    it('returns default position as "top"', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Categories</dc-title>'
      );
      const info = legend.getTitleInfo();
      expect(info?.position).toBe('top');
    });

    it('returns custom position from title element', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title position="left">Categories</dc-title>'
      );
      const info = legend.getTitleInfo();
      expect(info?.position).toBe('left');
    });

    it('returns SVG styles from title element', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title fill="#1a1a1a" font-size="16">Styled Title</dc-title>'
      );
      const info = legend.getTitleInfo();
      expect(info?.svgStyles).toBeDefined();
      expect(info?.svgStyles['fill']).toBe('#1a1a1a');
      expect(info?.svgStyles['font-size']).toBe('16');
    });

    it('returns empty svgStyles object when no styles set', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Plain Title</dc-title>'
      );
      const info = legend.getTitleInfo();
      expect(info?.svgStyles).toEqual({});
    });
  });

  // ============================================================================
  // getDimensions()
  // ============================================================================

  describe('getDimensions', () => {
    beforeEach(async () => {
      legend = await fixture<ChartLegend>('dc-legend');
    });

    it('returns zero dimensions for empty items', () => {
      const dims = legend.getDimensions([], 600);
      expect(dims.width).toBe(0);
      expect(dims.height).toBe(0);
    });

    it('returns positive dimensions for items', () => {
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('height increases with more items', () => {
      const dims1 = legend.getDimensions([sampleValuedItems[0]], 600);
      const dims3 = legend.getDimensions(sampleValuedItems, 600);
      expect(dims3.height).toBeGreaterThanOrEqual(dims1.height);
    });

    it('respects explicit column count', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: '1' });
      const dims1Col = legend.getDimensions(sampleValuedItems, 600);

      legend = await fixture<ChartLegend>('dc-legend', { columns: '3' });
      const dims3Col = legend.getDimensions(sampleValuedItems, 600);

      // 3 columns should be wider and shorter than 1 column
      expect(dims3Col.width).toBeGreaterThan(dims1Col.width);
      expect(dims3Col.height).toBeLessThan(dims1Col.height);
    });

    it('includes title in height calculation', async () => {
      const legendNoTitle = await fixture<ChartLegend>('dc-legend');
      const dimsNoTitle = legendNoTitle.getDimensions(sampleValuedItems, 600);

      const legendWithTitle = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Legend Title</dc-title>'
      );
      const dimsWithTitle = legendWithTitle.getDimensions(sampleValuedItems, 600);

      expect(dimsWithTitle.height).toBeGreaterThan(dimsNoTitle.height);
    });

    it('handles wrapped layout with columns="*"', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('handles dimensionless items', () => {
      const dims = legend.getDimensions([sampleDimensionlessItem], 600);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('handles mixed items (valued and dimensionless)', () => {
      const dims = legend.getDimensions(mixedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // getDimensions() with show-* attributes
  // ============================================================================

  describe('getDimensions with show-* attributes', () => {
    it('adjusts for show-value="false"', async () => {
      const legendWithValue = await fixture<ChartLegend>('dc-legend');
      const dimsWithValue = legendWithValue.getDimensions(sampleValuedItems, 600, true, false);

      const legendNoValue = await fixture<ChartLegend>('dc-legend', { 'show-value': 'false' });
      const dimsNoValue = legendNoValue.getDimensions(sampleValuedItems, 600, true, false);

      // Without values, should be narrower
      expect(dimsNoValue.width).toBeLessThan(dimsWithValue.width);
    });

    it('adjusts for show-percent="true"', async () => {
      const legendNoPercent = await fixture<ChartLegend>('dc-legend');
      const dimsNoPercent = legendNoPercent.getDimensions(sampleValuedItems, 600, false, false);

      const legendWithPercent = await fixture<ChartLegend>('dc-legend', { 'show-percent': '' });
      const dimsWithPercent = legendWithPercent.getDimensions(sampleValuedItems, 600, false, true);

      // With percent, should be wider
      expect(dimsWithPercent.width).toBeGreaterThan(dimsNoPercent.width);
    });

    it('adjusts for show-label="false"', async () => {
      const legendWithLabel = await fixture<ChartLegend>('dc-legend');
      const dimsWithLabel = legendWithLabel.getDimensions(sampleValuedItems, 600);

      const legendNoLabel = await fixture<ChartLegend>('dc-legend', { 'show-label': 'false' });
      const dimsNoLabel = legendNoLabel.getDimensions(sampleValuedItems, 600);

      // Without labels, should be narrower
      expect(dimsNoLabel.width).toBeLessThan(dimsWithLabel.width);
    });
  });

  // ============================================================================
  // generateSvg()
  // ============================================================================

  describe('generateSvg', () => {
    beforeEach(async () => {
      legend = await fixture<ChartLegend>('dc-legend');
    });

    it('returns empty SVG for no items', () => {
      const result = legend.generateSvg([], 600);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('returns SVG template for items', () => {
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toBeDefined();
    });

    it('dimensions match getDimensions result', () => {
      const dims = legend.getDimensions(sampleValuedItems, 600);
      const svgResult = legend.generateSvg(sampleValuedItems, 600);

      expect(svgResult.width).toBe(dims.width);
      expect(svgResult.height).toBe(dims.height);
    });

    it('handles wrapped layout', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: '*' });
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('handles tabular layout with explicit columns', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: '2' });
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('includes title in output when present', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title>Categories</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      // Title adds height
      const noTitleLegend = await fixture<ChartLegend>('dc-legend');
      const noTitleResult = noTitleLegend.generateSvg(sampleValuedItems, 600);
      expect(result.height).toBeGreaterThan(noTitleResult.height);
    });
  });

  // ============================================================================
  // generateSvg() with format options
  // ============================================================================

  describe('generateSvg with formatting', () => {
    it('uses chart value format by default', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const result = legend.generateSvg(
        sampleValuedItems,
        600,
        true,  // showValue
        false, // showPercent
        'currency USD', // chartValueFormat
        'percent 1'
      );
      expect(result.svg).toBeDefined();
    });

    it('uses legend value-format when specified', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'value-format': 'compact 1' });
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });

    it('uses legend percent-format when specified', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        'show-percent': '',
        'percent-format': 'percent 0'
      });
      const result = legend.generateSvg(sampleValuedItems, 600, false, true);
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // Position attribute
  // ============================================================================

  describe('position attribute', () => {
    it('defaults to "right"', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      expect(legend.position).toBe('right');
    });

    it('can be set to horizontal positions', async () => {
      const positions = ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right'];
      for (const pos of positions) {
        legend = await fixture<ChartLegend>('dc-legend', { position: pos });
        expect(legend.position).toBe(pos);
      }
    });

    it('can be set to vertical positions', async () => {
      const positions = ['left', 'right'];
      for (const pos of positions) {
        legend = await fixture<ChartLegend>('dc-legend', { position: pos });
        expect(legend.position).toBe(pos);
      }
    });

    it('affects getDimensions calculation', async () => {
      // Horizontal positions use 80% of chart width
      const topLegend = await fixture<ChartLegend>('dc-legend', { position: 'top', columns: '*' });
      const topDims = topLegend.getDimensions(sampleValuedItems, 600);

      // Vertical positions use 25% of chart width
      const rightLegend = await fixture<ChartLegend>('dc-legend', { position: 'right', columns: '*' });
      const rightDims = rightLegend.getDimensions(sampleValuedItems, 600);

      // Top should be wider than right for wrapped layout
      expect(topDims.width).toBeGreaterThan(rightDims.width);
    });
  });

  // ============================================================================
  // max-width attribute
  // ============================================================================

  describe('max-width attribute', () => {
    it('accepts pixel values', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '200px', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      // Width should be constrained
      expect(dims.width).toBeLessThanOrEqual(250); // 200 + padding + possible title
    });

    it('accepts percentage values', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '50%', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      // 50% of 600 = 300, plus padding
      expect(dims.width).toBeLessThanOrEqual(350);
    });

    it('accepts unitless values', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '150', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeLessThanOrEqual(200);
    });
  });

  // ============================================================================
  // Title positions in legend
  // ============================================================================

  describe('title positions', () => {
    const titlePositions = ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right', 'left', 'right'];

    for (const pos of titlePositions) {
      it(`handles title position="${pos}"`, async () => {
        legend = await fixture<ChartLegend>(
          'dc-legend',
          {},
          `<dc-title position="${pos}">Title</dc-title>`
        );
        const info = legend.getTitleInfo();
        expect(info?.position).toBe(pos);

        // Should still generate valid SVG
        const result = legend.generateSvg(sampleValuedItems, 600);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      });
    }

    it('vertical title positions add to width', async () => {
      const noTitleLegend = await fixture<ChartLegend>('dc-legend');
      const noTitleDims = noTitleLegend.getDimensions(sampleValuedItems, 600);

      const leftTitleLegend = await fixture<ChartLegend>(
        'dc-legend',
        {},
        '<dc-title position="left">Side Title</dc-title>'
      );
      const leftTitleDims = leftTitleLegend.getDimensions(sampleValuedItems, 600);

      expect(leftTitleDims.width).toBeGreaterThan(noTitleDims.width);
    });
  });

  // ============================================================================
  // Shape rendering
  // ============================================================================

  describe('shape rendering', () => {
    it('handles square shape (default)', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const items: ValuedLegendItem[] = [
        { label: 'Item', color: '#ff0000', value: 100, shape: 'square' },
      ];
      const result = legend.generateSvg(items, 600);
      expect(result.svg).toBeDefined();
    });

    it('handles line shape', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const items: ValuedLegendItem[] = [
        { label: 'Line', color: '#ff0000', value: 100, shape: 'line' },
      ];
      const result = legend.generateSvg(items, 600);
      expect(result.svg).toBeDefined();
    });

    it('handles circle shape', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const items: ValuedLegendItem[] = [
        { label: 'Circle', color: '#ff0000', value: 100, shape: 'circle' },
      ];
      const result = legend.generateSvg(items, 600);
      expect(result.svg).toBeDefined();
    });

    it('handles mixed shapes', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const items: LegendItem[] = [
        { label: 'Bar', color: '#ff0000', value: 100, shape: 'square' },
        { label: 'Line', color: '#00ff00', dimensionless: true, shape: 'line' },
        { label: 'Bubble', color: '#0000ff', value: 50, shape: 'circle' },
      ];
      const result = legend.generateSvg(items, 600);
      expect(result.svg).toBeDefined();
    });
  });
});
