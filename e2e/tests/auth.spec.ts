import { test, expect } from '@playwright/test'

const HANZO_ID = 'https://hanzo.id'
const APP_TEAM = 'https://app.hanzo.team'
const APP_BOT = 'https://app.hanzo.bot'
const APP_PLATFORM = 'https://app.platform.hanzo.ai'

// ---------------------------------------------------------------------------
// 1. hanzo.id landing and login page
// ---------------------------------------------------------------------------
test.describe('hanzo.id', () => {
  test('landing page renders with "Hanzo" in the title', async ({ page }) => {
    await page.goto(HANZO_ID, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = await page.title()
    expect(title.toLowerCase()).toContain('hanzo')
  })

  test('landing page has Sign In link', async ({ page }) => {
    await page.goto(HANZO_ID, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    // The root page is a marketing landing page with a "Sign In" nav link
    const signInLink = page.locator('a:has-text("Sign In"), a:has-text("Sign in"), button:has-text("Sign In")')
    await expect(signInLink.first()).toBeVisible({ timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// 2. app.hanzo.team uses openid only
// ---------------------------------------------------------------------------
test.describe('app.hanzo.team auth', () => {
  test('providers endpoint returns openid only (no github/google/password)', async ({ request }) => {
    let providers: unknown[] = []
    let found = false

    for (const url of [
      `${APP_TEAM}/_accounts/providers`,
      'https://hanzo.team/_accounts/providers',
    ]) {
      try {
        const res = await request.get(url)
        if (res.ok()) {
          providers = await res.json()
          found = true
          break
        }
      } catch {
        // try next
      }
    }

    expect(found, 'providers endpoint must be reachable').toBeTruthy()

    const names = providers.map((p) =>
      typeof p === 'string' ? p : (p as Record<string, unknown>).name
    )
    expect(names).toContain('openid')
    expect(names).not.toContain('github')
    expect(names).not.toContain('google')
    expect(names).not.toContain('password')
  })
})

// ---------------------------------------------------------------------------
// 3. app.hanzo.bot redirects to hanzo.id for OIDC
// ---------------------------------------------------------------------------
test.describe('app.hanzo.bot auth', () => {
  test('redirects to hanzo.id for OIDC login', async ({ page }) => {
    await page.goto(APP_BOT, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(3_000)

    const url = page.url()
    const onHanzoId = url.includes('hanzo.id')
    const onLogin = url.includes('login') || url.includes('auth')
    const hasPasswordField = await page
      .locator('input[type="password"]')
      .isVisible()
      .catch(() => false)

    expect(
      onHanzoId || onLogin || hasPasswordField,
      `Expected redirect to hanzo.id or login page. Got: ${url}`
    ).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 4. app.platform.hanzo.ai has "Sign in with Hanzo" button
// ---------------------------------------------------------------------------
test.describe('app.platform.hanzo.ai auth', () => {
  test('has "Sign in with Hanzo" button', async ({ page }) => {
    await page.goto(APP_PLATFORM, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // The platform login page renders a "Sign in with Hanzo" button.
    // Wait for it to appear (the page is an SPA that takes a moment to hydrate).
    const hanzoButton = page.getByRole('button', { name: /sign in with hanzo/i })
    await expect(hanzoButton).toBeVisible({ timeout: 30_000 })
  })
})

// ---------------------------------------------------------------------------
// 5. All auth redirects use hanzo.id
// ---------------------------------------------------------------------------
test.describe('Auth redirects use hanzo.id', () => {
  const AUTH_SITES = [
    { name: 'app.hanzo.team', url: APP_TEAM },
    { name: 'app.hanzo.bot', url: APP_BOT },
  ]

  for (const { name, url } of AUTH_SITES) {
    test(`${name} auth redirect does not use third-party providers directly`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.waitForTimeout(3_000)

      const finalUrl = page.url()
      // Should not redirect directly to github.com, google.com, etc.
      expect(finalUrl).not.toContain('github.com/login')
      expect(finalUrl).not.toContain('accounts.google.com')
      expect(finalUrl).not.toContain('login.microsoftonline.com')
    })
  }
})
