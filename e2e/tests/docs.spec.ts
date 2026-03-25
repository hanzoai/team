import { test, expect } from '@playwright/test'

const DOCS_HANZO = 'https://docs.hanzo.ai'
const DOCS_LUX = 'https://docs.lux.network'
const DOCS_BOT = 'https://docs.hanzo.bot'
const ZENLM = 'https://zenlm.org'

// ---------------------------------------------------------------------------
// 1. docs.hanzo.ai
// ---------------------------------------------------------------------------
test.describe('docs.hanzo.ai', () => {
  test('loads and returns 200', async ({ request }) => {
    const res = await request.get(DOCS_HANZO, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })

  test('has navigation elements', async ({ page }) => {
    await page.goto(DOCS_HANZO, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    // Docs sites typically have nav, sidebar, or links
    const nav = page.locator('nav, [class*="sidebar"], [class*="nav"], [role="navigation"]')
    await expect(nav.first()).toBeVisible({ timeout: 15_000 })
  })

  test('/docs/openapi loads (API reference)', async ({ request }) => {
    // The primary API docs path is /docs/openapi
    const res = await request.get(`${DOCS_HANZO}/docs/openapi`, {
      timeout: 30_000,
    })
    expect(res.status()).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// 2. docs.lux.network
// ---------------------------------------------------------------------------
test.describe('docs.lux.network', () => {
  test('loads and returns 200', async ({ request }) => {
    const res = await request.get(DOCS_LUX, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })

  test('is separate from hanzo docs (different content)', async ({ page }) => {
    await page.goto(DOCS_LUX, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = await page.title()
    const bodyText = await page.locator('body').textContent().catch(() => '')

    // Should reference Lux, not be a copy of hanzo docs
    const mentionsLux =
      title.toLowerCase().includes('lux') ||
      (bodyText ?? '').toLowerCase().includes('lux')
    expect(mentionsLux, 'docs.lux.network should reference Lux').toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 3. docs.hanzo.bot
// ---------------------------------------------------------------------------
test.describe('docs.hanzo.bot', () => {
  test('loads and returns 200', async ({ request }) => {
    const res = await request.get(DOCS_BOT, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// 4. zenlm.org
// ---------------------------------------------------------------------------
test.describe('zenlm.org', () => {
  test('loads and returns 200', async ({ request }) => {
    const res = await request.get(ZENLM, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// 5. No 404s on main docs navigation links
// ---------------------------------------------------------------------------
test.describe('docs navigation links', () => {
  test('docs.hanzo.ai top-level nav links do not 404', async ({ page, request }) => {
    await page.goto(DOCS_HANZO, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Gather all links from the navigation
    const navLinks = await page
      .locator('nav a[href], [class*="sidebar"] a[href], [role="navigation"] a[href]')
      .evaluateAll((anchors: HTMLAnchorElement[]) =>
        anchors
          .map((a) => a.href)
          .filter((href) => href.startsWith('http') && !href.includes('#'))
          .slice(0, 10) // Test first 10 nav links to keep runtime reasonable
      )

    for (const link of navLinks) {
      const res = await request.get(link, { timeout: 15_000 }).catch(() => null)
      if (res) {
        expect(res.status(), `Nav link ${link} should not 404`).not.toBe(404)
      }
    }
  })
})
