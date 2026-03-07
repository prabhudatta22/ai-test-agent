// @ts-check
import { defineConfig, devices } from '@playwright/test';

//export default config;

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
  reporter: [
  //['./global/util/CustomSummaryReport.js'],
  ['list'],
  ["@reportportal/agent-js-playwright", {
      endpoint: 'http://localhost:8080/api/v1',
      project: 'superadmin_personal',
      apiKey: 'LocalReportPortalAPIKey_6yWTW7KeS7moOvACvJy9tfWXhM9lcfEydyT3HwiP71fPUHikUBMRWhMUHwmSjhiE',
      launch:  'QA',
      // attributes: [
      //   { key: 'branch', value: 'local' },
      //   { key: 'env', value: 'qa' }
      // ]
    }],
  // ["html", { outputFolder: 'playwright-report' }],
  // ['./global/util/CustomReporter.js'],
  // ["allure-playwright"],
  ['blob', { outputFile: `./report-playwright.zip` }], 

  
],

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
        channel: 'chrome' },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
