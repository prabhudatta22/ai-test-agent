// @ts-check
import { defineConfig, devices } from '@playwright/test';

//export default config;

function buildReporters() {
  const reporters = [['list'], ['blob', { outputFile: `./report-playwright.zip` }]];

  // ReportPortal is optional. Enable explicitly to avoid failures in restricted
  // environments (e.g., sandboxes that block network interface enumeration).
  const rpEnabled = String(process.env.RP_ENABLE || '').toLowerCase() === 'true';
  if (!rpEnabled) return reporters;

  const endpoint = process.env.RP_ENDPOINT;
  const project = process.env.RP_PROJECT;
  const apiKey = process.env.RP_API_KEY;
  const launch = process.env.RP_LAUNCH || 'QA';

  if (!endpoint || !project || !apiKey) {
    // If partially configured, do not fail the whole test run.
    // Keep console reporters only.
    return reporters;
  }

  reporters.splice(1, 0, [
    '@reportportal/agent-js-playwright',
    {
      endpoint,
      project,
      apiKey,
      launch,
    },
  ]);

  return reporters;
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env.qa') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './output',  // Updated test directory path
  timeout: 4 * 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 300000  // Increased timeout for expectations
  },

  //globalSetup : require.resolve('./global/util/globalSetup.js'),
  //globalTeardown: require.resolve('./global/util/PlaywrightServerReport.js'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: buildReporters(),

  // reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    actionTimeout: 30000,  // Added explicit action timeout
    trace: 'retain-on-failure', //'on-first-retry'
    screenshot: 'only-on-failure',
    video: 'on',
    viewport: null,  // Allow full viewport
    launchOptions: {
      args: ["--start-maximized"]
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'],
        deviceScaleFactor: undefined,
        viewport:null,
        launchOptions: {
          args: ["--start-maximized"],
        },
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
