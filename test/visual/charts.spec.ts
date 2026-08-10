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

type Page = ReturnType<typeof test['page']>;

/** Every chart element a fixture might contain. */
const CHART_TAGS = [
  'dc-chart',
  'dc-pie-chart',
  'dc-funnel-chart',
  'dc-stage-chart',
  'dc-radar-chart',
] as const;

const CHART_SELECTOR = CHART_TAGS.join(', ');

/**
 * How long to wait for the module graph to evaluate and register elements.
 *
 * Deliberately generous and deliberately *explicit*. This wait used to inherit
 * the per-test timeout, so a page whose script never finished failed with a bare
 * stack frame and no statement of what was being awaited.
 */
const DEFINITION_TIMEOUT = 30_000;

/**
 * Wait until every named custom element has been registered.
 *
 * Waiting for the elements a component itself waits for matters here: a
 * `<dc-swatch>` defers a `requestUpdate()` behind
 * `customElements.whenDefined('dc-palette')` and a `requestAnimationFrame`, so
 * waiting only for `dc-swatch` leaves that tail outstanding.
 */
async function waitForCustomElements(page: Page, tags: readonly string[]) {
  try {
    await page.waitForFunction(
      (names: string[]) => names.every((n) => customElements.get(n) !== undefined),
      tags as unknown as string[],
      { timeout: DEFINITION_TIMEOUT }
    );
  } catch (cause) {
    const missing = await page
      .evaluate(
        (names: string[]) => names.filter((n) => !customElements.get(n)),
        tags as unknown as string[]
      )
      .catch(() => tags as unknown as string[]);
    throw new Error(
      `Custom elements were never registered after ${DEFINITION_TIMEOUT}ms: ` +
        `${missing.join(', ')}. The fixture loads /src/index.ts, so this usually ` +
        `means the module graph failed to evaluate rather than that rendering was slow.`,
      { cause }
    );
  }
}

/**
 * Wait until the matched elements have finished rendering and painting.
 *
 * The step this replaces asserted `chart.updateComplete !== undefined`, which is
 * true the instant an element upgrades and never awaits anything - so the whole
 * suite's settling was really being done by a fixed 100ms sleep. A sleep is
 * flaky by construction: it passes or fails on how loaded the machine is, which
 * is precisely the difference between a developer's idle laptop and CI.
 *
 * The loop is not defensive padding. Lit resolves `updateComplete` to `false`
 * when a further update was scheduled while the last one ran, and these charts
 * re-render from a `MutationObserver` over their own light-DOM children, so one
 * await genuinely is not enough.
 */
async function waitForRendered(page: Page, selector: string) {
  await page.evaluate(async (sel: string) => {
    const els = Array.from(document.querySelectorAll(sel)) as Array<{
      updateComplete?: Promise<boolean>;
    }>;

    for (let i = 0; i < 20; i++) {
      const settled = await Promise.all(els.map((e) => e.updateComplete ?? true));
      if (settled.every(Boolean)) break;
    }

    // Text metrics decide label layout, so an unloaded font changes the picture.
    await document.fonts.ready;

    // Two frames: one to run the pending paint, one to be sure it happened.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  }, selector);
}

// Wait for charts to fully render (Lit update cycle + SVG rendering)
async function waitForChartRender(page: Page) {
  await waitForCustomElements(page, CHART_TAGS);
  await waitForRendered(page, CHART_SELECTOR);
}

// Get the chart container element for a specific chart
async function getChartContainer(page: Page, chartId: string) {
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
    // dc-swatch resolves its colour only once dc-palette and dc-fill exist, so
    // wait for all three - waiting for dc-swatch alone leaves that tail open.
    await waitForCustomElements(page, ['dc-swatch', 'dc-palette', 'dc-fill']);
    await waitForRendered(page, 'dc-swatch');

    const container = await getChartContainer(page, 'swatches');
    await expect(container).toHaveScreenshot('swatches.png');
  });
});

test.describe('Radar Charts', () => {
  test('radar chart with two series', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=radar-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'radar-basic');
    await expect(container).toHaveScreenshot('radar-basic.png');
  });

  test('scatter plot with two series', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=scatter-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'scatter-basic');
    await expect(container).toHaveScreenshot('scatter-basic.png');
  });
});

test.describe('Reference Lines and Bands', () => {
  test('reference lines and a band', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=reference-basic`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'reference-basic');
    await expect(container).toHaveScreenshot('reference-basic.png');
  });

  test('reference on a horizontal chart', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=reference-horizontal`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'reference-horizontal');
    await expect(container).toHaveScreenshot('reference-horizontal.png');
  });
});

test.describe('Label Placement', () => {
  test('rotated category labels', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=label-rotate`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'label-rotate');
    await expect(container).toHaveScreenshot('label-rotate.png');
  });

  test('colliding value labels', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=label-collision`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'label-collision');
    await expect(container).toHaveScreenshot('label-collision.png');
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

  /**
   * The evenly-spaced fixture above cannot show whether a time axis is working:
   * weekly samples look identical whether they are placed by date or by index.
   * These samples are deliberately irregular - three days apart, then seven
   * weeks - so the gaps in the drawn line are the assertion.
   */
  test('line chart with unevenly sampled time axis', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=time-axis-uneven`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'time-axis-uneven');
    await expect(container).toHaveScreenshot('time-axis-uneven.png');
  });

  test('line chart with time axis', async ({ page }) => {
    await page.goto(`${FIXTURES_URL}?chart=time-axis`);
    await waitForChartRender(page);

    const container = await getChartContainer(page, 'time-axis');
    await expect(container).toHaveScreenshot('time-axis.png');
  });
});
