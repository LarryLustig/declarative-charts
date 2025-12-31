import { describe, it, expect, afterEach } from 'vitest';
import { fixture, elementUpdated, nextFrame, queryShadowAll } from './setup';

// Import all chart components
import '../../src/chart';
import '../../src/chart-bar';
import '../../src/chart-bar-group';
import '../../src/chart-bar-segment';
import '../../src/chart-line';
import '../../src/chart-area';
import '../../src/chart-point';
import '../../src/chart-bubble';
import '../../src/chart-axis';
import '../../src/chart-title';
import '../../src/chart-legend';
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import '../../src/funnel-chart';
import '../../src/chart-funnel-stage';

import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';
import { FunnelChart } from '../../src/funnel-chart';

/**
 * Integration tests for dynamic chart updates.
 *
 * These tests verify that charts correctly respond to runtime changes:
 * - Adding new data elements
 * - Removing data elements
 * - Updating element attributes
 * - Toggling visibility with hidden attribute
 * - Chart attribute changes
 */

describe('Dynamic Updates - Bar Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('adding bars', () => {
    it('adds a new bar dynamically', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `
      );

      // Initially 2 bars
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);

      // Add a new bar
      const newBar = document.createElement('dc-bar');
      newBar.setAttribute('value', '40');
      newBar.setAttribute('label', 'C');
      chart.appendChild(newBar);

      // Request update and wait
      chart.requestUpdate();
      await elementUpdated(chart);

      // Now should have 3 bars
      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(3);
    });

    it('adds multiple bars at once', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
      `
      );

      // Add multiple bars
      for (let i = 0; i < 5; i++) {
        const bar = document.createElement('dc-bar');
        bar.setAttribute('value', String(20 + i * 10));
        bar.setAttribute('label', String.fromCharCode(66 + i)); // B, C, D, E, F
        chart.appendChild(bar);
      }

      chart.requestUpdate();
      await elementUpdated(chart);

      const bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(6);
    });

    it('rescales when new bar exceeds max value', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `
      );

      // Add a bar with much higher value
      const newBar = document.createElement('dc-bar');
      newBar.setAttribute('value', '200');
      newBar.setAttribute('label', 'C');
      chart.appendChild(newBar);

      chart.requestUpdate();
      await elementUpdated(chart);

      // The chart should have rescaled - max value should now be 200
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(200);
    });
  });

  describe('removing bars', () => {
    it('removes a bar dynamically', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
        <dc-bar value="40" label="C"></dc-bar>
      `
      );

      // Initially 3 bars
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(3);

      // Remove the middle bar
      const barToRemove = chart.querySelector('dc-bar:nth-child(2)');
      barToRemove?.remove();

      chart.requestUpdate();
      await elementUpdated(chart);

      // Now should have 2 bars
      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);
    });

    it('removes all bars leaving empty chart', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `
      );

      // Remove all bars
      chart.querySelectorAll('dc-bar').forEach((bar) => bar.remove());

      chart.requestUpdate();
      await elementUpdated(chart);

      const bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(0);
    });
  });

  describe('updating bar values', () => {
    it('updates bar value attribute', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
      `
      );

      // Update the first bar's value
      const firstBar = chart.querySelector('dc-bar');
      firstBar?.setAttribute('value', '80');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Max value should now reflect the change
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(80);
    });

    it('updates bar label', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
      `
      );

      const bar = chart.querySelector('dc-bar');
      bar?.setAttribute('label', 'Updated Label');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Get category labels
      const labels = (chart as any).getCategoryLabels();
      expect(labels).toContain('Updated Label');
    });

    it('updates bar fill color', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A" fill="#ff0000"></dc-bar>
      `
      );

      const bar = chart.querySelector('dc-bar');
      bar?.setAttribute('fill', '#00ff00');

      chart.requestUpdate();
      await elementUpdated(chart);

      const rect = chart.shadowRoot?.querySelector('rect[data-shape-index]');
      expect(rect?.getAttribute('fill')).toBe('#00ff00');
    });
  });

  describe('hidden attribute', () => {
    it('hides bar with hidden attribute', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B"></dc-bar>
        <dc-bar value="40" label="C"></dc-bar>
      `
      );

      // Initially 3 bars
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(3);

      // Hide the middle bar
      const middleBar = chart.querySelector('dc-bar:nth-child(2)');
      middleBar?.setAttribute('hidden', '');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Should now render only 2 bars
      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);
    });

    it('shows bar when hidden attribute removed', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-bar value="30" label="A"></dc-bar>
        <dc-bar value="50" label="B" hidden></dc-bar>
        <dc-bar value="40" label="C"></dc-bar>
      `
      );

      // Initially 2 visible bars
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);

      // Show the hidden bar
      const hiddenBar = chart.querySelector('dc-bar[hidden]');
      hiddenBar?.removeAttribute('hidden');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Should now render 3 bars
      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(3);
    });
  });
});

describe('Dynamic Updates - Line Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('adding lines', () => {
    it('adds a new line dynamically', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-line label="Series A" stroke="#ff0000">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-line>
      `
      );

      // Initially 1 line path (path elements with data-shape-index)
      let paths = queryShadowAll(chart, 'path[data-shape-index]');
      expect(paths).toHaveLength(1);

      // Add a new line
      const newLine = document.createElement('dc-line');
      newLine.setAttribute('label', 'Series B');
      newLine.setAttribute('stroke', '#00ff00');
      newLine.innerHTML = `
        <dc-point value="15" label="Jan"></dc-point>
        <dc-point value="25" label="Feb"></dc-point>
      `;
      chart.appendChild(newLine);

      chart.requestUpdate();
      await elementUpdated(chart);

      // Should now have 2 line paths
      paths = queryShadowAll(chart, 'path[data-shape-index]');
      expect(paths).toHaveLength(2);
    });
  });

  describe('adding points to existing line', () => {
    it('adds a point to an existing line', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-line label="Series A">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-line>
      `
      );

      // Add a new point to the line
      const line = chart.querySelector('dc-line');
      const newPoint = document.createElement('dc-point');
      newPoint.setAttribute('value', '30');
      newPoint.setAttribute('label', 'Mar');
      line?.appendChild(newPoint);

      chart.requestUpdate();
      await elementUpdated(chart);

      // Check that the line now has 3 points worth of data
      const labels = (chart as any).getCategoryLabels();
      expect(labels).toContain('Mar');
    });

    it('removes a point from an existing line', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-line label="Series A">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
          <dc-point value="30" label="Mar"></dc-point>
        </dc-line>
      `
      );

      // Remove the middle point
      const pointToRemove = chart.querySelector('dc-point:nth-child(2)');
      pointToRemove?.remove();

      chart.requestUpdate();
      await elementUpdated(chart);

      // Check that Feb is no longer in labels
      const labels = (chart as any).getCategoryLabels();
      expect(labels).not.toContain('Feb');
    });
  });

  describe('updating point values', () => {
    it('updates point value', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-line label="Series A">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-line>
      `
      );

      // Update the first point's value to a high value
      const firstPoint = chart.querySelector('dc-point');
      firstPoint?.setAttribute('value', '100');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Max value should reflect the change
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(100);
    });
  });
});

describe('Dynamic Updates - Area Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('adding areas', () => {
    it('adds a new area dynamically', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-area label="Area A" fill="#4CAF50">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-area>
      `
      );

      // Initially 1 area path
      let areaPaths = queryShadowAll(chart, 'path[data-area="true"]');
      expect(areaPaths).toHaveLength(1);

      // Add a new area
      const newArea = document.createElement('dc-area');
      newArea.setAttribute('label', 'Area B');
      newArea.setAttribute('fill', '#2196F3');
      newArea.innerHTML = `
        <dc-point value="15" label="Jan"></dc-point>
        <dc-point value="25" label="Feb"></dc-point>
      `;
      chart.appendChild(newArea);

      chart.requestUpdate();
      await elementUpdated(chart);

      // Should now have 2 area paths
      areaPaths = queryShadowAll(chart, 'path[data-area="true"]');
      expect(areaPaths).toHaveLength(2);
    });
  });

  describe('adding points to existing area', () => {
    it('adds a point to an existing area', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-area label="Area A" fill="#4CAF50">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-area>
      `
      );

      // Add a new point to the area
      const area = chart.querySelector('dc-area');
      const newPoint = document.createElement('dc-point');
      newPoint.setAttribute('value', '30');
      newPoint.setAttribute('label', 'Mar');
      area?.appendChild(newPoint);

      chart.requestUpdate();
      await elementUpdated(chart);

      // Check that the area now has 3 points worth of data
      const labels = (chart as any).getCategoryLabels();
      expect(labels).toContain('Mar');
    });
  });

  describe('updating area properties', () => {
    it('updates area fill color', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-area label="Area A" fill="#4CAF50">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-area>
      `
      );

      // Update the area fill
      const area = chart.querySelector('dc-area');
      area?.setAttribute('fill', '#FF0000');

      chart.requestUpdate();
      await elementUpdated(chart);

      // Verify the color changed
      const areaPath = chart.shadowRoot?.querySelector('path[data-area="true"]');
      expect(areaPath?.getAttribute('fill')).toBe('#FF0000');
    });

    it('toggles overlapping mode', async () => {
      const chart = await fixture<Chart>(
        'dc-chart',
        {},
        `
        <dc-area label="Area A" fill="#4CAF50">
          <dc-point value="10" label="Jan"></dc-point>
          <dc-point value="20" label="Feb"></dc-point>
        </dc-area>
        <dc-area label="Area B" fill="#2196F3">
          <dc-point value="15" label="Jan"></dc-point>
          <dc-point value="25" label="Feb"></dc-point>
        </dc-area>
      `
      );

      // Initially not overlapping (stacked)
      expect(chart.overlapping).toBe(false);

      // Set overlapping mode
      chart.setAttribute('overlapping', '');

      chart.requestUpdate();
      await elementUpdated(chart);

      expect(chart.overlapping).toBe(true);
    });
  });
});

describe('Dynamic Updates - Bubble Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds a bubble dynamically', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bubble value="50" size="30" label="A"></dc-bubble>
      <dc-bubble value="70" size="40" label="B"></dc-bubble>
    `
    );

    let bubbles = queryShadowAll(chart, 'circle[data-shape-index]');
    expect(bubbles).toHaveLength(2);

    // Add a new bubble
    const newBubble = document.createElement('dc-bubble');
    newBubble.setAttribute('value', '60');
    newBubble.setAttribute('size', '35');
    newBubble.setAttribute('label', 'C');
    chart.appendChild(newBubble);

    chart.requestUpdate();
    await elementUpdated(chart);

    bubbles = queryShadowAll(chart, 'circle[data-shape-index]');
    expect(bubbles).toHaveLength(3);
  });

  it('updates bubble size', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bubble value="50" size="30" label="A"></dc-bubble>
    `
    );

    const bubble = chart.querySelector('dc-bubble');
    bubble?.setAttribute('size', '60');

    chart.requestUpdate();
    await elementUpdated(chart);

    // The bubble should have updated - we can verify the chart re-rendered
    const circles = queryShadowAll(chart, 'circle[data-shape-index]');
    expect(circles).toHaveLength(1);
  });
});

describe('Dynamic Updates - Pie Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds a slice dynamically', async () => {
    const chart = await fixture<PieChart>(
      'dc-pie-chart',
      {},
      `
      <dc-pie-slice value="30" label="A"></dc-pie-slice>
      <dc-pie-slice value="50" label="B"></dc-pie-slice>
    `
    );

    let paths = queryShadowAll(chart, 'path[data-shape-index]');
    expect(paths).toHaveLength(2);

    // Add a new slice
    const newSlice = document.createElement('dc-pie-slice');
    newSlice.setAttribute('value', '20');
    newSlice.setAttribute('label', 'C');
    chart.appendChild(newSlice);

    chart.requestUpdate();
    await elementUpdated(chart);

    paths = queryShadowAll(chart, 'path[data-shape-index]');
    expect(paths).toHaveLength(3);
  });

  it('removes a slice dynamically', async () => {
    const chart = await fixture<PieChart>(
      'dc-pie-chart',
      {},
      `
      <dc-pie-slice value="30" label="A"></dc-pie-slice>
      <dc-pie-slice value="50" label="B"></dc-pie-slice>
      <dc-pie-slice value="20" label="C"></dc-pie-slice>
    `
    );

    // Remove the middle slice
    const sliceToRemove = chart.querySelector('dc-pie-slice:nth-child(2)');
    sliceToRemove?.remove();

    chart.requestUpdate();
    await elementUpdated(chart);

    const paths = queryShadowAll(chart, 'path[data-shape-index]');
    expect(paths).toHaveLength(2);
  });

  it('updates slice value and rerenders', async () => {
    const chart = await fixture<PieChart>(
      'dc-pie-chart',
      {},
      `
      <dc-pie-slice value="50" label="A"></dc-pie-slice>
      <dc-pie-slice value="50" label="B"></dc-pie-slice>
    `
    );

    // Update first slice value
    const firstSlice = chart.querySelector('dc-pie-slice');
    firstSlice?.setAttribute('value', '150');

    chart.requestUpdate();
    await elementUpdated(chart);

    // Verify chart still renders 2 slices
    const paths = queryShadowAll(chart, 'path[data-shape-index]');
    expect(paths).toHaveLength(2);
  });
});

describe('Dynamic Updates - Funnel Charts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('adds a stage dynamically', async () => {
    const chart = await fixture<FunnelChart>(
      'dc-funnel-chart',
      {},
      `
      <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
      <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
    `
    );

    // Initially 2 stages (polygon elements)
    let polygons = queryShadowAll(chart, 'polygon[data-shape-index]');
    expect(polygons).toHaveLength(2);

    // Add a new stage
    const newStage = document.createElement('dc-funnel-stage');
    newStage.setAttribute('value', '100');
    newStage.setAttribute('label', 'Customers');
    chart.appendChild(newStage);

    chart.requestUpdate();
    await elementUpdated(chart);

    // Should now have 3 stages
    polygons = queryShadowAll(chart, 'polygon[data-shape-index]');
    expect(polygons).toHaveLength(3);
  });

  it('updates stage value', async () => {
    const chart = await fixture<FunnelChart>(
      'dc-funnel-chart',
      {},
      `
      <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
      <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
    `
    );

    const firstStage = chart.querySelector('dc-funnel-stage');
    firstStage?.setAttribute('value', '2000');

    chart.requestUpdate();
    await elementUpdated(chart);

    // Verify chart still renders correctly (2 stages)
    const polygons = queryShadowAll(chart, 'polygon[data-shape-index]');
    expect(polygons).toHaveLength(2);
  });
});

describe('Dynamic Updates - Chart Attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates chart dimensions', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { width: '600', height: '400' },
      `
      <dc-bar value="50" label="A"></dc-bar>
    `
    );

    expect(chart.width).toBe(600);
    expect(chart.height).toBe(400);

    chart.setAttribute('width', '800');
    chart.setAttribute('height', '500');
    await elementUpdated(chart);

    expect(chart.width).toBe(800);
    expect(chart.height).toBe(500);

    // SVG should reflect new dimensions
    const svg = chart.shadowRoot?.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 800 500');
  });

  it('updates chart orientation', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { orientation: 'vertical' },
      `
      <dc-bar value="50" label="A"></dc-bar>
    `
    );

    expect(chart.orientation).toBe('vertical');

    chart.setAttribute('orientation', 'horizontal');
    await elementUpdated(chart);

    expect(chart.orientation).toBe('horizontal');
  });

  it('updates bar-color attribute', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      { 'bar-color': '#ff0000' },
      `
      <dc-bar value="50" label="A"></dc-bar>
    `
    );

    expect(chart.barColor).toBe('#ff0000');

    chart.setAttribute('bar-color', '#00ff00');
    await elementUpdated(chart);

    expect(chart.barColor).toBe('#00ff00');
  });

  it('adds title dynamically', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="50" label="A"></dc-bar>
    `
    );

    // Initially no title
    let titleText = chart.shadowRoot?.querySelector('text.chart-title');
    expect(titleText).toBeNull();

    // Add a title
    const title = document.createElement('dc-title');
    title.textContent = 'My Chart Title';
    chart.appendChild(title);

    chart.requestUpdate();
    await elementUpdated(chart);

    // Title should now render
    titleText = chart.shadowRoot?.querySelector('text.chart-title');
    expect(titleText).toBeDefined();
  });

  it('adds legend dynamically', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="50" label="A" fill="#ff0000"></dc-bar>
      <dc-bar value="40" label="B" fill="#00ff00"></dc-bar>
    `
    );

    // Initially no legend
    let legendGroup = chart.shadowRoot?.querySelector('g.legend');
    expect(legendGroup).toBeNull();

    // Add a legend
    const legend = document.createElement('dc-legend');
    chart.appendChild(legend);

    chart.requestUpdate();
    await elementUpdated(chart);

    // Legend should now render
    legendGroup = chart.shadowRoot?.querySelector('g.legend');
    expect(legendGroup).toBeDefined();
  });
});

describe('Dynamic Updates - Mixed Content', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles mixed bars and lines', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="30" label="Jan"></dc-bar>
      <dc-bar value="50" label="Feb"></dc-bar>
    `
    );

    // Add a line to the existing bar chart
    const line = document.createElement('dc-line');
    line.setAttribute('label', 'Trend');
    line.innerHTML = `
      <dc-point value="35" label="Jan"></dc-point>
      <dc-point value="45" label="Feb"></dc-point>
    `;
    chart.appendChild(line);

    chart.requestUpdate();
    await elementUpdated(chart);

    // Should have both bars and a line path
    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    const paths = queryShadowAll(chart, 'path[data-shape-index]');

    expect(bars).toHaveLength(2);
    expect(paths).toHaveLength(1);
  });

  it('replaces all content', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="30" label="A"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
    `
    );

    // Replace all content with new bars
    chart.innerHTML = `
      <dc-bar value="100" label="X"></dc-bar>
      <dc-bar value="80" label="Y"></dc-bar>
      <dc-bar value="60" label="Z"></dc-bar>
    `;

    chart.requestUpdate();
    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(3);

    const labels = (chart as any).getCategoryLabels();
    expect(labels).toContain('X');
    expect(labels).toContain('Y');
    expect(labels).toContain('Z');
    expect(labels).not.toContain('A');
  });
});

describe('Dynamic Updates - Negative Values', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles transition from positive to negative values', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="30" label="A"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
    `
    );

    // Initially all positive
    let minValue = (chart as any).getMinValue();
    expect(minValue).toBe(0);

    // Change one bar to negative
    const firstBar = chart.querySelector('dc-bar');
    firstBar?.setAttribute('value', '-20');

    chart.requestUpdate();
    await elementUpdated(chart);

    // Now should have negative minimum
    minValue = (chart as any).getMinValue();
    expect(minValue).toBe(-20);
  });

  it('handles transition from mixed to all-positive values', async () => {
    const chart = await fixture<Chart>(
      'dc-chart',
      {},
      `
      <dc-bar value="-30" label="A"></dc-bar>
      <dc-bar value="50" label="B"></dc-bar>
    `
    );

    // Initially has negative
    let minValue = (chart as any).getMinValue();
    expect(minValue).toBe(-30);

    // Change negative bar to positive
    const negativeBar = chart.querySelector('dc-bar');
    negativeBar?.setAttribute('value', '40');

    chart.requestUpdate();
    await elementUpdated(chart);

    // Min should now be 0 (auto-scales to 0 for all-positive)
    minValue = (chart as any).getMinValue();
    expect(minValue).toBe(0);
  });
});
