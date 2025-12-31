import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for declarative charts.
 *
 * These tests capture screenshots of various chart configurations and compare
 * them against baseline images to detect unintended visual changes.
 *
 * Baseline images are stored in ./charts.spec.ts-snapshots/
 *
 * Commands:
 *   npm run test:visual           # Run tests and compare against baselines
 *   npm run test:visual:update    # Update baseline snapshots
 */

// Base URL for test fixtures
const FIXTURES_URL = '/test/visual/fixtures/charts.html';

// Wait for charts to fully render (Lit update cycle + SVG rendering)
async function waitForChartRender(page: ReturnType<typeof test['page']>) {
  // Wait for custom elements to be defined
  await page.waitForFunction(() => {
    return (
      customElements.get('dc-chart') !== undefined &&
      customElements.get('dc-pie-chart') !== undefined &&
      customElements.get('dc-funnel-chart') !== undefined &&
      customElements.get('dc-stage-chart') !== undefined
    );
  });

  // Wait for Lit updates to complete
  await page.waitForFunction(() => {
    const charts = document.querySelectorAll(
      'dc-chart, dc-pie-chart, dc-funnel-chart, dc-stage-chart'
    );
    return Array.from(charts).every(
      (chart) => (chart as any).updateComplete !== undefined
    );
  });

  // Small delay for SVG rendering
  await page.waitForTimeout(100);
}

// Get the chart container element for a specific chart
async function getChartContainer(
  page: ReturnType<typeof test['page']>,
  chartId: string
) {
  return page.locator(`#${chartId}`);
}

test.describe('Bar Charts', () => {
  test('basic bar chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bar-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bar-basic');
    await expect(container).toHaveScreenshot('bar-basic.png');
  });

  test('horizontal bar chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bar-horizontal`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bar-horizontal');
    await expect(container).toHaveScreenshot('bar-horizontal.png');
  });

  test('bar chart with negative values', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bar-negative`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bar-negative');
    await expect(container).toHaveScreenshot('bar-negative.png');
  });

  test('grouped bar chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bar-grouped`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bar-grouped');
    await expect(container).toHaveScreenshot('bar-grouped.png');
  });

  test('stacked bar chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bar-stacked`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bar-stacked');
    await expect(container).toHaveScreenshot('bar-stacked.png');
  });
});

test.describe('Line Charts', () => {
  test('basic line chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=line-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'line-basic');
    await expect(container).toHaveScreenshot('line-basic.png');
  });

  test('multiple line chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=line-multiple`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'line-multiple');
    await expect(container).toHaveScreenshot('line-multiple.png');
  });
});

test.describe('Area Charts', () => {
  test('basic area chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=area-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'area-basic');
    await expect(container).toHaveScreenshot('area-basic.png');
  });

  test('stacked area chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=area-stacked`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'area-stacked');
    await expect(container).toHaveScreenshot('area-stacked.png');
  });

  test('overlapping area chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=area-overlapping`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'area-overlapping');
    await expect(container).toHaveScreenshot('area-overlapping.png');
  });
});

test.describe('Bubble Charts', () => {
  test('basic bubble chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=bubble-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'bubble-basic');
    await expect(container).toHaveScreenshot('bubble-basic.png');
  });
});

test.describe('Pie Charts', () => {
  test('basic pie chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=pie-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'pie-basic');
    await expect(container).toHaveScreenshot('pie-basic.png');
  });

  test('donut chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=pie-donut`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'pie-donut');
    await expect(container).toHaveScreenshot('pie-donut.png');
  });
});

test.describe('Funnel Charts', () => {
  test('basic funnel chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=funnel-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'funnel-basic');
    await expect(container).toHaveScreenshot('funnel-basic.png');
  });

  test('chevron funnel chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=funnel-chevron`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'funnel-chevron');
    await expect(container).toHaveScreenshot('funnel-chevron.png');
  });
});

test.describe('Stage Charts', () => {
  test('basic stage chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=stage-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'stage-basic');
    await expect(container).toHaveScreenshot('stage-basic.png');
  });

  test('stage chart with value-based sizing', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=stage-value-sizing`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'stage-value-sizing');
    await expect(container).toHaveScreenshot('stage-value-sizing.png');
  });

  test('stage chart with zero value handling', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=stage-zero-handling`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'stage-zero-handling');
    await expect(container).toHaveScreenshot('stage-zero-handling.png');
  });
});

test.describe('Swatches', () => {
  test('swatches with palettes and shapes', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=swatches`);
    // Wait for dc-swatch to be defined
    await page.waitForFunction(() => {
      return customElements.get('dc-swatch') !== undefined;
    });
    // Wait for swatches to render
    await page.waitForTimeout(200);

    const container = await getChartContainer(page, 'swatches');
    await expect(container).toHaveScreenshot('swatches.png');
  });
});

test.describe('Chart Features', () => {
  test('chart with patterns', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=patterns`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'patterns');
    await expect(container).toHaveScreenshot('patterns.png');
  });

  test('chart with custom axis', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=axis-custom`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'axis-custom');
    await expect(container).toHaveScreenshot('axis-custom.png');
  });

  test('chart with legend at top', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=legend-positions`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'legend-positions');
    await expect(container).toHaveScreenshot('legend-top.png');
  });

  test('line chart with time axis', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=time-axis`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'time-axis');
    await expect(container).toHaveScreenshot('time-axis.png');
  });
});
