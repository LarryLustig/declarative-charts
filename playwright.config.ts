import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual regression testing.
 *
 * Visual tests capture screenshots of rendered charts and compare them
 * against baseline images to detect unintended visual changes.
 *
 * Usage:
 *   npm run test:visual           # Run visual tests
 *   npm run test:visual:update    # Update baseline snapshots
 */
export default defineConfig({
  // Directory containing visual tests
  testDir: './test/visual',

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests on CI only
  retries: process.env.CI ? 2 : 0,

  // Per-test budget. The default is 30s, which is also what the element
  // registration wait allows - so that wait could never fire its own error and
  // a slow page surfaced as a bare "test timeout" pointing at a stack frame.
  // 60s leaves room for the specific message to win, and gives a loaded machine
  // headroom without making a genuine hang slow to report.
  timeout: 60_000,

  // Limit parallel workers on CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test/visual/report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the dev server
    baseURL: 'http://localhost:5173',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Capture trace on failure for debugging
    trace: 'on-first-retry',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for reproducible screenshots
        viewport: { width: 1280, height: 720 },
      },
    },
    // Uncomment to add more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run the dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Snapshot configuration
  expect: {
    toHaveScreenshot: {
      /*
       * An absolute allowance, not a ratio.
       *
       * This was `maxDiffPixelRatio: 0.01`, which sounds small and is not: 1% of
       * a 1240x923 baseline is 11,445 pixels — a whole axis label, a moved
       * legend, a bar that changed height. It hid real changes twice. A
       * reference line's label was repositioned and the baseline did not
       * regenerate, so the fix looked like it had failed; and 13 of 30 baselines
       * turned out to be stale, including one where every y-axis tick had drifted
       * from 12/24/36/48 to 10/20/30/40/50 at 0.986% of pixels.
       *
       * Measured against a deliberate 2-unit nudge to every category label, which
       * changed nine charts by 339 to 10,505 pixels:
       *
       *   ratio 0.01   allows 11,445   caught 0 of 9
       *   ratio 0.001  allows  1,144   caught 2 of 9
       *   100 pixels   allows    100   caught 9 of 9
       *
       * A ratio is the wrong shape here: it hands the largest images the largest
       * blind spot, and those are the charts with the most to get wrong. 100
       * absolute pixels still absorbs an antialiasing fringe, and four
       * consecutive runs pass with no code change.
       *
       * If a Playwright or Chromium upgrade makes this noisy, raise it
       * deliberately and say so here — do not reach for a ratio again.
       */
      maxDiffPixels: 100,
      // Animation threshold
      animations: 'disabled',
    },
    toMatchSnapshot: {
      maxDiffPixels: 100,
    },
  },

  // Output directory for test artifacts
  outputDir: 'test/visual/test-results',
});
