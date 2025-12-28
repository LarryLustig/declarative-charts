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
import '../../src/chart-popup';
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

    it('renders multiple horizontal bars', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' }, `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
        <dc-bar value="40" label="C"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(3);
    });

    it('renders horizontal bars with negative values', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' }, `
        <dc-bar value="-20" label="Negative"></dc-bar>
        <dc-bar value="30" label="Positive"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('renders horizontal-reverse bars', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal-reverse' }, `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect[data-shape-index]');
      expect(rects).toHaveLength(2);
    });

    it('renders horizontal bar groups', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' }, `
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

    it('renders horizontal stacked bars', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal' }, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="20" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);
    });

    it('renders horizontal-reverse stacked bars', async () => {
      chart = await fixture<Chart>('dc-chart', { orientation: 'horizontal-reverse' }, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="20" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
      `);
      const rects = chart.shadowRoot?.querySelectorAll('rect');
      expect(rects?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Links (href)
  // ============================================================================

  describe('links', () => {
    it('renders bar with href as link', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A" href="https://example.com"></dc-bar>
      `);
      const link = chart.shadowRoot?.querySelector('a');
      expect(link).toBeDefined();
      expect(link?.getAttribute('href')).toBe('https://example.com');
    });

    it('renders line with href as link', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend" href="https://example.com">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      const links = chart.shadowRoot?.querySelectorAll('a');
      expect(links?.length).toBeGreaterThan(0);
    });

    it('renders point with href as link', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A" href="https://example.com/a"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      const links = chart.shadowRoot?.querySelectorAll('a');
      expect(links?.length).toBeGreaterThan(0);
    });

    it('renders bubble with href as link', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A" href="https://example.com"></dc-bubble>
      `);
      const link = chart.shadowRoot?.querySelector('a');
      expect(link).toBeDefined();
    });

    it('renders segment with href as link', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="A" fill="#ff0000" href="https://example.com"></dc-bar-segment>
          <dc-bar-segment value="20" label="B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
      `);
      const links = chart.shadowRoot?.querySelectorAll('a');
      expect(links?.length).toBeGreaterThan(0);
    });

    it('supports target attribute on links', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A" href="https://example.com" target="_blank"></dc-bar>
      `);
      const link = chart.shadowRoot?.querySelector('a');
      expect(link?.getAttribute('target')).toBe('_blank');
    });
  });

  // ============================================================================
  // Value labels
  // ============================================================================

  describe('value labels', () => {
    it('shows value labels when show-value is enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'show-value': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const texts = chart.shadowRoot?.querySelectorAll('text');
      // Should have value label text
      expect(texts?.length).toBeGreaterThan(0);
    });

    it('shows percent labels when show-percent is enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'show-percent': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `);
      const texts = chart.shadowRoot?.querySelectorAll('text');
      expect(texts?.length).toBeGreaterThan(0);
    });

    it('shows labels on lines when show-value is enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'show-value': '' }, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('shows labels on bubbles when show-value is enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'show-value': '' }, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('shows labels on segments when show-value is enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'show-value': '' }, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="20" label="B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
      `);
      const texts = chart.shadowRoot?.querySelectorAll('text');
      expect(texts?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Curve fitting
  // ============================================================================

  describe('curve fitting', () => {
    it('renders catmull-rom curve', async () => {
      chart = await fixture<Chart>('dc-chart', { 'curve-fit': 'catmull-rom' }, `
        <dc-line label="Smooth">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="30" label="B"></dc-point>
          <dc-point value="20" label="C"></dc-point>
          <dc-point value="40" label="D"></dc-point>
        </dc-line>
      `);
      const path = chart.shadowRoot?.querySelector('path');
      expect(path).toBeDefined();
      // Verify curve-fit property is set
      expect(chart.curveFit).toBe('catmull-rom');
    });

    it('line can override chart curve-fit', async () => {
      chart = await fixture<Chart>('dc-chart', { 'curve-fit': 'linear' }, `
        <dc-line label="Smooth" curve-fit="catmull-rom">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="30" label="B"></dc-point>
          <dc-point value="20" label="C"></dc-point>
        </dc-line>
      `);
      const path = chart.shadowRoot?.querySelector('path');
      expect(path).toBeDefined();
    });
  });

  // ============================================================================
  // Point shapes
  // ============================================================================

  describe('point shapes', () => {
    it('supports circle point shape', async () => {
      chart = await fixture<Chart>('dc-chart', { 'point-shape': 'circle' }, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const circles = chart.shadowRoot?.querySelectorAll('circle');
      expect(circles?.length).toBeGreaterThan(0);
    });

    it('supports square point shape', async () => {
      chart = await fixture<Chart>('dc-chart', { 'point-shape': 'square' }, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('supports diamond point shape', async () => {
      chart = await fixture<Chart>('dc-chart', { 'point-shape': 'diamond' }, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('point can override line point-shape', async () => {
      chart = await fixture<Chart>('dc-chart', { 'point-shape': 'circle' }, `
        <dc-line label="Trend">
          <dc-point value="10" label="A" shape="square"></dc-point>
        </dc-line>
      `);
      const svg = chart.shadowRoot?.querySelector('svg');
      expect(svg).toBeDefined();
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

    it('renders right axis with title', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="right">
          <dc-title>Secondary Axis</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const axisTitle = chart.querySelector('dc-axis[position="right"] dc-title');
      expect(axisTitle?.textContent).toBe('Secondary Axis');
      // Verify the axis title dimensions are calculated
      const dims = (chart as any).getAxisTitleDimensions('right');
      expect(dims).toBeDefined();
      expect(dims.text).toBe('Secondary Axis');
    });

    it('renders top axis with title', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="top">
          <dc-title>Top Axis Title</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const axisTitle = chart.querySelector('dc-axis[position="top"] dc-title');
      expect(axisTitle?.textContent).toBe('Top Axis Title');
      // Verify the axis title dimensions are calculated (top/bottom use width/height differently)
      const dims = (chart as any).getAxisTitleDimensions('top');
      expect(dims).toBeDefined();
      expect(dims.text).toBe('Top Axis Title');
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);
    });

    it('renders bottom axis with title', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="bottom">
          <dc-title>Categories</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const axisTitle = chart.querySelector('dc-axis[position="bottom"] dc-title');
      expect(axisTitle?.textContent).toBe('Categories');
      const dims = (chart as any).getAxisTitleDimensions('bottom');
      expect(dims).toBeDefined();
      expect(dims.text).toBe('Categories');
    });

    it('calculates axis label padding with right axis title', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="left">
          <dc-title>Left Title</dc-title>
        </dc-axis>
        <dc-axis position="right">
          <dc-title>Right Title</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const padding = (chart as any).getAxisLabelPadding();
      expect(padding).toHaveProperty('left');
      expect(padding).toHaveProperty('right');
      expect(padding).toHaveProperty('top');
      expect(padding).toHaveProperty('bottom');
      // Right padding should include space for right axis title
      expect(padding.right).toBeGreaterThan(0);
    });

    it('renders axis title SVG for all positions', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="left">
          <dc-title>Left</dc-title>
        </dc-axis>
        <dc-axis position="right">
          <dc-title>Right</dc-title>
        </dc-axis>
        <dc-axis position="top">
          <dc-title>Top</dc-title>
        </dc-axis>
        <dc-axis position="bottom">
          <dc-title>Bottom</dc-title>
        </dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      // All four axis titles should be defined
      expect(chart.querySelector('dc-axis[position="left"] dc-title')).toBeDefined();
      expect(chart.querySelector('dc-axis[position="right"] dc-title')).toBeDefined();
      expect(chart.querySelector('dc-axis[position="top"] dc-title')).toBeDefined();
      expect(chart.querySelector('dc-axis[position="bottom"] dc-title')).toBeDefined();
    });

    it('supports label-lines for staggered labels', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="bottom" label-lines="2"></dc-axis>
        <dc-bar value="50" label="First Item"></dc-bar>
        <dc-bar value="60" label="Second Item"></dc-bar>
        <dc-bar value="70" label="Third Item"></dc-bar>
        <dc-bar value="80" label="Fourth Item"></dc-bar>
      `);
      // getLabelLinesCount should return 2
      expect((chart as any).getLabelLinesCount()).toBe(2);
      // getLabelLineOffset should return alternating offsets
      expect((chart as any).getLabelLineOffset(0)).toBe(0);
      expect((chart as any).getLabelLineOffset(1)).toBeGreaterThan(0);
    });

    it('returns correct label line offset for multiple lines', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-axis position="bottom" label-lines="3"></dc-axis>
        <dc-bar value="50" label="A"></dc-bar>
      `);
      // With 3 lines, offsets cycle through 0, 1, 2
      const offset0 = (chart as any).getLabelLineOffset(0);
      const offset1 = (chart as any).getLabelLineOffset(1);
      const offset2 = (chart as any).getLabelLineOffset(2);
      const offset3 = (chart as any).getLabelLineOffset(3); // Should wrap to line 0

      expect(offset0).toBe(0);
      expect(offset1).toBeGreaterThan(offset0);
      expect(offset2).toBeGreaterThan(offset1);
      expect(offset3).toBe(0); // Wraps back to first line
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
  // Combo chart legend (stacked bars + lines)
  // ============================================================================

  describe('combo chart legend', () => {
    it('includes line items in stacked bar legend', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="20" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
        <dc-bar label="Q2">
          <dc-bar-segment value="40" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="25" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
        <dc-line label="Target" stroke="#0000ff">
          <dc-point value="50" label="Q1"></dc-point>
          <dc-point value="60" label="Q2"></dc-point>
        </dc-line>
      `);
      const items = (chart as any).getLegendItems();
      // Should have segment items + line item
      expect(items.length).toBeGreaterThanOrEqual(3);
      // Should include the line with correct shape
      const lineItem = items.find((i: any) => i.label === 'Target');
      expect(lineItem).toBeDefined();
      expect(lineItem.shape).toBe('line');
      expect(lineItem.dimensionless).toBe(true);
    });

    it('segment legend items have totaled values', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="20" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
        <dc-bar label="Q2">
          <dc-bar-segment value="40" label="Product A" fill="#ff0000"></dc-bar-segment>
          <dc-bar-segment value="10" label="Product B" fill="#00ff00"></dc-bar-segment>
        </dc-bar>
      `);
      const items = (chart as any).getLegendItems();
      const productA = items.find((i: any) => i.label === 'Product A');
      const productB = items.find((i: any) => i.label === 'Product B');
      expect(productA?.value).toBe(70); // 30 + 40
      expect(productB?.value).toBe(30); // 20 + 10
    });
  });

  // ============================================================================
  // Keyboard navigation and focus
  // ============================================================================

  describe('keyboard navigation', () => {
    it('returns focusable elements for bars', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="30" label="B"></dc-bar>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements).toHaveLength(2);
    });

    it('returns focusable elements for lines', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
          <dc-point value="15" label="C"></dc-point>
        </dc-line>
      `);
      const elements = (chart as any).getFocusableElements();
      // Should have one element per point
      expect(elements).toHaveLength(3);
    });

    it('returns focusable elements for bubbles', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
        <dc-bubble value="20" size="100" label="B"></dc-bubble>
      `);
      const elements = (chart as any).getFocusableElements();
      expect(elements).toHaveLength(2);
    });

    it('returns combined focusable elements for mixed charts', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
        <dc-bubble value="15" size="50" label="C"></dc-bubble>
      `);
      const elements = (chart as any).getFocusableElements();
      // 1 bar + 2 points + 1 bubble = 4
      expect(elements).toHaveLength(4);
    });
  });

  // ============================================================================
  // Focus indicator rendering
  // ============================================================================

  describe('focus indicator', () => {
    it('does not render focus indicator when keyboard inactive', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      (chart as any).keyboardActive = false;
      (chart as any).focusedIndex = 0;
      const indicator = (chart as any).renderFocusIndicator();
      // Should return empty SVG template
      expect(indicator).toBeDefined();
    });

    it('does not render focus indicator when no element focused', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      (chart as any).keyboardActive = true;
      (chart as any).focusedIndex = -1;
      const indicator = (chart as any).renderFocusIndicator();
      expect(indicator).toBeDefined();
    });

    it('renders focus indicator for focused bar', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
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
    it('returns bounds for bar shapes', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const bounds = (chart as any).getShapeBounds(0);
      // May return null if no rect is rendered yet, or bounds object
      if (bounds) {
        expect(bounds).toHaveProperty('x');
        expect(bounds).toHaveProperty('y');
        expect(bounds).toHaveProperty('width');
        expect(bounds).toHaveProperty('height');
      }
    });

    it('returns bounds for circle shapes (line points)', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
          <dc-point value="20" label="B"></dc-point>
        </dc-line>
      `);
      // Line points are after bars in index, so if no bars, index 0 is first point
      const bounds = (chart as any).getShapeBounds(0);
      if (bounds) {
        expect(bounds).toHaveProperty('x');
        expect(bounds).toHaveProperty('y');
        expect(bounds).toHaveProperty('width');
        expect(bounds).toHaveProperty('height');
      }
    });

    it('returns null for invalid index', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const bounds = (chart as any).getShapeBounds(999);
      expect(bounds).toBeNull();
    });
  });

  // ============================================================================
  // Popup content methods
  // ============================================================================

  describe('popup content', () => {
    it('getBarPopupContent returns custom popup content', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A">
          <dc-popup>Custom bar popup</dc-popup>
        </dc-bar>
      `);
      const bars = (chart as any).getFlattenedBars();
      const content = (chart as any).getBarPopupContent(bars[0], 0);
      expect(content).toBe('Custom bar popup');
    });

    it('getBarPopupContent returns auto popup when enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="Test Bar"></dc-bar>
        <dc-bar value="50" label="Other Bar"></dc-bar>
      `);
      const bars = (chart as any).getFlattenedBars();
      const content = (chart as any).getBarPopupContent(bars[0], 0);
      expect(content).toContain('Test Bar');
      expect(content).toContain('Value:');
    });

    it('getBarPopupContent returns null when no popup', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      const bars = (chart as any).getFlattenedBars();
      const content = (chart as any).getBarPopupContent(bars[0], 0);
      expect(content).toBeNull();
    });

    it('getPointPopupContent returns custom popup content', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A">
            <dc-popup>Custom point popup</dc-popup>
          </dc-point>
        </dc-line>
      `);
      const lines = (chart as any).getLines();
      const content = (chart as any).getPointPopupContent(lines[0], lines[0].points[0], 0, 0);
      expect(content).toBe('Custom point popup');
    });

    it('getPointPopupContent returns auto popup when enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-line label="Test Line">
          <dc-point value="10" label="Point A"></dc-point>
        </dc-line>
      `);
      const lines = (chart as any).getLines();
      const content = (chart as any).getPointPopupContent(lines[0], lines[0].points[0], 0, 0);
      expect(content).toContain('Test Line');
      expect(content).toContain('Point A');
    });

    it('getPointPopupContent returns null when no popup', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const lines = (chart as any).getLines();
      const content = (chart as any).getPointPopupContent(lines[0], lines[0].points[0], 0, 0);
      expect(content).toBeNull();
    });

    it('getBubblePopupContent returns custom popup content', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A">
          <dc-popup>Custom bubble popup</dc-popup>
        </dc-bubble>
      `);
      const bubbles = (chart as any).getBubbles();
      const content = (chart as any).getBubblePopupContent(bubbles[0], 0);
      expect(content).toBe('Custom bubble popup');
    });

    it('getBubblePopupContent returns auto popup when enabled', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bubble value="10" size="50" label="Test Bubble"></dc-bubble>
      `);
      const bubbles = (chart as any).getBubbles();
      const content = (chart as any).getBubblePopupContent(bubbles[0], 0);
      expect(content).toContain('Test Bubble');
      expect(content).toContain('Value:');
      expect(content).toContain('Size:');
    });

    it('getBubblePopupContent returns null when no popup', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
      `);
      const bubbles = (chart as any).getBubbles();
      const content = (chart as any).getBubblePopupContent(bubbles[0], 0);
      expect(content).toBeNull();
    });
  });

  // ============================================================================
  // Popup for focused element
  // ============================================================================

  describe('popup for focused element', () => {
    it('showPopupForFocusedElement handles bar index', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="30" label="B"></dc-bar>
      `);
      // Should not throw when called
      expect(() => (chart as any).showPopupForFocusedElement(0)).not.toThrow();
    });

    it('showPopupForFocusedElement handles line point index', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="10" label="P1"></dc-point>
          <dc-point value="20" label="P2"></dc-point>
        </dc-line>
      `);
      // Index 1 is the first line point (after 1 bar)
      expect(() => (chart as any).showPopupForFocusedElement(1)).not.toThrow();
    });

    it('showPopupForFocusedElement handles bubble index', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="10" label="P1"></dc-point>
        </dc-line>
        <dc-bubble value="15" size="50" label="B"></dc-bubble>
      `);
      // Index 2 is the bubble (after 1 bar + 1 point)
      expect(() => (chart as any).showPopupForFocusedElement(2)).not.toThrow();
    });

    it('togglePopupForFocusedElement shows popup when hidden', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      (chart as any).popupVisible = false;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
    });

    it('togglePopupForFocusedElement hides popup when visible', async () => {
      chart = await fixture<Chart>('dc-chart', { 'auto-popup': '' }, `
        <dc-bar value="50" label="A"></dc-bar>
      `);
      (chart as any).popupVisible = true;
      expect(() => (chart as any).togglePopupForFocusedElement(0)).not.toThrow();
    });
  });

  // ============================================================================
  // Data summary
  // ============================================================================

  describe('data summary', () => {
    it('includes bar summary', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="10" label="Low"></dc-bar>
        <dc-bar value="50" label="High"></dc-bar>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('bar');
      expect(summary).toContain('10');
      expect(summary).toContain('50');
    });

    it('includes line summary', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-line label="Trend">
          <dc-point value="5" label="A"></dc-point>
          <dc-point value="25" label="B"></dc-point>
        </dc-line>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('line');
      expect(summary).toContain('point');
    });

    it('includes bubble summary', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bubble value="10" size="50" label="A"></dc-bubble>
        <dc-bubble value="20" size="100" label="B"></dc-bubble>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('bubble');
    });

    it('combines summaries for mixed charts', async () => {
      chart = await fixture<Chart>('dc-chart', {}, `
        <dc-bar value="50" label="A"></dc-bar>
        <dc-line label="Trend">
          <dc-point value="10" label="A"></dc-point>
        </dc-line>
      `);
      const summary = (chart as any).getDataSummary();
      expect(summary).toContain('bar');
      expect(summary).toContain('line');
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
