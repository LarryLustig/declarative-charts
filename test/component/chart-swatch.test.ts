import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/chart-swatch';
import '../../src/chart-palette';
import '../../src/chart-fill';
import { ChartSwatch, STANDARD_SHAPES } from '../../src/chart-swatch';
import { ChartPalette } from '../../src/chart-palette';

/**
 * Component tests for ChartSwatch.
 *
 * Tests DOM-dependent methods:
 * - getPalette() - uses document.getElementById to find palette
 * - resolveColors() - uses palette lookup for colors
 * - render() - renders SVG shapes or unicode characters
 * - renderShape() static method - generates SVG for all shape types
 *
 * Unit tests already cover:
 * - STANDARD_SHAPES constant
 * - Property defaults
 */

describe('ChartSwatch component', () => {
  let swatch: ChartSwatch;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-swatch element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch');
      expect(swatch).toBeInstanceOf(ChartSwatch);
      expect(swatch.tagName.toLowerCase()).toBe('dc-swatch');
    });

    it('creates with default shape (circle)', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch');
      expect(swatch.shape).toBe('circle');
    });

    it('creates with default size (16)', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch');
      expect(swatch.size).toBe(16);
    });

    it('creates with custom attributes', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'square',
        size: '24',
        fill: '#ff0000',
      });
      expect(swatch.shape).toBe('square');
      expect(swatch.size).toBe(24);
      expect(swatch.fill).toBe('#ff0000');
    });
  });

  // ============================================================================
  // Palette lookup
  // ============================================================================

  describe('palette lookup', () => {
    it('resolves colors from palette by label', async () => {
      // Create palette first
      const palette = await fixture<ChartPalette>(
        'dc-palette',
        { id: 'test-palette' },
        '<dc-fill label="Revenue" fill="#2563eb" stroke="#1d4ed8"></dc-fill>'
      );

      // Create swatch referencing palette
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'test-palette',
        label: 'Revenue',
      });

      // Render and check
      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('resolves colors from palette by value', async () => {
      await fixture<ChartPalette>(
        'dc-palette',
        { id: 'threshold-palette' },
        `
        <dc-fill max-value="50" fill="#22c55e"></dc-fill>
        <dc-fill min-value="50" fill="#ef4444"></dc-fill>
        `
      );

      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'threshold-palette',
        value: '25',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('uses fallback color when palette not found', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'nonexistent-palette',
        label: 'Test',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg).not.toBeNull();
      // Should render with fallback color (#888)
    });

    it('uses fallback color when no palette specified', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        label: 'Test',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('explicit fill overrides palette lookup', async () => {
      await fixture<ChartPalette>(
        'dc-palette',
        { id: 'override-palette' },
        '<dc-fill label="Item" fill="#000000"></dc-fill>'
      );

      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'override-palette',
        label: 'Item',
        fill: '#ff0000', // Override
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#ff0000');
    });

    it('explicit stroke overrides palette lookup', async () => {
      await fixture<ChartPalette>(
        'dc-palette',
        { id: 'stroke-palette' },
        '<dc-fill label="Item" fill="#000" stroke="#fff"></dc-fill>'
      );

      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'stroke-palette',
        label: 'Item',
        stroke: '#00ff00', // Override
      });

      await swatch.updateComplete;
      // When stroke is set, fill defaults to #888 if not also set
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe('#00ff00');
    });
  });

  // ============================================================================
  // Standard shapes rendering
  // ============================================================================

  describe('standard shapes rendering', () => {
    for (const shape of STANDARD_SHAPES) {
      it(`renders ${shape} shape`, async () => {
        swatch = await fixture<ChartSwatch>('dc-swatch', {
          shape,
          fill: '#3b82f6',
        });

        await swatch.updateComplete;
        const svg = swatch.shadowRoot?.querySelector('svg');
        expect(svg).not.toBeNull();
      });
    }

    it('renders circle with correct element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'circle',
        fill: '#ff0000',
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle).not.toBeNull();
      expect(circle?.getAttribute('fill')).toBe('#ff0000');
    });

    it('renders square with rect element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'square',
        fill: '#00ff00',
      });

      await swatch.updateComplete;
      const rect = swatch.shadowRoot?.querySelector('rect');
      expect(rect).not.toBeNull();
      expect(rect?.getAttribute('fill')).toBe('#00ff00');
    });

    it('renders rect with rect element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'rect',
        fill: '#0000ff',
      });

      await swatch.updateComplete;
      const rect = swatch.shadowRoot?.querySelector('rect');
      expect(rect).not.toBeNull();
    });

    it('renders line with line element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'line',
        fill: '#ff00ff',
      });

      await swatch.updateComplete;
      const line = swatch.shadowRoot?.querySelector('line');
      expect(line).not.toBeNull();
      expect(line?.getAttribute('stroke')).toBe('#ff00ff');
    });

    it('renders triangle with polygon element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'triangle',
        fill: '#ffff00',
      });

      await swatch.updateComplete;
      const polygon = swatch.shadowRoot?.querySelector('polygon');
      expect(polygon).not.toBeNull();
    });

    it('renders diamond with polygon element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'diamond',
        fill: '#00ffff',
      });

      await swatch.updateComplete;
      const polygon = swatch.shadowRoot?.querySelector('polygon');
      expect(polygon).not.toBeNull();
    });

    it('renders star with polygon element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'star',
        fill: '#ff8800',
      });

      await swatch.updateComplete;
      const polygon = swatch.shadowRoot?.querySelector('polygon');
      expect(polygon).not.toBeNull();
    });

    it('renders cross with path element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'cross',
        fill: '#8800ff',
      });

      await swatch.updateComplete;
      const path = swatch.shadowRoot?.querySelector('path');
      expect(path).not.toBeNull();
    });

    it('renders plus with path element', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'plus',
        fill: '#008800',
      });

      await swatch.updateComplete;
      const path = swatch.shadowRoot?.querySelector('path');
      expect(path).not.toBeNull();
    });
  });

  // ============================================================================
  // Unicode/emoji shapes
  // ============================================================================

  describe('unicode shapes', () => {
    it('renders unicode character as span', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '★',
        fill: '#ffd700',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape');
      expect(span).not.toBeNull();
      expect(span?.textContent).toBe('★');
    });

    it('renders checkmark unicode', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '✓',
        fill: '#22c55e',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape');
      expect(span?.textContent).toBe('✓');
    });

    it('renders warning unicode', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '⚠',
        fill: '#f59e0b',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape');
      expect(span?.textContent).toBe('⚠');
    });

    it('renders emoji', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '📈',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape');
      expect(span?.textContent).toBe('📈');
    });

    it('applies size to unicode shape', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '★',
        size: '24',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape') as HTMLElement;
      expect(span?.style.fontSize).toBe('24px');
    });

    it('applies fill color to unicode shape', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: '●',
        fill: '#dc2626',
      });

      await swatch.updateComplete;
      const span = swatch.shadowRoot?.querySelector('.unicode-shape') as HTMLElement;
      // happy-dom may return hex or rgb format
      const color = span?.style.color;
      expect(color === '#dc2626' || color === 'rgb(220, 38, 38)').toBe(true);
    });
  });

  // ============================================================================
  // Size attribute
  // ============================================================================

  describe('size attribute', () => {
    it('applies size to SVG viewBox', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'circle',
        size: '32',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('32');
      expect(svg?.getAttribute('height')).toBe('32');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 32 32');
    });

    it('uses default size of 16', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', { shape: 'circle' });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('16');
      expect(svg?.getAttribute('height')).toBe('16');
    });

    it('handles small size', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'square',
        size: '8',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('8');
    });

    it('handles large size', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'star',
        size: '64',
      });

      await swatch.updateComplete;
      const svg = swatch.shadowRoot?.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('64');
    });
  });

  // ============================================================================
  // Stroke handling
  // ============================================================================

  describe('stroke handling', () => {
    it('applies stroke to circle', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'circle',
        fill: '#ffffff',
        stroke: '#000000',
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe('#000000');
    });

    it('applies stroke to square', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'square',
        fill: '#fee2e2',
        stroke: '#dc2626',
      });

      await swatch.updateComplete;
      const rect = swatch.shadowRoot?.querySelector('rect');
      expect(rect?.getAttribute('stroke')).toBe('#dc2626');
    });

    it('uses none for stroke when not specified', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'circle',
        fill: '#3b82f6',
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('stroke')).toBe('none');
    });
  });

  // ============================================================================
  // Static renderShape method
  // ============================================================================

  describe('static renderShape method', () => {
    it('returns SVG template for circle', () => {
      const result = ChartSwatch.renderShape('circle', 16, '#ff0000');
      expect(result).toBeDefined();
    });

    it('returns SVG template for square', () => {
      const result = ChartSwatch.renderShape('square', 16, '#00ff00');
      expect(result).toBeDefined();
    });

    it('returns SVG template for all standard shapes', () => {
      for (const shape of STANDARD_SHAPES) {
        const result = ChartSwatch.renderShape(shape, 16, '#0000ff');
        expect(result).toBeDefined();
      }
    });

    it('returns circle for unknown shape', () => {
      const result = ChartSwatch.renderShape('unknown', 16, '#888888');
      expect(result).toBeDefined();
    });

    it('handles different sizes', () => {
      const small = ChartSwatch.renderShape('circle', 8, '#ff0000');
      const large = ChartSwatch.renderShape('circle', 64, '#ff0000');
      expect(small).toBeDefined();
      expect(large).toBeDefined();
    });

    it('handles stroke parameter', () => {
      const withStroke = ChartSwatch.renderShape('circle', 16, '#ff0000', '#000000');
      expect(withStroke).toBeDefined();
    });
  });

  // ============================================================================
  // Case insensitivity
  // ============================================================================

  describe('case insensitivity', () => {
    it('handles uppercase shape names', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'CIRCLE',
        fill: '#ff0000',
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle).not.toBeNull();
    });

    it('handles mixed case shape names', async () => {
      swatch = await fixture<ChartSwatch>('dc-swatch', {
        shape: 'Triangle',
        fill: '#ff0000',
      });

      await swatch.updateComplete;
      const polygon = swatch.shadowRoot?.querySelector('polygon');
      expect(polygon).not.toBeNull();
    });
  });

  // ============================================================================
  // Integration with palette
  // ============================================================================

  describe('integration with palette', () => {
    it('uses palette fill and stroke together', async () => {
      await fixture<ChartPalette>(
        'dc-palette',
        { id: 'styled-palette' },
        '<dc-fill label="Alert" fill="#fee2e2" stroke="#dc2626"></dc-fill>'
      );

      swatch = await fixture<ChartSwatch>('dc-swatch', {
        palette: 'styled-palette',
        label: 'Alert',
        shape: 'circle',
      });

      await swatch.updateComplete;
      const circle = swatch.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#fee2e2');
      expect(circle?.getAttribute('stroke')).toBe('#dc2626');
    });

    it('uses palette for different shapes', async () => {
      await fixture<ChartPalette>(
        'dc-palette',
        { id: 'shape-palette' },
        '<dc-fill label="Data" fill="#3b82f6"></dc-fill>'
      );

      for (const shape of ['circle', 'square', 'diamond']) {
        swatch = await fixture<ChartSwatch>('dc-swatch', {
          palette: 'shape-palette',
          label: 'Data',
          shape,
        });

        await swatch.updateComplete;
        const svg = swatch.shadowRoot?.querySelector('svg');
        expect(svg).not.toBeNull();
      }
    });
  });
});
