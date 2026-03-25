import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'endpoints',
      testMatch: /endpoints\.spec\.ts/,
    },
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'docs',
      testMatch: /docs\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'platform',
      testMatch: /platform\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'branding',
      testMatch: /branding\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
    },
    {
      name: 'bots',
      testMatch: /bots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
