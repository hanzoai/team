import { defineConfig, devices } from '@playwright/test'

// The e2e target. Defaults to the live deployment; override with TEAM_E2E_BASE_URL
// to point at a local stack. One config, one way — the specs never hardcode a host.
const baseURL = process.env.TEAM_E2E_BASE_URL || 'https://hanzo.team'

export default defineConfig({
  testDir: './tests',
  // A real OIDC round-trip + workbench boot is not instant; give it room.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  // Login mutates the owner's own workspace serially — no parallel writers.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Chromium in CI containers runs as root → --no-sandbox is required. It is
    // also what lets the headless browser complete TLS to the CF-proxied hosts.
    launchOptions: { args: ['--no-sandbox'] },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
