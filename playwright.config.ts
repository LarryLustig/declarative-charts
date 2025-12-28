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
      // Allow small pixel differences (anti-aliasing, font rendering)
      maxDiffPixelRatio: 0.01,
      // Animation threshold
      animations: 'disabled',
    },
    toMatchSnapshot: {
      // Threshold for image comparison
      maxDiffPixelRatio: 0.01,
    },
  },

  // Output directory for test artifacts
  outputDir: 'test/visual/test-results',
});
