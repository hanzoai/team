import { test, expect } from '@playwright/test'

const APP_TEAM = 'https://app.hanzo.team'
const HANZO_ID = 'https://hanzo.id'

// ---------------------------------------------------------------------------
// 1. No "Huly" anywhere on app.hanzo.team
// ---------------------------------------------------------------------------
test.describe('app.hanzo.team branding', () => {
  test('no "Huly" text visible on the page', async ({ page }) => {
    await page.goto(APP_TEAM, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(3_000)

    const bodyText = await page.locator('body').textContent().catch(() => '')
    // Check visible text does not contain "Huly" (case insensitive)
    const hulyMatch = (bodyText ?? '').match(/\bHuly\b/i)
    expect(hulyMatch, 'Page should not contain "Huly" text').toBeNull()
  })

  test('title is "Hanzo Team" (not "Huly")', async ({ page }) => {
    await page.goto(APP_TEAM, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = await page.title()
    expect(title).toContain('Hanzo Team')
    expect(title.toLowerCase()).not.toContain('huly')
  })

  test('no "hardcoreeng" in page source', async ({ page }) => {
    await page.goto(APP_TEAM, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Check the full HTML source for references to hardcoreeng
    const html = await page.content()
    expect(html.toLowerCase()).not.toContain('hardcoreeng')
  })
})

// ---------------------------------------------------------------------------
// 2. hanzo.id branding
// ---------------------------------------------------------------------------
test.describe('hanzo.id branding', () => {
  test('shows "Hanzo ID" not "Hanzo AI ID"', async ({ page }) => {
    await page.goto(HANZO_ID, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    const title = await page.title()
    const heading = await page
      .locator('h1, h2, [class*="title"], [class*="brand"]')
      .first()
      .textContent()
      .catch(() => '')

    const brandText = `${title} ${heading}`
    // Should contain "Hanzo" but not "Hanzo AI ID"
    expect(brandText.toLowerCase()).toContain('hanzo')
    expect(brandText).not.toContain('Hanzo AI ID')
  })
})

// ---------------------------------------------------------------------------
// 3. Favicon paths use /hanzoai/ not /huly/
// ---------------------------------------------------------------------------
test.describe('Favicon branding', () => {
  const SITES = [
    { name: 'app.hanzo.team', url: APP_TEAM },
    { name: 'hanzo.id', url: HANZO_ID },
  ]

  for (const { name, url } of SITES) {
    test(`${name} favicon does not reference /huly/`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      // Get all link[rel*="icon"] elements and their hrefs
      const faviconHrefs = await page
        .locator('link[rel*="icon"]')
        .evaluateAll((links: HTMLLinkElement[]) => links.map((l) => l.href))

      for (const href of faviconHrefs) {
        expect(href.toLowerCase(), `Favicon ${href} should not contain /huly/`).not.toContain(
          '/huly/'
        )
      }
    })
  }
})
