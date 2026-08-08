import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/chart-legend';
import '../../src/chart-title';
import { ChartLegend, type LegendItem, type ValuedLegendItem, type DimensionlessLegendItem, isDimensionless } from '../../src/chart-legend';

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

  // ============================================================================
  // isDimensionless type guard
  // ============================================================================

  describe('isDimensionless', () => {
    it('returns true for dimensionless items', () => {
      const item: DimensionlessLegendItem = {
        label: 'Trend',
        color: '#000',
        dimensionless: true,
      };
      expect(isDimensionless(item)).toBe(true);
    });

    it('returns false for valued items', () => {
      const item: ValuedLegendItem = {
        label: 'Revenue',
        color: '#000',
        value: 100,
      };
      expect(isDimensionless(item)).toBe(false);
    });

    it('returns false for items with dimensionless=false', () => {
      // Edge case: explicitly false
      const item = {
        label: 'Test',
        color: '#000',
        dimensionless: false,
      } as unknown as LegendItem;
      expect(isDimensionless(item)).toBe(false);
    });
  });

  // ============================================================================
  // prepareItems display value branches
  // ============================================================================

  describe('display value formatting', () => {
    it('shows value and percent together', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        'show-value': '',
        'show-percent': '',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, true, true);
      expect(result.svg).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
    });

    it('shows only value (no percent)', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        'show-value': '',
        'show-percent': 'false',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, true, false);
      expect(result.svg).toBeDefined();
    });

    it('shows only percent (no value)', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        'show-value': 'false',
        'show-percent': '',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, false, true);
      expect(result.svg).toBeDefined();
    });

    it('handles zero total for percent calculation', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-percent': '' });
      const zeroItems: ValuedLegendItem[] = [
        { label: 'A', color: '#f00', value: 0 },
        { label: 'B', color: '#0f0', value: 0 },
      ];
      const result = legend.generateSvg(zeroItems, 600, false, true);
      expect(result.svg).toBeDefined();
    });

    it('dimensionless items never show value or percent', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        'show-value': '',
        'show-percent': '',
      });
      const items: LegendItem[] = [
        { label: 'Trend', color: '#000', dimensionless: true },
      ];
      const result = legend.generateSvg(items, 600, true, true);
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // parseCSSValue with various units
  // ============================================================================

  describe('max-width with various units', () => {
    it('accepts rem units', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '10rem', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
    });

    it('accepts em units', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '15em', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
    });

    it('handles invalid max-width gracefully', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': 'invalid', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      // Should fall back to default
      expect(dims.width).toBeGreaterThan(0);
    });

    it('handles empty max-width', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'max-width': '', columns: '*' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Wrapped layout with title positions
  // ============================================================================

  describe('wrapped layout with title positions', () => {
    const wrappedTitlePositions = ['top', 'top-left', 'top-right', 'bottom', 'bottom-left', 'bottom-right', 'left', 'right'];

    for (const pos of wrappedTitlePositions) {
      it(`wrapped layout with title position="${pos}"`, async () => {
        legend = await fixture<ChartLegend>(
          'dc-legend',
          { columns: '*' },
          `<dc-title position="${pos}">Wrapped Title</dc-title>`
        );
        const result = legend.generateSvg(sampleValuedItems, 600);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.svg).toBeDefined();
      });
    }

    it('wrapped layout respects left title width contribution', async () => {
      const noTitleLegend = await fixture<ChartLegend>('dc-legend', { columns: '*' });
      const noTitleDims = noTitleLegend.getDimensions(sampleValuedItems, 600);

      const leftTitleLegend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '*' },
        '<dc-title position="left">Side</dc-title>'
      );
      const leftTitleDims = leftTitleLegend.getDimensions(sampleValuedItems, 600);

      expect(leftTitleDims.width).toBeGreaterThan(noTitleDims.width);
    });

    it('wrapped layout respects right title width contribution', async () => {
      const noTitleLegend = await fixture<ChartLegend>('dc-legend', { columns: '*' });
      const noTitleDims = noTitleLegend.getDimensions(sampleValuedItems, 600);

      const rightTitleLegend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '*' },
        '<dc-title position="right">Side</dc-title>'
      );
      const rightTitleDims = rightTitleLegend.getDimensions(sampleValuedItems, 600);

      expect(rightTitleDims.width).toBeGreaterThan(noTitleDims.width);
    });

    it('wrapped layout adds height for bottom title', async () => {
      const noTitleLegend = await fixture<ChartLegend>('dc-legend', { columns: '*' });
      const noTitleDims = noTitleLegend.getDimensions(sampleValuedItems, 600);

      const bottomTitleLegend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '*' },
        '<dc-title position="bottom">Bottom</dc-title>'
      );
      const bottomTitleDims = bottomTitleLegend.getDimensions(sampleValuedItems, 600);

      expect(bottomTitleDims.height).toBeGreaterThan(noTitleDims.height);
    });
  });

  // ============================================================================
  // Tabular layout with rotated titles
  // ============================================================================

  describe('tabular layout with rotated titles', () => {
    it('tabular layout with left rotated title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '1' },
        '<dc-title position="left">Rotated Left</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('tabular layout with right rotated title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '1' },
        '<dc-title position="right">Rotated Right</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('tabular layout with bottom title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '2' },
        '<dc-title position="bottom">Bottom Title</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.height).toBeGreaterThan(0);
    });

    it('tabular layout with bottom-left title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '2' },
        '<dc-title position="bottom-left">Bottom Left</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });

    it('tabular layout with bottom-right title', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '2' },
        '<dc-title position="bottom-right">Bottom Right</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });

    it('tabular layout default title position (fallback case)', async () => {
      // This tests the default case in the switch statement
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '1' },
        '<dc-title>Default Position</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // Auto column calculation
  // ============================================================================

  describe('auto column calculation', () => {
    it('calculates columns based on available space for horizontal position', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { position: 'top', columns: 'auto' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
    });

    it('calculates columns based on available space for vertical position', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { position: 'right', columns: 'auto' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      expect(dims.width).toBeGreaterThan(0);
    });

    it('limits columns to item count', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { position: 'top', columns: 'auto' });
      const singleItem: ValuedLegendItem[] = [{ label: 'Single', color: '#000', value: 100 }];
      const dims = legend.getDimensions(singleItem, 600);
      expect(dims.width).toBeGreaterThan(0);
    });

    it('handles invalid column value', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: 'invalid' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      // Should default to 1
      expect(dims.width).toBeGreaterThan(0);
    });

    it('handles zero column value', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { columns: '0' });
      const dims = legend.getDimensions(sampleValuedItems, 600);
      // Should be at least 1
      expect(dims.width).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Wrapped layout wrapping behavior
  // ============================================================================

  describe('wrapped layout wrapping', () => {
    it('wraps items when they exceed max width', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        columns: '*',
        'max-width': '100px',
      });
      const manyItems: ValuedLegendItem[] = [
        { label: 'Very Long Item Name One', color: '#f00', value: 100 },
        { label: 'Very Long Item Name Two', color: '#0f0', value: 200 },
        { label: 'Very Long Item Name Three', color: '#00f', value: 300 },
      ];
      const dims = legend.getDimensions(manyItems, 600);
      // Height should increase due to wrapping
      expect(dims.height).toBeGreaterThan(ChartLegend.WRAPPED.lineHeight + 2 * ChartLegend.WRAPPED.padding);
    });

    it('wrapped layout shows displayValue without label when show-label=false', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        columns: '*',
        'show-label': 'false',
        'show-value': '',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, true, false);
      expect(result.svg).toBeDefined();
    });

    it('wrapped layout with title on right reduces effective max width', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '*', 'max-width': '200px' },
        '<dc-title position="right">Title</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // Tabular layout with show-label=false
  // ============================================================================

  describe('tabular layout label visibility', () => {
    it('tabular layout without labels', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        columns: '2',
        'show-label': 'false',
        'show-value': '',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, true, false);
      expect(result.svg).toBeDefined();
    });

    it('tabular layout with only percent (no value, no label)', async () => {
      legend = await fixture<ChartLegend>('dc-legend', {
        columns: '1',
        'show-label': 'false',
        'show-value': 'false',
        'show-percent': '',
      });
      const result = legend.generateSvg(sampleValuedItems, 600, false, true);
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // Locale support
  // ============================================================================

  describe('locale support', () => {
    it('passes locale to formatter in getDimensions', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const dims = legend.getDimensions(
        sampleValuedItems,
        600,
        true,
        false,
        'number',
        'percent 1',
        'de-DE'
      );
      expect(dims.width).toBeGreaterThan(0);
    });

    it('passes locale to formatter in generateSvg', async () => {
      legend = await fixture<ChartLegend>('dc-legend');
      const result = legend.generateSvg(
        sampleValuedItems,
        600,
        true,
        false,
        'number',
        'percent 1',
        'de-DE'
      );
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // Edge cases for title styling
  // ============================================================================

  describe('title styling in SVG', () => {
    it('uses custom fill from title element', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '1' },
        '<dc-title fill="#ff0000">Red Title</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });

    it('uses default fill when not specified', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '1' },
        '<dc-title>Default Title</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });

    it('wrapped layout uses title fill', async () => {
      legend = await fixture<ChartLegend>(
        'dc-legend',
        { columns: '*' },
        '<dc-title fill="#00ff00">Green Title</dc-title>'
      );
      const result = legend.generateSvg(sampleValuedItems, 600);
      expect(result.svg).toBeDefined();
    });
  });
  // ==========================================================================
  // show-* conditions (REVIEW.md 6.2)
  //
  // <dc-legend> used to declare its own private boolean converter, so
  // show-value="10%" here meant `true` while the identical attribute on a data
  // element meant "show when the item is at least 10% of the total". One
  // attribute name, two meanings, no warning. It now uses the shared converter
  // and evaluates the condition per item.
  // ==========================================================================

  describe('show-* conditions', () => {
    /** Text of every <text> node the legend renders, joined. */
    const renderedText = (l: ChartLegend, items = sampleValuedItems): string =>
      JSON.stringify(l.generateSvg(items, 600).svg);

    it('parses a percentage threshold instead of collapsing it to true', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': '10%' });
      expect(legend.showValue).toEqual({ type: 'percent', threshold: 10 });
    });

    it('parses a value threshold', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': '500' });
      expect(legend.showValue).toEqual({ type: 'value', threshold: 500 });
    });

    // Revenue 1000 (50%), Expenses 750 (37.5%), Profit 250 (12.5%).
    it('applies a value threshold per item', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': '500' });
      const text = renderedText(legend);
      expect(text).toContain('1,000');   // 1000 >= 500, shown
      expect(text).toContain('750');     // 750 >= 500, shown
      expect(text).not.toContain('250'); // 250 < 500, hidden
    });

    it('applies a percentage threshold per item', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': '20%' });
      const text = renderedText(legend);
      expect(text).toContain('1,000');   // 50%, shown
      expect(text).toContain('750');     // 37.5%, shown
      expect(text).not.toContain('250'); // 12.5%, hidden
    });

    it('still honours plain true and false', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': 'true' });
      expect(renderedText(legend)).toContain('1,000');

      legend = await fixture<ChartLegend>('dc-legend', { 'show-value': 'false' });
      expect(renderedText(legend)).not.toContain('1,000');
    });

    // The case the review named: markup that reads as "off" used to mean on.
    it('treats off/no/none as off rather than as on', async () => {
      for (const off of ['off', 'no', 'none', 'hidden']) {
        legend = await fixture<ChartLegend>('dc-legend', { 'show-value': off });
        expect(renderedText(legend), off).not.toContain('1,000');
      }
    });

    it('resolves show-label per item too', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-label': '500' });
      const text = renderedText(legend);
      expect(text).toContain('Revenue');
      expect(text).toContain('Expenses');
      expect(text).not.toContain('Profit');
    });

    // A line has no value, so there is nothing for a threshold to compare and
    // it must not be silently dropped from the legend.
    it('never hides a dimensionless item behind a threshold', async () => {
      legend = await fixture<ChartLegend>('dc-legend', { 'show-label': '10000' });
      expect(renderedText(legend, mixedItems)).toContain('Trend Line');
    });
  });
});
