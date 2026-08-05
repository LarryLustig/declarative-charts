import { describe, it, expect, afterEach } from 'vitest';
import {
  elementUpdated,
  nextFrame,
  queryShadowAll,
  simulateHtmxSwap,
  createComplexChart,
} from './setup';

// Import all chart components
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
import '../../src/pie-chart';
import '../../src/chart-pie-slice';
import '../../src/funnel-chart';
import '../../src/chart-funnel-stage';
import '../../src/chart-palette';
import '../../src/chart-fill';

import { Chart } from '../../src/chart';
import { PieChart } from '../../src/pie-chart';
import { FunnelChart } from '../../src/funnel-chart';

/**
 * Integration tests simulating htmx-style DOM updates.
 *
 * htmx typically updates content by replacing innerHTML of containers.
 * These tests verify that declarative charts handle such updates correctly.
 *
 * Key htmx patterns tested:
 * - hx-swap="innerHTML" - Replace inner content (most common)
 * - hx-swap="outerHTML" - Replace entire element
 * - hx-swap-oob - Out-of-band updates to multiple elements
 * - Partial content updates
 */

describe('htmx-style innerHTML Swaps', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('replacing chart children', () => {
    it('swaps chart content like hx-swap="innerHTML"', async () => {
      // Initial chart
      const container = await createComplexChart(`
        <dc-chart id="sales-chart" width="600" height="400">
          <dc-bar value="100" label="Q1"></dc-bar>
          <dc-bar value="150" label="Q2"></dc-bar>
        </dc-chart>
      `);

      const chart = container.querySelector('#sales-chart') as Chart;
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);

      // Simulate htmx swapping the chart's innerHTML
      simulateHtmxSwap(
        chart,
        `
        <dc-bar value="200" label="Q1"></dc-bar>
        <dc-bar value="180" label="Q2"></dc-bar>
        <dc-bar value="220" label="Q3"></dc-bar>
        <dc-bar value="250" label="Q4"></dc-bar>
      `
      );

      await elementUpdated(chart);

      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(4);

      // Verify new max value
      const maxValue = (chart as any).getMaxValue();
      expect(maxValue).toBe(250);
    });

    it('swaps from bar chart to line chart data', async () => {
      const container = await createComplexChart(`
        <dc-chart id="chart" width="600" height="400">
          <dc-bar value="100" label="Jan"></dc-bar>
          <dc-bar value="150" label="Feb"></dc-bar>
        </dc-chart>
      `);

      const chart = container.querySelector('#chart') as Chart;

      // Initially has bars
      let bars = queryShadowAll(chart, 'rect[data-shape-index]');
      expect(bars).toHaveLength(2);

      // Swap to line data
      simulateHtmxSwap(
        chart,
        `
        <dc-line label="Trend">
          <dc-point value="100" label="Jan"></dc-point>
          <dc-point value="150" label="Feb"></dc-point>
          <dc-point value="120" label="Mar"></dc-point>
        </dc-line>
      `
      );

      await elementUpdated(chart);

      // Now should have line path, no bars
      bars = queryShadowAll(chart, 'rect[data-shape-index]');
      const paths = queryShadowAll(chart, 'path[data-shape-index]');

      expect(bars).toHaveLength(0);
      expect(paths).toHaveLength(1);
    });

    it('swaps pie chart slices', async () => {
      const container = await createComplexChart(`
        <dc-pie-chart id="pie" width="400" height="400">
          <dc-pie-slice value="30" label="A"></dc-pie-slice>
          <dc-pie-slice value="70" label="B"></dc-pie-slice>
        </dc-pie-chart>
      `);

      const chart = container.querySelector('#pie') as PieChart;

      // Swap to new slices
      simulateHtmxSwap(
        chart,
        `
        <dc-pie-slice value="25" label="Category 1"></dc-pie-slice>
        <dc-pie-slice value="35" label="Category 2"></dc-pie-slice>
        <dc-pie-slice value="40" label="Category 3"></dc-pie-slice>
      `
      );

      await elementUpdated(chart);

      const paths = queryShadowAll(chart, 'path[data-shape-index]');
      expect(paths).toHaveLength(3);
    });

    it('swaps funnel stages', async () => {
      const container = await createComplexChart(`
        <dc-funnel-chart id="funnel" width="400" height="300">
          <dc-funnel-stage value="1000" label="Visitors"></dc-funnel-stage>
          <dc-funnel-stage value="500" label="Leads"></dc-funnel-stage>
        </dc-funnel-chart>
      `);

      const chart = container.querySelector('#funnel') as FunnelChart;

      // Swap to new stages
      simulateHtmxSwap(
        chart,
        `
        <dc-funnel-stage value="5000" label="Impressions"></dc-funnel-stage>
        <dc-funnel-stage value="2000" label="Clicks"></dc-funnel-stage>
        <dc-funnel-stage value="500" label="Signups"></dc-funnel-stage>
        <dc-funnel-stage value="100" label="Purchases"></dc-funnel-stage>
      `
      );

      await elementUpdated(chart);

      // Verify 4 stages rendered (polygon elements)
      const polygons = queryShadowAll(chart, 'polygon[data-shape-index]');
      expect(polygons).toHaveLength(4);
    });
  });

  describe('replacing container innerHTML', () => {
    it('replaces entire chart in container', async () => {
      const container = await createComplexChart(`
        <div id="chart-container">
          <dc-chart width="600" height="400">
            <dc-bar value="50" label="Initial"></dc-bar>
          </dc-chart>
        </div>
      `);

      const chartContainer = container.querySelector(
        '#chart-container'
      ) as HTMLElement;

      // Replace with entirely new chart
      simulateHtmxSwap(
        chartContainer,
        `
        <dc-pie-chart width="400" height="400">
          <dc-slice value="60" label="Slice A"></dc-slice>
          <dc-slice value="40" label="Slice B"></dc-slice>
        </dc-pie-chart>
      `
      );

      await nextFrame();

      // Wait for new chart to update
      const newChart = chartContainer.querySelector('dc-pie-chart') as PieChart;
      if (newChart) {
        await elementUpdated(newChart);
      }

      // Old chart should be gone
      expect(chartContainer.querySelector('dc-chart')).toBeNull();

      // New pie chart should exist
      expect(chartContainer.querySelector('dc-pie-chart')).toBeDefined();
    });
  });
});

describe('htmx-style outerHTML Swaps', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('replaces chart element completely', async () => {
    const container = await createComplexChart(`
      <div id="wrapper">
        <dc-chart id="old-chart" width="600" height="400">
          <dc-bar value="50" label="Old"></dc-bar>
        </dc-chart>
      </div>
    `);

    const wrapper = container.querySelector('#wrapper') as HTMLElement;
    const oldChart = wrapper.querySelector('#old-chart') as Chart;

    // Create new chart element (simulating outerHTML swap)
    const newChartHtml = `
      <dc-chart id="new-chart" width="800" height="500">
        <dc-bar value="100" label="New A"></dc-bar>
        <dc-bar value="150" label="New B"></dc-bar>
      </dc-chart>
    `;

    // Replace old chart with new one
    oldChart.outerHTML = newChartHtml;

    await nextFrame();

    const newChart = wrapper.querySelector('#new-chart') as Chart;
    if (newChart) {
      await elementUpdated(newChart);
    }

    // Verify new chart properties
    expect(wrapper.querySelector('#old-chart')).toBeNull();
    expect(newChart).toBeDefined();
    expect(newChart?.width).toBe(800);
  });
});

describe('htmx-style Out-of-Band Updates', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates multiple charts independently', async () => {
    const container = await createComplexChart(`
      <div id="dashboard">
        <dc-chart id="chart-1" width="400" height="300">
          <dc-bar value="100" label="A"></dc-bar>
        </dc-chart>
        <dc-pie-chart id="chart-2" width="300" height="300">
          <dc-pie-slice value="50" label="X"></dc-pie-slice>
          <dc-pie-slice value="50" label="Y"></dc-pie-slice>
        </dc-pie-chart>
      </div>
    `);

    const chart1 = container.querySelector('#chart-1') as Chart;
    const chart2 = container.querySelector('#chart-2') as PieChart;

    // Update chart 1
    simulateHtmxSwap(
      chart1,
      `
      <dc-bar value="200" label="A"></dc-bar>
      <dc-bar value="150" label="B"></dc-bar>
    `
    );

    // Update chart 2
    simulateHtmxSwap(
      chart2,
      `
      <dc-pie-slice value="30" label="X"></dc-pie-slice>
      <dc-pie-slice value="40" label="Y"></dc-pie-slice>
      <dc-pie-slice value="30" label="Z"></dc-pie-slice>
    `
    );

    // Request updates for both
    await elementUpdated(chart1);
    await elementUpdated(chart2);

    // Verify both updated correctly
    const bars = queryShadowAll(chart1, 'rect[data-shape-index]');
    const slices = queryShadowAll(chart2, 'path[data-shape-index]');

    expect(bars).toHaveLength(2);
    expect(slices).toHaveLength(3);
  });

  it('updates chart with legend and title', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-title>Old Title</dc-title>
        <dc-bar value="50" label="A"></dc-bar>
        <dc-legend></dc-legend>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap with new title and data
    simulateHtmxSwap(
      chart,
      `
      <dc-title>Updated Dashboard</dc-title>
      <dc-bar value="80" label="New A" fill="#ff0000"></dc-bar>
      <dc-bar value="60" label="New B" fill="#00ff00"></dc-bar>
      <dc-legend position="right"></dc-legend>
    `
    );

    await elementUpdated(chart);

    // Verify title updated
    const titleElement = chart.querySelector('dc-title');
    expect(titleElement?.textContent).toBe('Updated Dashboard');

    // Verify bars updated
    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(2);
  });
});

describe('htmx-style Partial Updates', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates only bar values via targeted swap', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-title>Sales Report</dc-title>
        <dc-bar id="bar-a" value="50" label="Q1"></dc-bar>
        <dc-bar id="bar-b" value="60" label="Q2"></dc-bar>
        <dc-legend></dc-legend>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;
    const barA = chart.querySelector('#bar-a');
    const barB = chart.querySelector('#bar-b');

    // Simulate targeted updates to individual bars
    barA?.setAttribute('value', '100');
    barB?.setAttribute('value', '120');

    await elementUpdated(chart);

    // Title and legend should still exist
    expect(chart.querySelector('dc-title')).toBeDefined();
    expect(chart.querySelector('dc-legend')).toBeDefined();

    // Max value should reflect new values
    const maxValue = (chart as any).getMaxValue();
    expect(maxValue).toBe(120);
  });

  it('adds new data element without replacing existing', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="60" label="B"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Add new bar element (simulating targeted insertion)
    const newBar = document.createElement('dc-bar');
    newBar.setAttribute('value', '70');
    newBar.setAttribute('label', 'C');
    chart.appendChild(newBar);

    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(3);
  });
});

describe('htmx-style Real-time Updates', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles rapid successive updates', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;
    const bar = chart.querySelector('dc-bar');

    // Simulate rapid updates (like from polling or SSE)
    for (let i = 0; i < 5; i++) {
      bar?.setAttribute('value', String(50 + i * 10));
    }

    await elementUpdated(chart);

    // Final value should be 90 (50 + 4*10)
    const maxValue = (chart as any).getMaxValue();
    expect(maxValue).toBe(90);
  });

  it('handles updates while chart is still rendering', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Queue multiple content changes without waiting
    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="60" label="B"></dc-bar>
    `
    );

    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="70" label="C"></dc-bar>
    `
    );

    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="80" label="D"></dc-bar>
    `
    );

    await elementUpdated(chart);

    // Should end up with the last update
    const labels = (chart as any).getCategoryLabels();
    expect(labels).toContain('D');
    expect(labels).not.toContain('A');
    expect(labels).not.toContain('B');
    expect(labels).not.toContain('C');
  });
});

describe('htmx-style Updates with Palettes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates chart that references external palette', async () => {
    const container = await createComplexChart(`
      <dc-palette id="my-palette">
        <dc-fill label="Low" fill="#ff0000"></dc-fill>
        <dc-fill label="Medium" fill="#ffff00"></dc-fill>
        <dc-fill label="High" fill="#00ff00"></dc-fill>
      </dc-palette>
      <dc-chart id="chart" palette="my-palette" width="600" height="400">
        <dc-bar value="30" label="Low"></dc-bar>
        <dc-bar value="60" label="Medium"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Add a new bar that should pick up palette color
    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="30" label="Low"></dc-bar>
      <dc-bar value="60" label="Medium"></dc-bar>
      <dc-bar value="90" label="High"></dc-bar>
    `
    );

    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(3);
  });

  it('swaps palette content', async () => {
    const container = await createComplexChart(`
      <dc-palette id="colors">
        <dc-fill label="A" fill="#ff0000"></dc-fill>
        <dc-fill label="B" fill="#00ff00"></dc-fill>
      </dc-palette>
      <dc-chart id="chart" palette="colors" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="60" label="B"></dc-bar>
      </dc-chart>
    `);

    const palette = container.querySelector('#colors') as HTMLElement;
    const chart = container.querySelector('#chart') as Chart;

    // Swap palette colors
    simulateHtmxSwap(
      palette,
      `
      <dc-fill label="A" fill="#0000ff"></dc-fill>
      <dc-fill label="B" fill="#ff00ff"></dc-fill>
    `
    );

    await elementUpdated(chart);

    // Chart should still render (palette updates may require explicit refresh)
    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(2);
  });
});

describe('htmx-style Updates with Grouped/Stacked Bars', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('swaps bar group content', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar-group label="Q1">
          <dc-bar value="30" label="Product A"></dc-bar>
          <dc-bar value="40" label="Product B"></dc-bar>
        </dc-bar-group>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap with multiple groups
    simulateHtmxSwap(
      chart,
      `
      <dc-bar-group label="Q1">
        <dc-bar value="30" label="Product A"></dc-bar>
        <dc-bar value="40" label="Product B"></dc-bar>
      </dc-bar-group>
      <dc-bar-group label="Q2">
        <dc-bar value="50" label="Product A"></dc-bar>
        <dc-bar value="60" label="Product B"></dc-bar>
      </dc-bar-group>
    `
    );

    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(4);
  });

  it('swaps stacked bar segments', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar label="Q1">
          <dc-bar-segment value="30" label="Part A"></dc-bar-segment>
          <dc-bar-segment value="20" label="Part B"></dc-bar-segment>
        </dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap with updated segments
    simulateHtmxSwap(
      chart,
      `
      <dc-bar label="Q1">
        <dc-bar-segment value="40" label="Part A"></dc-bar-segment>
        <dc-bar-segment value="30" label="Part B"></dc-bar-segment>
        <dc-bar-segment value="20" label="Part C"></dc-bar-segment>
      </dc-bar>
    `
    );

    await elementUpdated(chart);

    // Total should now be 90
    const maxValue = (chart as any).getMaxValue();
    expect(maxValue).toBe(90);
  });
});

describe('htmx-style Edge Cases', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('handles swap to empty content', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
        <dc-bar value="60" label="B"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap to empty
    simulateHtmxSwap(chart, '');

    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(0);
  });

  it('handles swap with whitespace-only content', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap to whitespace
    simulateHtmxSwap(chart, '   \n\t  ');

    await elementUpdated(chart);

    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(0);
  });

  it('handles malformed HTML gracefully', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart" width="600" height="400">
        <dc-bar value="50" label="A"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap with somewhat malformed but parseable HTML
    // Browser will auto-close tags
    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="60" label="B">
    `
    );

    await elementUpdated(chart);

    // Should still work - browser fixes the HTML
    const bars = queryShadowAll(chart, 'rect[data-shape-index]');
    expect(bars).toHaveLength(1);
  });

  it('preserves chart attributes during content swap', async () => {
    const container = await createComplexChart(`
      <dc-chart id="chart"
                width="800"
                height="500"
                orientation="horizontal"
                bar-color="#ff0000"
                gutter="20">
        <dc-bar value="50" label="A"></dc-bar>
      </dc-chart>
    `);

    const chart = container.querySelector('#chart') as Chart;

    // Swap content only
    simulateHtmxSwap(
      chart,
      `
      <dc-bar value="100" label="New"></dc-bar>
    `
    );

    await elementUpdated(chart);

    // Attributes should be preserved
    expect(chart.width).toBe(800);
    expect(chart.height).toBe(500);
    expect(chart.orientation).toBe('horizontal');
    expect(chart.barColor).toBe('#ff0000');
    expect(chart.gutter).toBe(20);
  });
});
