import { test, expect } from '@playwright/test'

// All 21 production endpoints that must return a successful HTTP response.
// We use request context (no browser) for speed. We accept 200-399 as success
// since some sites redirect (301/302) before landing, and Playwright's fetch
// follows redirects automatically — so we should land on 200.
const ENDPOINTS: { name: string; url: string }[] = [
  { name: 'hanzo.ai', url: 'https://hanzo.ai' },
  { name: 'hanzo.team', url: 'https://hanzo.team' },
  { name: 'app.hanzo.team', url: 'https://app.hanzo.team' },
  { name: 'hanzo.bot', url: 'https://hanzo.bot' },
  { name: 'app.hanzo.bot', url: 'https://app.hanzo.bot' },
  { name: 'hanzo.app', url: 'https://hanzo.app' },
  { name: 'hanzo.chat', url: 'https://hanzo.chat' },
  { name: 'chat.hanzo.ai', url: 'https://chat.hanzo.ai' },
  { name: 'console.hanzo.ai', url: 'https://console.hanzo.ai' },
  { name: 'hanzo.id', url: 'https://hanzo.id' },
  { name: 'kms.hanzo.ai', url: 'https://kms.hanzo.ai' },
  { name: 'app.platform.hanzo.ai', url: 'https://app.platform.hanzo.ai' },
  { name: 'o11y.hanzo.ai', url: 'https://o11y.hanzo.ai' },
  { name: 'billing.hanzo.ai', url: 'https://billing.hanzo.ai' },
  { name: 'zt.hanzo.ai', url: 'https://zt.hanzo.ai' },
  { name: 'zrok.hanzo.ai', url: 'https://zrok.hanzo.ai' },
  { name: 'analytics.hanzo.ai', url: 'https://analytics.hanzo.ai' },
  { name: 'docs.hanzo.ai', url: 'https://docs.hanzo.ai' },
  { name: 'docs.lux.network', url: 'https://docs.lux.network' },
  { name: 'docs.hanzo.bot', url: 'https://docs.hanzo.bot' },
  { name: 'zenlm.org', url: 'https://zenlm.org' },
]

test.describe('Production endpoints', () => {
  for (const { name, url } of ENDPOINTS) {
    test(`${name} returns 200`, async ({ request }) => {
      const res = await request.get(url, { timeout: 30_000 })
      expect(res.status(), `${name} (${url}) returned ${res.status()}`).toBeLessThan(400)
    })
  }
})
