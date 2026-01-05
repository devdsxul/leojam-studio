import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173'
const startWebServer = process.env.SKIP_WEBSERVER !== '1'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: startWebServer ? {
    command: 'npm run build && npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  } : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
