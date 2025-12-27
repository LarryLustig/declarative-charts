import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';

// Import component to register custom element
import '../../src/chart-title';
import { ChartTitle } from '../../src/chart-title';

/**
 * Component tests for ChartTitle.
 *
 * Tests DOM-dependent methods:
 * - text getter - uses textContent
 * - getDimensions() - uses measureText() which creates canvas
 * - generateSvg() - generates SVG template for rendering
 *
 * Unit tests already cover:
 * - SVG_TEXT_STYLE_ATTRS constant
 * - HTML_TO_SVG_WARNINGS constant
 * - getSvgStyleAttributes()
 * - getStyleWarnings()
 * - getFontSize()
 */

describe('ChartTitle component', () => {
  let title: ChartTitle;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-title element', async () => {
      title = await fixture<ChartTitle>('dc-title');
      expect(title).toBeInstanceOf(ChartTitle);
      expect(title.tagName.toLowerCase()).toBe('dc-title');
    });

    it('creates with text content', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'My Chart Title');
      expect(title.textContent).toBe('My Chart Title');
    });

    it('creates with attributes', async () => {
      title = await fixture<ChartTitle>('dc-title', {
        position: 'top-left',
        fill: '#1a1a1a',
        'font-size': '24',
      }, 'Styled Title');
      expect(title.position).toBe('top-left');
      expect(title.getAttribute('fill')).toBe('#1a1a1a');
      expect(title.getAttribute('font-size')).toBe('24');
    });
  });

  // ============================================================================
  // text getter
  // ============================================================================

  describe('text getter', () => {
    it('returns empty string for empty element', async () => {
      title = await fixture<ChartTitle>('dc-title');
      expect(title.text).toBe('');
    });

    it('returns text content', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Chart Title');
      expect(title.text).toBe('Chart Title');
    });

    it('trims whitespace', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, '  Trimmed Title  ');
      expect(title.text).toBe('Trimmed Title');
    });

    it('handles multiline text', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, '\n  Line One\n  Line Two\n  ');
      expect(title.text).toBe('Line One\n  Line Two');
    });

    it('returns empty string for whitespace-only content', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, '   \n\t   ');
      expect(title.text).toBe('');
    });
  });

  // ============================================================================
  // getDimensions()
  // ============================================================================

  describe('getDimensions', () => {
    it('returns zero dimensions for empty title', async () => {
      title = await fixture<ChartTitle>('dc-title');
      const dims = title.getDimensions();
      expect(dims.width).toBe(0);
      expect(dims.height).toBe(0);
    });

    it('returns positive dimensions for text', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Sample Title');
      const dims = title.getDimensions();
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('width increases with longer text', async () => {
      const shortTitle = await fixture<ChartTitle>('dc-title', {}, 'Short');
      const shortDims = shortTitle.getDimensions();

      const longTitle = await fixture<ChartTitle>('dc-title', {}, 'Much Longer Title Text');
      const longDims = longTitle.getDimensions();

      expect(longDims.width).toBeGreaterThan(shortDims.width);
    });

    it('height increases with larger font-size', async () => {
      const smallTitle = await fixture<ChartTitle>('dc-title', { 'font-size': '12' }, 'Title');
      const smallDims = smallTitle.getDimensions();

      const largeTitle = await fixture<ChartTitle>('dc-title', { 'font-size': '36' }, 'Title');
      const largeDims = largeTitle.getDimensions();

      expect(largeDims.height).toBeGreaterThan(smallDims.height);
    });

    it('width scales with font-size', async () => {
      const smallTitle = await fixture<ChartTitle>('dc-title', { 'font-size': '12' }, 'Title');
      const smallDims = smallTitle.getDimensions();

      const largeTitle = await fixture<ChartTitle>('dc-title', { 'font-size': '24' }, 'Title');
      const largeDims = largeTitle.getDimensions();

      // Width should roughly double with double font size
      expect(largeDims.width).toBeGreaterThan(smallDims.width * 1.5);
    });

    it('uses default font size when not specified', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Default Size');
      const dims = title.getDimensions();
      // Default font size is 20, height should be fontSize * 1.2
      expect(dims.height).toBeCloseTo(20 * 1.2, 0);
    });
  });

  // ============================================================================
  // generateSvg()
  // ============================================================================

  describe('generateSvg', () => {
    it('returns empty SVG for empty title', async () => {
      title = await fixture<ChartTitle>('dc-title');
      const result = title.generateSvg();
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('returns SVG template for text', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Chart Title');
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).toBeDefined();
    });

    it('dimensions match getDimensions', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Matching Title');
      const dims = title.getDimensions();
      const svgResult = title.generateSvg();

      expect(svgResult.width).toBe(dims.width);
      expect(svgResult.height).toBe(dims.height);
    });

    it('accepts text-anchor "start"', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Left Aligned');
      const result = title.generateSvg('start');
      expect(result.svg).toBeDefined();
    });

    it('accepts text-anchor "middle" (default)', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Centered');
      const result = title.generateSvg('middle');
      expect(result.svg).toBeDefined();
    });

    it('accepts text-anchor "end"', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Right Aligned');
      const result = title.generateSvg('end');
      expect(result.svg).toBeDefined();
    });

    it('defaults to text-anchor "middle"', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Default Anchor');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });
  });

  // ============================================================================
  // generateSvg() with styles
  // ============================================================================

  describe('generateSvg with styles', () => {
    it('applies fill attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { fill: '#ff0000' }, 'Red Title');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies font-size attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'font-size': '30' }, 'Large Title');
      const result = title.generateSvg();
      expect(result.height).toBeCloseTo(30 * 1.2, 0);
    });

    it('applies font-family attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'font-family': 'Georgia, serif' }, 'Serif Title');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies font-weight attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'font-weight': 'normal' }, 'Normal Weight');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies font-style attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'font-style': 'italic' }, 'Italic Title');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies text-decoration attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'text-decoration': 'underline' }, 'Underlined');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies letter-spacing attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { 'letter-spacing': '2' }, 'Spaced');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies opacity attribute', async () => {
      title = await fixture<ChartTitle>('dc-title', { opacity: '0.5' }, 'Faded Title');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
    });

    it('applies multiple style attributes', async () => {
      title = await fixture<ChartTitle>('dc-title', {
        fill: '#1a1a1a',
        'font-size': '24',
        'font-family': 'Arial',
        'font-weight': 'bold',
        'font-style': 'italic',
      }, 'Fully Styled');
      const result = title.generateSvg();
      expect(result.svg).toBeDefined();
      expect(result.height).toBeCloseTo(24 * 1.2, 0);
    });
  });

  // ============================================================================
  // position attribute
  // ============================================================================

  describe('position attribute', () => {
    it('defaults to "top"', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Default Position');
      expect(title.position).toBe('top');
    });

    it('can be set to "top"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'top' }, 'Top');
      expect(title.position).toBe('top');
    });

    it('can be set to "top-left"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'top-left' }, 'Top Left');
      expect(title.position).toBe('top-left');
    });

    it('can be set to "top-right"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'top-right' }, 'Top Right');
      expect(title.position).toBe('top-right');
    });

    it('can be set to "bottom"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'bottom' }, 'Bottom');
      expect(title.position).toBe('bottom');
    });

    it('can be set to "bottom-left"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'bottom-left' }, 'Bottom Left');
      expect(title.position).toBe('bottom-left');
    });

    it('can be set to "bottom-right"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'bottom-right' }, 'Bottom Right');
      expect(title.position).toBe('bottom-right');
    });

    it('can be set to "left"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'left' }, 'Left');
      expect(title.position).toBe('left');
    });

    it('can be set to "right"', async () => {
      title = await fixture<ChartTitle>('dc-title', { position: 'right' }, 'Right');
      expect(title.position).toBe('right');
    });
  });

  // ============================================================================
  // Integration: position doesn't affect generateSvg output
  // ============================================================================

  describe('position independence', () => {
    it('generateSvg output is same for all positions', async () => {
      const positions = ['top', 'top-left', 'bottom', 'left', 'right'];
      const results: Array<{ width: number; height: number }> = [];

      for (const pos of positions) {
        title = await fixture<ChartTitle>('dc-title', { position: pos }, 'Same Text');
        results.push(title.generateSvg());
      }

      // All should have same dimensions since position is handled by parent
      const first = results[0];
      for (const result of results) {
        expect(result.width).toBe(first.width);
        expect(result.height).toBe(first.height);
      }
    });
  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles special characters', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Price: $100 (50% off!)');
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
    });

    it('handles unicode characters', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'Revenue: €1,234 📈');
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
    });

    it('handles very long text', async () => {
      const longText = 'A'.repeat(100);
      title = await fixture<ChartTitle>('dc-title', {}, longText);
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
    });

    it('handles single character', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, 'X');
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('handles numeric content', async () => {
      title = await fixture<ChartTitle>('dc-title', {}, '12345');
      const result = title.generateSvg();
      expect(result.width).toBeGreaterThan(0);
    });
  });
});
