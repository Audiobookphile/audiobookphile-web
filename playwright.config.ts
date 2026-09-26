import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Serial workers avoid concurrent login races against the same account
  // (rate limits / session thrash) while still allowing project parallelism.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker. Two workers was a genuine source of flakiness, not just speed:
  // each spec file performs its own login against the same account, so they
  // raced on rate limits, and the pair of concurrent Chromium instances plus
  // the Next dev server was enough to exhaust swap on a 16 GB host and get the
  // dev server OOM-killed mid-run, which surfaces as
  // `ERR_CONNECTION_REFUSED on /login` and looks exactly like a product
  // regression. The gate is three files; serialising it costs little and makes
  // a red run mean something.
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', // dev-only fallback
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /passkey|twofa/i,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      testIgnore: /passkey|twofa/i,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: /passkey|twofa/i,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'chromium-stateful',
      testMatch: /passkey|twofa/i,
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'bun run dev',
    // When testing a deployed preview (CI), wait on the remote URL instead of
    // booting a local dev server; reuseExistingServer skips the launch since
    // the remote site answers.
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', // dev-only fallback
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
