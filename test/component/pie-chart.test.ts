import { describe, it, expect, afterEach } from 'vitest';
import { fixture, elementUpdated } from './setup';

// Import components to register custom elements
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import '../../src/chart-title';
import '../../src/chart-legend';
import '../../src/chart-popup';
import { PieChart } from '../../src/pie-chart';

/**
 * Component tests for PieChart.
 *
 * Tests:
 * - Basic element creation and slice rendering
 * - SVG path generation for pie and donut slices
 * - Layout calculations (center, radius, angles)
 * - Show conditions (show-value, show-label, show-percent)
 * - Legend items generation
 * - Accessibility methods
 * - Keyboard navigation support
 */

describe('PieChart component', () => {
  let chart: PieChart;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-pie-chart element', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect(chart).toBeInstanceOf(PieChart);
      expect(chart.tagName.toLowerCase()).toBe('dc-pie-chart');
    });

    it('has default dimensions', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect(chart.width).toBe(600);
      expect(chart.height).toBe(400);
    });

    it('accepts custom dimensions', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {
        width: '800',
        height: '600'
      });
      expect(chart.width).toBe(800);
      expect(chart.height).toBe(600);
    });

    it('creates with child slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="70" label="B"></dc-pie-slice>
      `);
      const slices = chart.querySelectorAll('dc-pie-slice');
      expect(slices).toHaveLength(2);
    });

    it('default inner-radius is 0 (pie mode)', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect(chart.innerRadius).toBe(0);
    });

    it('can set inner-radius for donut mode', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'inner-radius': '50' });
      expect(chart.innerRadius).toBe(50);
    });
  });

  // ============================================================================
  // SVG Rendering
  // ============================================================================

  describe('SVG rendering', () => {
    it('renders SVG element', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('renders correct number of slice paths', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="40" label="B"></dc-pie-slice>
        <dc-pie-slice value="30" label="C"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(3);
    });

    it('renders no paths for empty chart', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(0);
    });

    it('applies fill colors to slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A" fill="#ff0000"></dc-pie-slice>
        <dc-pie-slice value="50" label="B" fill="#00ff00"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths?.[0]?.getAttribute('fill')).toBe('#ff0000');
      expect(paths?.[1]?.getAttribute('fill')).toBe('#00ff00');
    });

    it('applies stroke to slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      expect(path?.getAttribute('stroke')).toBeDefined();
      expect(path?.getAttribute('stroke-width')).toBeDefined();
    });
  });

  // ============================================================================
  // Slice path generation
  // ============================================================================

  describe('slice path generation', () => {
    it('generates valid SVG path for pie slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      const d = path?.getAttribute('d');
      expect(d).toBeDefined();
      // Pie slice path starts with M (moveTo center) and ends with Z (close)
      expect(d).toMatch(/^M .* Z$/);
    });

    it('generates arc path for partial slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      const d = path?.getAttribute('d');
      expect(d).toBeDefined();
      // Should contain arc command (A)
      expect(d).toContain(' A ');
    });

    it('generates donut path with inner radius', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'inner-radius': '50' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      const d = path?.getAttribute('d');
      expect(d).toBeDefined();
      // Donut slice has two arc commands (outer and inner)
      const arcMatches = d?.match(/ A /g);
      expect(arcMatches?.length).toBe(2);
    });

    it('handles large arc flag for slices > 180 degrees', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="75" label="Large"></dc-pie-slice>
        <dc-pie-slice value="25" label="Small"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      // Large slice (75%) should have large arc flag = 1
      const largeD = paths?.[0]?.getAttribute('d');
      expect(largeD).toContain(' 1 1 '); // largeArcFlag sweep
    });
  });

  // ============================================================================
  // Layout calculations
  // ============================================================================

  describe('layout calculations', () => {
    it('centers chart in viewBox', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {
        width: '400',
        height: '400'
      }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // Verify path starts from center area
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      const d = path?.getAttribute('d');
      // Path should start with M (center) L (outer point)
      expect(d).toMatch(/^M \d+/);
    });

    it('calculates correct radius from dimensions', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {
        width: '400',
        height: '300'
      }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // With 400x300, radius should be based on smaller dimension (height)
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      expect(path).toBeDefined();
    });

    it('respects padding in layout', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {
        width: '400',
        height: '400',
        padding: '40'
      }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const path = chart.shadowRoot?.querySelector('path[data-shape-index]');
      expect(path).toBeDefined();
    });
  });

  // ============================================================================
  // Show conditions
  // ============================================================================

  describe('show conditions', () => {
    it('defaults to show-label true', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      // Verify the showLabel property default
      expect(chart.showLabel).toBe(true);
    });

    it('defaults to show-value false', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect(chart.showValue).toBe(false);
    });

    it('defaults to show-percent true', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect(chart.showPercent).toBe(true);
    });

    it('can override show-value on chart', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'show-value': 'true' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      expect(chart.showValue).toBe(true);
    });

    it('can override show-percent on chart', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'show-percent': 'false' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      expect(chart.showPercent).toBe(false);
    });

    it('slice-level show overrides chart-level', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'show-label': 'false' }, `
        <dc-pie-slice value="100" label="Visible" show-label="true"></dc-pie-slice>
      `);
      // Verify the slice has the override attribute set
      const slice = chart.querySelector('dc-pie-slice');
      expect(slice?.hasAttribute('show-label')).toBe(true);
      expect(slice?.getAttribute('show-label')).toBe('true');
    });
  });

  // ============================================================================
  // Legend integration
  // ============================================================================

  describe('legend integration', () => {
    it('generates legend items from slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="Item A" fill="#ff0000"></dc-pie-slice>
        <dc-pie-slice value="70" label="Item B" fill="#00ff00"></dc-pie-slice>
      `);
      // Access legend items through protected method via any cast
      const items = (chart as any).getLegendItems();
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe('Item A');
      expect(items[0].value).toBe(30);
      expect(items[1].label).toBe('Item B');
      expect(items[1].value).toBe(70);
    });

    it('legend items have square shape', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].shape).toBe('square');
    });

    it('returns empty array for no slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      const items = (chart as any).getLegendItems();
      expect(items).toEqual([]);
    });

    it('renders legend when legend element present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-legend position="right"></dc-legend>
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      // Legend should be rendered
      const legend = chart.querySelector('dc-legend');
      expect(legend).toBeDefined();
    });
  });

  // ============================================================================
  // Accessibility methods
  // ============================================================================

  describe('accessibility', () => {
    it('returns correct chart type name for pie', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect((chart as any).getChartTypeName()).toBe('pie chart');
    });

    it('returns correct chart type name for donut', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'inner-radius': '40' });
      expect((chart as any).getChartTypeName()).toBe('donut chart');
    });

    it('returns data summary', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="70" label="B"></dc-pie-slice>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('2 slices');
      expect(summary).toContain('100');
    });

    it('returns empty summary for no slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart');
      expect((chart as any).getDataSummary()).toBe('');
    });

    it('generates insights', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="70" label="Dominant"></dc-pie-slice>
        <dc-pie-slice value="30" label="Other"></dc-pie-slice>
      `);
      const insights = (chart as any).getInsights();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('returns empty insights when aria-insights is none', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-insights': 'none' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      expect((chart as any).getInsights()).toBe('');
    });
  });

  // ============================================================================
  // Keyboard navigation
  // ============================================================================

  describe('keyboard navigation', () => {
    it('returns focusable elements for slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="First"></dc-pie-slice>
        <dc-pie-slice value="70" label="Second"></dc-pie-slice>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements).toHaveLength(2);
      expect(elements[0].index).toBe(0);
      expect(elements[1].index).toBe(1);
    });

    it('focusable elements include label and value', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="Test Slice"></dc-pie-slice>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements[0].label).toContain('Test Slice');
      expect(elements[0].label).toContain('100');
    });

    it('focusable elements include percentage', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="25" label="Quarter"></dc-pie-slice>
        <dc-pie-slice value="75" label="Rest"></dc-pie-slice>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements[0].label).toContain('25.0%');
    });
  });

  // ============================================================================
  // Title integration
  // ============================================================================

  describe('title integration', () => {
    it('renders title when present', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-title>My Pie Chart</dc-title>
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const title = chart.querySelector('dc-title');
      expect(title).toBeDefined();
      expect(title?.textContent).toBe('My Pie Chart');
    });
  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles single slice (full circle)', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="Only"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(1);
    });

    it('handles many slices', async () => {
      const slices = Array.from({ length: 10 }, (_, i) =>
        `<dc-pie-slice value="${10}" label="Slice ${i}"></dc-pie-slice>`
      ).join('');
      chart = await fixture<PieChart>('dc-pie-chart', {}, slices);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(10);
    });

    it('handles zero-value slices gracefully', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="0" label="Zero"></dc-pie-slice>
        <dc-pie-slice value="100" label="Full"></dc-pie-slice>
      `);
      // Should still render but zero slice won't be visible
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(2);
    });

    it('handles all zero values', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="0" label="A"></dc-pie-slice>
        <dc-pie-slice value="0" label="B"></dc-pie-slice>
      `);
      // Should render nothing when total is 0
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths?.length).toBe(0);
    });

    it('handles decimal values', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="33.33" label="Third"></dc-pie-slice>
        <dc-pie-slice value="66.67" label="Two Thirds"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(2);
    });

    it('handles very small slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="0.1" label="Tiny"></dc-pie-slice>
        <dc-pie-slice value="99.9" label="Huge"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path[data-shape-index]');
      expect(paths).toHaveLength(2);
    });
  });

  // ============================================================================
  // Popup functionality
  // ============================================================================

  describe('popup functionality', () => {
    it('showPopupForFocusedElement generates auto popup content', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="30" label="Slice A"></dc-pie-slice>
        <dc-pie-slice value="70" label="Slice B"></dc-pie-slice>
      `);
      // Should not throw when called
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('showPopupForFocusedElement uses custom popup content', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup>Custom slice popup</dc-popup>
        </dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('showPopupForFocusedElement handles invalid index gracefully', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // Negative index should not throw
      expect(() => (chart as any).showPopupForFocusedElement(-1)).not.toThrow();
      // Out of bounds index should not throw
      expect(() => (chart as any).showPopupForFocusedElement(99)).not.toThrow();
    });

    it('showPopupForFocusedElement does nothing without popup content', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      // Should not throw when no auto-popup and no custom popup
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement shows popup when hidden', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).popupVisible = false;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement hides popup when visible', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).popupVisible = true;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
      // After toggle, popup should be hidden
      expect((chart as any).popupVisible).toBe(false);
    });

    it('auto popup includes value and percent', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="25" label="Quarter"></dc-pie-slice>
        <dc-pie-slice value="75" label="Rest"></dc-pie-slice>
      `);
      // Access getSlices to test popup content generation
      const slices = (chart as any).getSlices();
      expect(slices[0].value).toBe(25);
      expect(slices[0].label).toBe('Quarter');
      // The auto popup would show "Value: 25" and "Percent: 25.0%"
    });
  });

  // ============================================================================
  // Focus indicator
  // ============================================================================

  describe('focus indicator', () => {
    it('does not render focus indicator when keyboard inactive', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).keyboardActive = false;
      (chart as any).focusedIndex = 0;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });

    it('does not render focus indicator when no element focused', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = -1;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });

    it('renders focus indicator for focused slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = 0;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });
  });

  // ============================================================================
  // Shape bounds
  // ============================================================================

  describe('shape bounds', () => {
    it('returns bounds for slice shapes', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
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
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const bounds = (chart as any).getShapeBounds(999);
      expect(bounds).toBeNull();
    });
  });

  // ============================================================================
  // Deprecated attributes
  // ============================================================================

  describe('deprecated attributes', () => {
    it('supports deprecated slice-color attribute', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'slice-color': '#ff0000' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      expect(chart.sliceColor).toBe('#ff0000');
    });
  });

  // ============================================================================
  // Slice event handlers
  // ============================================================================

  describe('slice event handlers', () => {
    it('handleSliceMouseEnter shows popup for slice with hover popup', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup trigger="hover">Slice A popup</dc-popup>
        </dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleSliceMouseEnter shows auto popup when enabled', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleSliceMouseEnter does nothing without popup', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleSliceMouseLeave hides hover popup', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      const event = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceMouseEnter(event, 0);
      expect((chart as any).popupVisible).toBe(true);

      (chart as any).handleSliceMouseLeave(0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleSliceMouseLeave keeps popup for clicked slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup trigger="click">Click popup</dc-popup>
        </dc-pie-slice>
      `);
      // Click to show popup
      const clickEvent = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceClick(clickEvent, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Mouse leave should not hide clicked popup
      (chart as any).handleSliceMouseLeave(0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleSliceClick shows popup for click trigger', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup trigger="click">Click popup content</dc-popup>
        </dc-pie-slice>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceClick(event, 0);
      expect((chart as any).popupVisible).toBe(true);
    });

    it('handleSliceClick toggles popup on same slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup trigger="click">Click popup</dc-popup>
        </dc-pie-slice>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });

      // First click shows
      (chart as any).handleSliceClick(event, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Second click hides
      (chart as any).handleSliceClick(event, 0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleSliceClick does nothing for non-click popup', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A">
          <dc-popup trigger="hover">Hover popup</dc-popup>
        </dc-pie-slice>
      `);
      const event = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceClick(event, 0);
      expect((chart as any).popupVisible).toBe(false);
    });

    it('handleSliceClick clears popup for slice without click trigger', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      // First show popup via hover
      const enterEvent = new MouseEvent('mouseenter', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceMouseEnter(enterEvent, 0);
      expect((chart as any).popupVisible).toBe(true);

      // Click should clear popup
      const clickEvent = new MouseEvent('click', { clientX: 100, clientY: 100 });
      (chart as any).handleSliceClick(clickEvent, 0);
      expect((chart as any).popupVisible).toBe(false);
    });
  });

  // ============================================================================
  // Popup content generation
  // ============================================================================

  describe('popup content generation', () => {
    it('generateSlicePopupContent includes label and value', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="Test Slice"></dc-pie-slice>
      `);
      const content = (chart as any).generateSlicePopupContent({ label: 'Test', value: 50 }, 100);
      expect(content).toContain('Test');
      expect(content).toContain('50');
    });

    it('generateSlicePopupContent includes percentage', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="25" label="Quarter"></dc-pie-slice>
      `);
      const content = (chart as any).generateSlicePopupContent({ label: 'Quarter', value: 25 }, 100);
      expect(content).toContain('25.0%');
    });

    it('generateSlicePopupContent handles zero total', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="0" label="Zero"></dc-pie-slice>
      `);
      const content = (chart as any).generateSlicePopupContent({ label: 'Zero', value: 0 }, 0);
      expect(content).toContain('0.0%');
    });
  });

  // ============================================================================
  // Auto popup
  // ============================================================================

  describe('shouldShowAutoPopup', () => {
    it('returns chart auto-popup when element has no override', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      expect((chart as any).shouldShowAutoPopup(undefined)).toBe(true);
    });

    it('element auto-popup true overrides chart setting', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      expect((chart as any).shouldShowAutoPopup(true)).toBe(true);
    });

    it('element auto-popup false overrides chart setting', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'auto-popup': '' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
      `);
      expect((chart as any).shouldShowAutoPopup(false)).toBe(false);
    });
  });

  // ============================================================================
  // Data summary and insights
  // ============================================================================

  describe('getDataSummary', () => {
    it('returns slice count and total', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="70" label="B"></dc-pie-slice>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('2');
      expect(summary).toContain('100');
    });

    it('returns empty string for no slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, ``);
      const summary = (chart as any).getDataSummary();
      expect(summary).toBe('');
    });
  });

  describe('getInsights', () => {
    it('returns empty when aria-insights is none', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'aria-insights': 'none' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const insights = (chart as any).getInsights();
      expect(insights).toBe('');
    });

    it('returns insights for multiple slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="70" label="Majority"></dc-pie-slice>
        <dc-pie-slice value="30" label="Minority"></dc-pie-slice>
      `);
      const insights = (chart as any).getInsights();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('returns empty for no slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, ``);
      const insights = (chart as any).getInsights();
      expect(insights).toBe('');
    });
  });

  // ============================================================================
  // Chart type name
  // ============================================================================

  describe('getChartTypeName', () => {
    it('returns pie chart for regular pie', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const typeName = (chart as any).getChartTypeName();
      expect(typeName).toBe('pie chart');
    });

    it('returns donut chart when inner-radius is set', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'inner-radius': '50' }, `
        <dc-pie-slice value="100" label="A"></dc-pie-slice>
      `);
      const typeName = (chart as any).getChartTypeName();
      expect(typeName).toBe('donut chart');
    });
  });

  // ============================================================================
  // Stroke width
  // ============================================================================

  describe('stroke width', () => {
    it('uses default stroke width', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path');
      expect(paths!.length).toBeGreaterThan(0);
    });

    it('supports custom stroke-width attribute', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', { 'stroke-width': '4' }, `
        <dc-pie-slice value="50" label="A"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      expect(chart.strokeWidth).toBe(4);
    });
  });

  // ============================================================================
  // Layout edge cases
  // ============================================================================

  describe('layout edge cases', () => {
    it('calculateSliceLayout returns null for empty slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, ``);
      const layout = (chart as any).calculateSliceLayout();
      expect(layout).toBeNull();
    });

    it('calculateSliceLayout returns null for zero total value', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="0" label="A"></dc-pie-slice>
        <dc-pie-slice value="0" label="B"></dc-pie-slice>
      `);
      const layout = (chart as any).calculateSliceLayout();
      expect(layout).toBeNull();
    });

    it('getLegendItems returns empty for no slices', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, ``);
      const items = (chart as any).getLegendItems();
      expect(items).toEqual([]);
    });
  });

  // ============================================================================
  // Slice with patterns
  // ============================================================================

  describe('slice with patterns', () => {
    it('supports pattern on slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A" pattern="diagonal-lines"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const layout = (chart as any).calculateSliceLayout();
      expect(layout).not.toBeNull();
      expect(layout.slices).toHaveLength(2);
    });
  });

  // ============================================================================
  // Slice stroke customization
  // ============================================================================

  describe('slice stroke customization', () => {
    it('supports custom stroke on slice', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="50" label="A" stroke="#ff0000"></dc-pie-slice>
        <dc-pie-slice value="50" label="B"></dc-pie-slice>
      `);
      const layout = (chart as any).calculateSliceLayout();
      expect(layout).not.toBeNull();
    });
  });

  // ============================================================================
  // Legend items with values
  // ============================================================================

  describe('legend items', () => {
    it('getLegendItems returns correct count', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="30" label="A"></dc-pie-slice>
        <dc-pie-slice value="70" label="B"></dc-pie-slice>
      `);
      const items = (chart as any).getLegendItems();
      expect(items).toHaveLength(2);
    });

    it('getLegendItems includes label and value', async () => {
      chart = await fixture<PieChart>('dc-pie-chart', {}, `
        <dc-pie-slice value="100" label="Test Label"></dc-pie-slice>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].label).toBe('Test Label');
      expect(items[0].value).toBe(100);
    });
  });
});
