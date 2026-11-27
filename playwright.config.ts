import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT || 4179)
const BASE_URL = `http://127.0.0.1:${PORT}`

function resolveExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  }
  // Prefer Playwright-managed browser when installed; fall back to system Chromium if present.
  const candidates = [
    '/home/z/.cache/ms-playwright/chromium-1255/chrome-linux-arm64/chrome',
    '/usr/local/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ]
  if (process.env.CI) return undefined
  return candidates.find((p) => existsSync(p))
}

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: resolveExecutablePath(),
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
      ],
    },
  },
  webServer: {
    command: 'node e2e/serve-dist.mjs',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
})
