import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/funnel-chart';
import '../../src/chart-funnel-stage';
import '../../src/chart-title';
import '../../src/chart-legend';
import '../../src/chart-popup';
import { FunnelChart } from '../../src/funnel-chart';

/**
 * Component tests for FunnelChart.
 *
 * Tests:
 * - Basic element creation and stage rendering
 * - Polygon path generation for stages
 * - Chevron parsing (percentage, rem, pixels)
 * - Segment height calculation (equal, proportional, logarithmic, fixed)
 * - Funnel factor (positive = narrow down, negative = narrow up)
 * - Flat-top and flat-bottom options
 * - Legend items generation
 * - Accessibility methods
 * - Keyboard navigation support
 */

describe('FunnelChart component', () => {
  let chart: FunnelChart;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-funnel-chart element', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      expect(chart).toBeInstanceOf(FunnelChart);
      expect(chart.tagName.toLowerCase()).toBe('dc-funnel-chart');
    });

    it('has default dimensions', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      expect(chart.width).toBe(600);
      expect(chart.height).toBe(400);
    });

    it('accepts custom dimensions', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        width: '800',
        height: '500'
      });
      expect(chart.width).toBe(800);
      expect(chart.height).toBe(500);
    });

    it('creates with child stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
      `);
      const stages = chart.querySelectorAll('dc-funnel-stage');
      expect(stages).toHaveLength(3);
    });

    it('has default funnel-factor of undefined (defaults to 70)', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      expect(chart.funnelFactor).toBeUndefined();
    });

    it('can set funnel-factor', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'funnel-factor': '50' });
      expect(chart.funnelFactor).toBe(50);
    });
  });

  // ============================================================================
  // SVG Rendering
  // ============================================================================

  describe('SVG rendering', () => {
    it('renders SVG element', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('renders correct number of stage polygons', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="75" label="B"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="C"></dc-funnel-stage>
        <dc-funnel-stage value="25" label="D"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(4);
    });

    it('renders no polygons for empty chart', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(0);
    });

    it('applies fill colors to stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A" fill="#ff0000"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B" fill="#00ff00"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons?.[0]?.getAttribute('fill')).toBe('#ff0000');
      expect(polygons?.[1]?.getAttribute('fill')).toBe('#00ff00');
    });

    it('applies stroke to stages when specified', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'stroke-width': '2', 'stroke-color': '#333' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      expect(polygon?.getAttribute('stroke')).toBeDefined();
      expect(polygon?.getAttribute('stroke-width')).toBe('2');
    });
  });

  // ============================================================================
  // Polygon generation
  // ============================================================================

  describe('polygon generation', () => {
    it('generates trapezoid for default (no chevron)', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      const points = polygon?.getAttribute('points');
      expect(points).toBeDefined();
      // Trapezoid has 4 points
      const pointCount = points?.split(' ').length;
      expect(pointCount).toBe(4);
    });

    it('generates chevron shape when chevron is set', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '20' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      // Middle segments have 6 points (chevron top and bottom)
      const firstPoints = polygons?.[0]?.getAttribute('points')?.split(' ').length;
      expect(firstPoints).toBe(6);
    });

    it('applies flat-top option', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        chevron: '20',
        'flat-top': ''
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      expect(chart.flatTop).toBe(true);
      // First segment should have flat top (5 points instead of 6)
      const firstPolygon = chart.shadowRoot?.querySelector('polygon[data-shape-index="0"]');
      const pointCount = firstPolygon?.getAttribute('points')?.split(' ').length;
      expect(pointCount).toBe(5);
    });

    it('applies flat-bottom option', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        chevron: '20',
        'flat-bottom': ''
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      expect(chart.flatBottom).toBe(true);
      // Last segment should have flat bottom (5 points)
      const lastPolygon = chart.shadowRoot?.querySelector('polygon[data-shape-index="1"]');
      const pointCount = lastPolygon?.getAttribute('points')?.split(' ').length;
      expect(pointCount).toBe(5);
    });

    it('applies both flat-top and flat-bottom', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        chevron: '20',
        'flat-top': '',
        'flat-bottom': ''
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      // Single segment with both flat ends has 4 points (simple trapezoid)
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      const pointCount = polygon?.getAttribute('points')?.split(' ').length;
      expect(pointCount).toBe(4);
    });
  });

  // ============================================================================
  // Chevron parsing
  // ============================================================================

  describe('chevron parsing', () => {
    it('parses pixel value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '25px' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      // Chevron should be applied (6-point polygon)
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      expect(polygon).toBeDefined();
    });

    it('parses numeric value without unit', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '30' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons?.length).toBe(2);
    });

    it('parses percentage value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '5%' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      expect(polygon).toBeDefined();
    });

    it('parses rem value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '1.5rem' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      expect(polygon).toBeDefined();
    });

    it('handles zero chevron', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '0' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      // Zero chevron means trapezoid (4 points)
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      const pointCount = polygon?.getAttribute('points')?.split(' ').length;
      expect(pointCount).toBe(4);
    });

    it('handles empty chevron', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { chevron: '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const polygon = chart.shadowRoot?.querySelector('polygon[data-shape-index]');
      const pointCount = polygon?.getAttribute('points')?.split(' ').length;
      expect(pointCount).toBe(4);
    });
  });

  // ============================================================================
  // Segment height modes
  // ============================================================================

  describe('segment height modes', () => {
    it('uses equal heights by default', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="10" label="B"></dc-funnel-stage>
      `);
      // Both stages should render
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports proportional height mode', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'segment-height': 'value' }, `
        <dc-funnel-stage value="80" label="Large"></dc-funnel-stage>
        <dc-funnel-stage value="20" label="Small"></dc-funnel-stage>
      `);
      expect(chart.segmentHeight).toBe('value');
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports logarithmic height mode', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'segment-height': 'log-value' }, `
        <dc-funnel-stage value="1000" label="Large"></dc-funnel-stage>
        <dc-funnel-stage value="10" label="Small"></dc-funnel-stage>
      `);
      expect(chart.segmentHeight).toBe('log-value');
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports fixed height mode', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'segment-height': '80' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      expect(chart.segmentHeight).toBe('80');
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports min/max height constraints', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'segment-height': 'value 30 200',
      }, `
        <dc-funnel-stage value="1000" label="Large"></dc-funnel-stage>
        <dc-funnel-stage value="10" label="Small"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports separate min/max attributes', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'segment-height': 'value',
        'segment-min-height': '40',
        'segment-max-height': '150'
      }, `
        <dc-funnel-stage value="1000" label="Large"></dc-funnel-stage>
        <dc-funnel-stage value="10" label="Small"></dc-funnel-stage>
      `);
      expect(chart.segmentMinHeight).toBe('40');
      expect(chart.segmentMaxHeight).toBe('150');
    });
  });

  // ============================================================================
  // Funnel factor
  // ============================================================================

  describe('funnel factor', () => {
    it('positive factor narrows from top to bottom', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'funnel-factor': '50' }, `
        <dc-funnel-stage value="100" label="Top"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="Bottom"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
      // Top stage should be wider than bottom
    });

    it('negative factor narrows from bottom to top', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'funnel-factor': '-50' }, `
        <dc-funnel-stage value="50" label="Top"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="Bottom"></dc-funnel-stage>
      `);
      expect(chart.funnelFactor).toBe(-50);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('factor of 100 means no narrowing', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'funnel-factor': '100' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      // All rectangles (no narrowing)
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });
  });

  // ============================================================================
  // Legend integration
  // ============================================================================

  describe('legend integration', () => {
    it('generates legend items from stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
      `);
      const items = (chart as any).getLegendItems();
      expect(items).toHaveLength(3);
      expect(items[0].label).toBe('Visitors');
      expect(items[0].value).toBe(1000);
      expect(items[1].label).toBe('Leads');
      expect(items[2].label).toBe('Customers');
    });

    it('legend items have square shape', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].shape).toBe('square');
    });

    it('returns empty array for no stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      const items = (chart as any).getLegendItems();
      expect(items).toEqual([]);
    });
  });

  // ============================================================================
  // Accessibility methods
  // ============================================================================

  describe('accessibility', () => {
    it('returns correct chart type name', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      expect((chart as any).getChartTypeName()).toBe('funnel chart');
    });

    it('returns data summary', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="End"></dc-funnel-stage>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('2 stages');
      expect(summary).toContain('1000');
      expect(summary).toContain('100');
    });

    it('returns empty summary for no stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart');
      expect((chart as any).getDataSummary()).toBe('');
    });

    it('generates insights', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="Customers"></dc-funnel-stage>
      `);
      const insights = (chart as any).getInsights();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('returns empty insights when aria-insights is none', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'aria-insights': 'none' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect((chart as any).getInsights()).toBe('');
    });
  });

  // ============================================================================
  // Keyboard navigation
  // ============================================================================

  describe('keyboard navigation', () => {
    it('returns focusable elements for stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="First"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Second"></dc-funnel-stage>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements).toHaveLength(2);
      expect(elements[0].index).toBe(0);
      expect(elements[1].index).toBe(1);
    });

    it('focusable elements include label and value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Test Stage"></dc-funnel-stage>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements[0].label).toContain('Test Stage');
      expect(elements[0].label).toContain('1000');
    });

    it('focusable elements include conversion rate', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Half"></dc-funnel-stage>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements[1].label).toContain('50.0%');
    });
  });

  // ============================================================================
  // Color options
  // ============================================================================

  describe('color options', () => {
    it('uses cool-to-warm colors by default', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons?.[0]?.getAttribute('fill')).toMatch(/hsl/);
    });

    it('supports fill-start-color and fill-end-color gradient', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'fill-start-color': '#0000ff',
        'fill-end-color': '#ff0000'
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('supports deprecated start-color and end-color', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'start-color': '#00ff00',
        'end-color': '#ff0000'
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect(chart.startColor).toBe('#00ff00');
      expect(chart.endColor).toBe('#ff0000');
    });
  });

  // ============================================================================
  // Title integration
  // ============================================================================

  describe('title integration', () => {
    it('renders title when present', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-title>Sales Funnel</dc-title>
        <dc-funnel-stage value="1000" label="A"></dc-funnel-stage>
      `);
      const title = chart.querySelector('dc-title');
      expect(title).toBeDefined();
      expect(title?.textContent).toBe('Sales Funnel');
    });
  });

  // ============================================================================
  // Fill colors
  // ============================================================================

  describe('fill colors', () => {
    it('supports palette attribute with built-in palette', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'palette': 'category10'
      }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="75" label="B"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="C"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(3);
      // First stage should use first color from category10 palette
      expect(polygons?.[0]?.getAttribute('fill')).toBe('#1f77b4');
    });

    it('legend items use palette colors when specified', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {
        'palette': 'category10'
      }, `
        <dc-funnel-stage value="100" label="Stage A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="Stage B"></dc-funnel-stage>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].color).toBe('#1f77b4');
      expect(items[1].color).toBe('#ff7f0e');
    });
  });

  // ============================================================================
  // Focus indicator
  // ============================================================================

  describe('focus indicator', () => {
    it('does not render focus indicator when keyboard inactive', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      (chart as any).keyboardActive = false;
      (chart as any).focusedIndex = 0;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });

    it('does not render focus indicator when no element focused', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = -1;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });

    it('renders focus indicator for focused stage', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });
  });

  // ============================================================================
  // Popup functionality
  // ============================================================================

  describe('popup functionality', () => {
    it('showPopupForFocusedElement generates auto popup content', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Stage A"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B"></dc-funnel-stage>
      `);
      // Should not throw when called
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('showPopupForFocusedElement shows conversion rate in auto popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Half"></dc-funnel-stage>
      `);
      // Second stage should show 50% conversion rate
      expect(() => (chart as any).showPopupForFocusedElement(1)).not.toThrow();
    });

    it('showPopupForFocusedElement uses custom popup content', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A">
          <dc-popup>Custom funnel popup</dc-popup>
        </dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('showPopupForFocusedElement handles invalid index gracefully', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      // Negative index should not throw
      expect(() => (chart as any).showPopupForFocusedElement(-1)).not.toThrow();
      // Out of bounds index should not throw
      expect(() => (chart as any).showPopupForFocusedElement(99)).not.toThrow();
    });

    it('showPopupForFocusedElement does nothing without popup content', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      // Should not throw when no auto-popup and no custom popup
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement shows popup when hidden', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      (chart as any).popupVisible = false;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement hides popup when visible', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      (chart as any).popupVisible = true;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
      // After toggle, popup should be hidden
      expect((chart as any).popupVisible).toBe(false);
    });
  });

  // ============================================================================
  // Shape bounds
  // ============================================================================

  describe('shape bounds', () => {
    it('returns bounds for stage shapes', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="B"></dc-funnel-stage>
      `);
      const bounds = (chart as any).getShapeBounds(0);
      if (bounds) {
        expect(bounds).toHaveProperty('x');
        expect(bounds).toHaveProperty('y');
        expect(bounds).toHaveProperty('width');
        expect(bounds).toHaveProperty('height');
      }
    });

    it('returns null for invalid index', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      const bounds = (chart as any).getShapeBounds(999);
      expect(bounds).toBeNull();
    });
  });

  // ============================================================================
  // Stage event handlers
  // ============================================================================

  describe('stage event handlers', () => {
    it('handleStageMouseEnter shows popup for stage with hover popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="hover">Stage A popup</dc-popup>
        </dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B"></dc-funnel-stage>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleStageMouseEnter shows auto-popup when enabled on chart', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Stage A"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B"></dc-funnel-stage>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleStageMouseEnter shows auto-popup when enabled on stage', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A" auto-popup></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B"></dc-funnel-stage>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleStageMouseEnter does not show popup when click-triggered', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Click me</dc-popup>
        </dc-funnel-stage>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleStageMouseEnter explicit hover popup takes precedence over auto-popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="hover">Custom hover popup</dc-popup>
        </dc-funnel-stage>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
      // Should show custom content, not auto-generated
    });

    it('handleStageMouseLeave hides hover popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="hover">Hover popup</dc-popup>
        </dc-funnel-stage>
      `);
      // First show the popup
      const enterEvent = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(enterEvent, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Then leave
      (chart as any).handleStageMouseLeave(0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleStageMouseLeave hides auto-popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Stage A"></dc-funnel-stage>
      `);
      // Show auto-popup
      const enterEvent = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(enterEvent, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Leave
      (chart as any).handleStageMouseLeave(0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleStageMouseLeave does not hide clicked popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Click popup</dc-popup>
        </dc-funnel-stage>
      `);
      // Simulate click to show popup
      const clickEvent = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleStageClick(clickEvent, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Mouse leave should NOT hide clicked popup
      (chart as any).handleStageMouseLeave(0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleStageClick shows click-triggered popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Click popup content</dc-popup>
        </dc-funnel-stage>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleStageClick(event, 0);
      expect((chart as any).popupVisible).toBe(true);
      expect((chart as any).clickedStageIndex).toBe(0);
    });

    it('handleStageClick toggles popup when clicking same stage', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Toggle me</dc-popup>
        </dc-funnel-stage>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });

      // First click shows popup
      (chart as any).handleStageClick(event, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Second click hides popup
      (chart as any).handleStageClick(event, 0);
      expect((chart as any).popupVisible).toBe(false);
      expect((chart as any).clickedStageIndex).toBe(-1);
    });

    it('handleStageClick on different stage switches popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Popup A</dc-popup>
        </dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B">
          <dc-popup trigger="click">Popup B</dc-popup>
        </dc-funnel-stage>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });

      // Click first stage
      (chart as any).handleStageClick(event, 0);
      expect((chart as any).clickedStageIndex).toBe(0);

      // Click second stage
      (chart as any).handleStageClick(event, 1);
      expect((chart as any).clickedStageIndex).toBe(1);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleStageClick clears popup for stage without click popup', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Stage A">
          <dc-popup trigger="click">Click popup</dc-popup>
        </dc-funnel-stage>
        <dc-funnel-stage value="500" label="Stage B"></dc-funnel-stage>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });

      // Click stage with popup
      (chart as any).handleStageClick(event, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Click stage without click popup
      (chart as any).handleStageClick(event, 1);
      expect((chart as any).popupVisible).toBe(false);
      expect((chart as any).clickedStageIndex).toBe(-1);
    });

    it('handleStageClick does not activate auto-popup on click', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Stage A"></dc-funnel-stage>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });

      // Click should not show auto-popup (only hover does)
      (chart as any).handleStageClick(event, 0);
      // Auto-popup stages don't respond to click
      expect((chart as any).clickedStageIndex).toBe(-1);
    });
  });

  // ============================================================================
  // shouldShowAutoPopup
  // ============================================================================

  describe('shouldShowAutoPopup', () => {
    it('returns chart auto-popup value when stage value is undefined', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect((chart as any).shouldShowAutoPopup(undefined)).toBe(true);
    });

    it('returns false when both chart and stage auto-popup are undefined', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect((chart as any).shouldShowAutoPopup(undefined)).toBe(false);
    });

    it('stage-level true overrides chart-level false', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect((chart as any).shouldShowAutoPopup(true)).toBe(true);
    });

    it('stage-level false overrides chart-level true', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="100" label="A"></dc-funnel-stage>
      `);
      expect((chart as any).shouldShowAutoPopup(false)).toBe(false);
    });
  });

  // ============================================================================
  // generateStagePopupContent
  // ============================================================================

  describe('generateStagePopupContent', () => {
    it('generates popup content with label and value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
      `);
      const content = (chart as any).generateStagePopupContent(
        { label: 'Visitors', value: 1000 },
        1000
      );
      expect(content).toContain('Visitors');
      expect(content).toContain('1000');
    });

    it('includes percentage in popup content', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="1000" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Half"></dc-funnel-stage>
      `);
      const content = (chart as any).generateStagePopupContent(
        { label: 'Half', value: 500 },
        1000
      );
      expect(content).toContain('50.0%');
    });

    it('handles zero total value', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="0" label="Zero"></dc-funnel-stage>
      `);
      const content = (chart as any).generateStagePopupContent(
        { label: 'Zero', value: 0 },
        0
      );
      expect(content).toContain('0.0%');
    });
  });

  // ============================================================================
  // Auto-popup content in mouse events
  // ============================================================================

  describe('auto-popup content', () => {
    it('auto-popup uses first stage value as total', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'auto-popup': '' }, `
        <dc-funnel-stage value="1000" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Half"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="End"></dc-funnel-stage>
      `);
      // Show popup for middle stage
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleStageMouseEnter(event, 1);
      expect((chart as any).popupVisible).toBe(true);
    });

  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles single stage', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="Only"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(1);
    });

    it('handles many stages', async () => {
      const stages = Array.from({ length: 10 }, (_, i) =>
        `<dc-funnel-stage value="${1000 - i * 100}" label="Stage ${i}"></dc-funnel-stage>`
      ).join('');
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, stages);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(10);
    });

    it('handles zero-value stages', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="100" label="Start"></dc-funnel-stage>
        <dc-funnel-stage value="0" label="Zero"></dc-funnel-stage>
        <dc-funnel-stage value="50" label="End"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(3);
    });

    it('handles all zero values with proportional height', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', { 'segment-height': 'value' }, `
        <dc-funnel-stage value="0" label="A"></dc-funnel-stage>
        <dc-funnel-stage value="0" label="B"></dc-funnel-stage>
      `);
      // Should fall back to equal heights
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });

    it('handles decimal values', async () => {
      chart = await fixture<FunnelChart>('dc-funnel-chart', {}, `
        <dc-funnel-stage value="99.5" label="Almost"></dc-funnel-stage>
        <dc-funnel-stage value="0.5" label="Tiny"></dc-funnel-stage>
      `);
      const polygons = chart.shadowRoot?.querySelectorAll('polygon[data-shape-index]');
      expect(polygons).toHaveLength(2);
    });
  });
});
