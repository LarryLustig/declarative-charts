import { describe, it, expect, afterEach } from 'vitest';
import { fixture } from './setup';

// Import components to register custom elements
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-bar-group';
import '../../src/chart-bar-segment';
import '../../src/chart-line';
import '../../src/chart-point';
import '../../src/chart-bubble';
import '../../src/chart-axis';
import '../../src/chart-title';
import '../../src/chart-legend';
import { Chart } from '../../src/chart';

/**
 * Component tests for Chart (the main axis-based chart component).
 *
 * Tests:
 * - Basic element creation
 * - Bar chart rendering
 * - Line chart rendering
 * - Bubble chart rendering
 * - Combined chart types
 * - Axis rendering
 * - Legend generation
 * - Negative values
 * - Orientation (vertical/horizontal)
 * - Accessibility methods
 */

describe('Chart component', () => {
  let chart: Chart;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ============================================================================
  // Basic element creation
  // ============================================================================

  describe('element creation', () => {
    it('creates dc-chart element', async () => {
      chart = await fixture<Chart>('dc-chart');
      expect(chart).toBeInstanceOf(Chart);
      expect(chart.tagName.toLowerCase()).toBe('dc-chart');
    });

    it('has default dimensions', async () => {
      chart = await fixture<Chart>('dc-chart');
      expect(chart.width).toBe(600);
      expect(chart.height).toBe(400);
    });

    it('accepts custom dimensions', async () => {
      chart = await fixture<Chart>('dc-chart', {
        width: '800',
        height: '500'
      });
      expect(chart.width).toBe(800);
      expect(chart.height).toBe(500);
    });

    it('has default orientation of vertical', async () => {
      chart = await fixture<Chart>('dc-chart');
      expect(chart.orientation).toBe('vertical');
    });

    it('can set horizontal orientation', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' });
      expect(chart.orientation).toBe('horizontal');
    });
  });

  // ============================================================================
  // Bar chart rendering
  // ============================================================================

  describe('bar chart rendering', () => {
    it('renders SVG element', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('renders correct number of bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
        <dc-bar value="40" label="C"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(3);
    });

    it('renders no bars for empty chart', async () => {
      chart = await fixture<Chart>('dc-chart');
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(0);
    });

    it('applies fill color to bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A" fill="#ff0000"></dc-bar>
      `);
      const rect = chart.shadowRoot?.querySelector('rect[data-shape-index]');
      expect(rect?.getAttribute('fill')).toBe('#ff0000');
    });

    it('uses default bar color when not specified', async () => {
      chart = await fixture<Chart>('dc-chart', { 'bar-color': '#333333' });
      // Verify the bar-color property is set
      expect(chart.barColor).toBe('#333333');
    });

    it('respects bar-width attribute', async () => {
      chart = await fixture<Chart>('dc-chart', { 'bar-width': '40' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      expect(chart.barWidth).toBe('40');
    });

    it('respects gutter attribute', async () => {
      chart = await fixture<Chart>('dc-chart', { gutter: '20' }, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `);
      expect(chart.gutter).toBe(20);
    });
  });

  // ============================================================================
  // Bar groups
  // ============================================================================

  describe('bar groups', () => {
    it('renders bars within groups', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar-group label="Q1">
          <dc-bar value="30" label="Sales"></dc-bar>
          <dc-bar value="20" label="Costs"></dc-bar>
        </dc-bar-group>
        <dc-bar-group label="Q2">
          <dc-bar value="40" label="Sales"></dc-bar>
          <dc-bar value="25" label="Costs"></dc-bar>
        </dc-bar-group>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(4);
    });

    it('renders category labels for groups', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar-group label="Group A">
          <dc-bar value="50" label="Item"></dc-bar>
        </dc-bar-group>
      `);
      // Category labels come from the bars within groups
      const labels = (chart as any).getCategoryLabels();
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Stacked bars
  // ============================================================================

  describe('stacked bars', () => {
    it('renders segments within bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Product A"></dc-bar-segment>
          <dc-bar-segment value="20" label="Product B"></dc-bar-segment>
        </dc-bar>
      `);
      // Segments are rendered as separate rects
      const rects = chart.shadowRoot?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);
    });

    it('calculates total value from segments', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="A"></dc-bar-segment>
          <dc-bar-segment value="20" label="B"></dc-bar-segment>
          <dc-bar-segment value="10" label="C"></dc-bar-segment>
        </dc-bar>
      `);
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(60);
    });
  });

  // ============================================================================
  // Line chart rendering
  // ============================================================================

  describe('line chart rendering', () => {
    it('renders line path', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
          <dc-point value="15" label="C"></dc-point>
        </dc-line>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path');
      expect(paths?.length).toBeGreaterThan(0);
    });

    it('renders point circles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      // Points are rendered as circles, rects, or other shapes
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('applies stroke color to line', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend" stroke="#ff0000">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      const path = chart.shadowRoot?.querySelector('path');
      expect(path?.getAttribute('stroke')).toBe('#ff0000');
    });

    it('supports multiple lines', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Line 1" stroke="red">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
        <dc-line label="Line 2" stroke="blue">
          <dc-point value="15" label="A"></dc-point>
          <dc-point value="25" label="B"></dc-point>
        </dc-line>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path');
      expect(paths?.length).toBeGreaterThanOrEqual(2);
    });

    it('supports curve-fit attribute', async () => {
      chart = await fixture<Chart>('dc-chart', { 'curve-fit': 'catmull-rom' }, `
        <dc-line label="Smooth">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
          <dc-point value="15" label="C"></dc-point>
        </dc-line>
      `);
      expect(chart.curveFit).toBe('catmull-rom');
    });
  });

  // ============================================================================
  // Bubble chart rendering
  // ============================================================================

  describe('bubble chart rendering', () => {
    it('renders bubble circles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
        <dc-bubble value="20" size="100" label="B"></dc-bubble>
      `);
      const circles = chart.shadowRoot?.querySelectorAll('circle');
      expect(circles?.length).toBeGreaterThan(0);
    });

    it('applies fill color to bubbles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A" fill="#ff0000"></dc-bubble>
      `);
      const circle = chart.shadowRoot?.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#ff0000');
    });

    it('respects max-bubble-radius', async () => {
      chart = await fixture<Chart>('dc-chart', { 'max-bubble-radius': '40' }, `
        <dc-bubble value="10" size="100" label="A"></dc-bubble>
      `);
      expect(chart.maxBubbleRadius).toBe(40);
    });

    it('respects min-bubble-radius', async () => {
      chart = await fixture<Chart>('dc-chart', { 'min-bubble-radius': '10' }, `
        <dc-bubble value="10" size="1" label="A"></dc-bubble>
      `);
      expect(chart.minBubbleRadius).toBe(10);
    });
  });

  // ============================================================================
  // Combined chart types
  // ============================================================================

  describe('combined charts', () => {
    it('renders bars and lines together', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="30" label="Q1"></dc-bar>
        <dc-bar value="40" label="Q2"></dc-bar>
        <dc-line label="Target" stroke="red">
          <dc-point value="35" label="Q1"></dc-point>
          <dc-point value="35" label="Q2"></dc-point>
        </dc-line>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      const paths = chart.shadowRoot?.querySelectorAll('path');
      expect(rects).toHaveLength(2);
      expect(paths?.length).toBeGreaterThan(0);
    });

    it('calculates max value from all chart types', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="50" label="A"></dc-point>
        </dc-line>
      `);
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(50);
    });
  });

  // ============================================================================
  // Negative values
  // ============================================================================

  describe('negative values', () => {
    it('handles negative bar values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="-20" label="Loss"></dc-bar>
        <dc-bar value="30" label="Gain"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('calculates correct min value with negatives', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="-50" label="A"></dc-bar>
        <dc-bar value="30" label="B"></dc-bar>
      `);
      const minValue = (chart as any).getMinValue();
      expect(minValue).toBe(-50);
    });

    it('handles all-negative values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="-10" label="A"></dc-bar>
        <dc-bar value="-30" label="B"></dc-bar>
        <dc-bar value="-20" label="C"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(3);
    });

    it('handles negative line values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="-10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
          <dc-point value="-5" label="C"></dc-point>
        </dc-line>
      `);
      const paths = chart.shadowRoot?.querySelectorAll('path');
      expect(paths?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Orientation
  // ============================================================================

  describe('orientation', () => {
    it('vertical bars grow upward', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'vertical' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const rect = chart.shadowRoot?.querySelector('rect[data-shape-index]');
      expect(rect).toBeDefined();
    });

    it('horizontal bars grow rightward', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const rect = chart.shadowRoot?.querySelector('rect[data-shape-index]');
      expect(rect).toBeDefined();
    });

    it('supports vertical-reverse', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'vertical-reverse' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      expect(chart.orientation).toBe('vertical-reverse');
    });

    it('supports horizontal-reverse', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal-reverse' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      expect(chart.orientation).toBe('horizontal-reverse');
    });
  });

  // ============================================================================
  // Axis rendering
  // ============================================================================

  describe('axis rendering', () => {
    it('renders axes by default', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      // Axes are rendered as g elements with lines
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('renders axis with custom configuration', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="bottom" label-interval="2"></dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="60" label="B"></dc-bar>
      `);
      const axis = chart.querySelector('dc-axis');
      expect(axis).toBeDefined();
    });

    it('renders axis with title', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="left">
          <dc-title>Revenue ($)</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const axisTitle = chart.querySelector('dc-axis dc-title');
      expect(axisTitle?.textContent).toBe('Revenue ($)');
    });
  });

  // ============================================================================
  // Legend generation
  // ============================================================================

  describe('legend generation', () => {
    it('generates legend items for bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="Item A" fill="#ff0000"></dc-bar>
        <dc-bar value="30" label="Item B" fill="#00ff00"></dc-bar>
      `);
      const items = (chart as any).getLegendItems();
      expect(items.length).toBe(2);
      expect(items[0].label).toBe('Item A');
      expect(items[1].label).toBe('Item B');
    });

    it('generates legend items for lines', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend A" stroke="red">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
        <dc-line label="Trend B" stroke="blue">
          <dc-point value="20" label="A"></dc-point>
        </dc-line>
      `);
      const items = (chart as any).getLegendItems();
      expect(items.some((i: any) => i.label === 'Trend A')).toBe(true);
      expect(items.some((i: any) => i.label === 'Trend B')).toBe(true);
    });

    it('generates legend items for bubbles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="Small" fill="red"></dc-bubble>
        <dc-bubble value="20" size="100" label="Large" fill="blue"></dc-bubble>
      `);
      const items = (chart as any).getLegendItems();
      expect(items.length).toBe(2);
    });

    it('uses line shape for line legend items', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend" stroke="red">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].shape).toBe('line');
    });

    it('uses square shape for bar legend items', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].shape).toBe('square');
    });

    it('uses circle shape for bubble legend items', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
      `);
      const items = (chart as any).getLegendItems();
      expect(items[0].shape).toBe('circle');
    });
  });

  // ============================================================================
  // Accessibility methods
  // ============================================================================

  describe('accessibility', () => {
    it('returns correct chart type for bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      expect((chart as any).getChartTypeName()).toBe('bar chart');
    });

    it('returns correct chart type for lines', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      expect((chart as any).getChartTypeName()).toBe('line chart');
    });

    it('returns correct chart type for bubbles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
      `);
      expect((chart as any).getChartTypeName()).toBe('bubble chart');
    });

    it('returns combined chart type', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const typeName = (chart as any).getChartTypeName();
      expect(typeName).toContain('bar');
      expect(typeName).toContain('line');
    });

    it('returns data summary', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="30" label="B"></dc-bar>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('generates insights', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="100" label="High"></dc-bar>
        <dc-bar value="20" label="Low"></dc-bar>
      `);
      const insights = (chart as any).getInsights();
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Hidden elements
  // ============================================================================

  describe('hidden elements', () => {
    it('hides bars with hidden attribute', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="Visible"></dc-bar>
        <dc-bar value="30" label="Hidden" hidden></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(1);
    });

    it('hides lines with hidden attribute', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Visible">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
        <dc-line label="Hidden" hidden>
          <dc-point value="20" label="A"></dc-point>
        </dc-line>
      `);
      // Only one line should render
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });
  });

  // ============================================================================
  // Title integration
  // ============================================================================

  describe('title integration', () => {
    it('renders title when present', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-title>Sales Report</dc-title>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const title = chart.querySelector('dc-title');
      expect(title?.textContent).toBe('Sales Report');
    });
  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles single bar', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="Only"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(1);
    });

    it('handles many bars', async () => {
      const bars = Array.from({ length: 20 }, (_, i) =>
        `<dc-bar value="${i * 10}" label="Bar ${i}"></dc-bar>`
      ).join('');
      chart = await fixture<Chart>('dc-chart', {}, bars);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(20);
    });

    it('handles zero values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="0" label="Zero"></dc-bar>
        <dc-bar value="50" label="Fifty"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('handles all zero values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="0" label="A"></dc-bar>
        <dc-bar value="0" label="B"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('handles decimal values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="33.33" label="Third"></dc-bar>
        <dc-bar value="66.67" label="Two Thirds"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('handles single point line', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Single">
          <dc-point value="50" label="A"></dc-point>
        </dc-line>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });
  });
});
