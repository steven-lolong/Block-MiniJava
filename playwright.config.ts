import { defineConfig } from '@playwright/test';

const uiTestPort = Number(process.env.BMJ_UI_TEST_PORT || '4173');
const uiTestUrl = `http://127.0.0.1:${uiTestPort}`;

/** Browser coverage for the application shell and its persisted responsive layout. */
export default defineConfig({
  testDir: './test/ui',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002
    }
  },
  use: {
    baseURL: uiTestUrl,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run build && node test/ui/server.js',
    url: uiTestUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [{ name: 'chromium' }]
});
