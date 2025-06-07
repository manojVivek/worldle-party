import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { 
      outputFolder: process.env.E2E_REPORTS_DIR ? `${process.env.E2E_REPORTS_DIR}/playwright-report` : 'playwright-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: process.env.E2E_REPORTS_DIR ? `${process.env.E2E_REPORTS_DIR}/test-results.json` : 'test-results.json'
    }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Take screenshot after each test
        screenshot: 'only-on-failure',
      },
    },
  ],

  webServer: undefined, // We handle server startup in our e2e-test script
});