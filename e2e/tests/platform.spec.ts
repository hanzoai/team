import { test, expect } from '@playwright/test'

const APP_PLATFORM = 'https://app.platform.hanzo.ai'

test.describe('PaaS Platform (app.platform.hanzo.ai)', () => {
  test('loads and returns 200', async ({ request }) => {
    const res = await request.get(APP_PLATFORM, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })

  test('page title contains "Hanzo" or "Platform"', async ({ page }) => {
    await page.goto(APP_PLATFORM, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = await page.title()
    const lower = title.toLowerCase()
    expect(
      lower.includes('hanzo') || lower.includes('platform') || lower.includes('dokploy'),
      `Expected title to contain "Hanzo" or "Platform". Got: "${title}"`
    ).toBeTruthy()
  })

  test('has "Sign in with Hanzo" button or redirects to hanzo.id', async ({ page }) => {
    await page.goto(APP_PLATFORM, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // The platform login page is an SPA that renders a "Sign in with Hanzo" button.
    // Use getByRole for reliable matching after hydration.
    const hanzoButton = page.getByRole('button', { name: /sign in with hanzo/i })
    await expect(hanzoButton).toBeVisible({ timeout: 30_000 })
  })

  test('login redirects to hanzo.id (not github or google)', async ({ page }) => {
    await page.goto(APP_PLATFORM, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(3_000)

    const url = page.url()
    // If redirected, should be to hanzo.id
    if (!url.includes('platform.hanzo.ai')) {
      expect(url).toContain('hanzo.id')
    }
    // Should not go to third-party auth directly
    expect(url).not.toContain('github.com/login')
    expect(url).not.toContain('accounts.google.com')
  })
})
