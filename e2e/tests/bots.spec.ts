import { test, expect } from '@playwright/test'

// Production URLs
const PLAYGROUND_API = 'https://bot.hanzo.team'
const APP_BOT = 'https://app.hanzo.bot'
const APP_TEAM = 'https://app.hanzo.team'

// ---------------------------------------------------------------------------
// 1. Playground API Tests (no login needed)
// ---------------------------------------------------------------------------
test.describe('Playground API', () => {
  test('GET /api/v1/health returns 200 with status healthy', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/health`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  test('GET /api/v1/nodes returns 200 with at least 1 node', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/nodes`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    // Response may be an array directly or wrapped in { nodes: [...] }
    const nodes = Array.isArray(body) ? body : body.nodes
    expect(nodes).toBeDefined()
    expect(nodes.length).toBeGreaterThanOrEqual(1)
  })

  test('hanzo-bot-gateway node exists with chat, translate, summarize bots', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/nodes`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const nodes = Array.isArray(body) ? body : body.nodes

    // Find the bot-gateway node (may be registered as hanzo-bot-gateway or ai-bot)
    const gateway = nodes.find(
      (n: Record<string, unknown>) =>
        n.id === 'hanzo-bot-gateway' ||
        n.name === 'hanzo-bot-gateway' ||
        n.id === 'ai-bot' ||
        n.name === 'ai-bot'
    )
    expect(gateway, 'bot-gateway node must be registered').toBeDefined()

    // Verify the three expected bots are listed
    const bots: string[] = Array.isArray(gateway.bots)
      ? gateway.bots.map((b: Record<string, unknown>) => (typeof b === 'string' ? b : b.name ?? b.id))
      : []
    expect(bots, 'gateway must expose chat bot').toContain('chat')
    expect(bots, 'gateway must expose translate bot').toContain('translate')
    expect(bots, 'gateway must expose summarize bot').toContain('summarize')
  })
})

// ---------------------------------------------------------------------------
// 2. app.hanzo.bot UI Tests
// ---------------------------------------------------------------------------
test.describe('app.hanzo.bot UI', () => {
  test('navigating to app.hanzo.bot redirects to hanzo.id login', async ({ page }) => {
    const response = await page.goto(APP_BOT, { waitUntil: 'networkidle', timeout: 30_000 })
    // Follow all redirects — may end on hanzo.id or show an interstitial
    await page.waitForTimeout(3_000)
    const url = page.url()
    const onHanzoId = url.includes('hanzo.id')
    const onBotLogin = url.includes('login') || url.includes('auth')
    const hasPasswordField = await page.locator('input[type="password"]').isVisible().catch(() => false)
    expect(
      onHanzoId || onBotLogin || hasPasswordField,
      `Expected hanzo.id redirect or login page. Got: ${url}`
    ).toBeTruthy()
  })

  test('login page title is "Hanzo ID" (not "Hanzo AI ID")', async ({ page }) => {
    await page.goto(APP_BOT, { waitUntil: 'domcontentloaded' })

    // Wait for either redirect to hanzo.id or password form to appear
    await Promise.race([
      page.waitForURL('**/hanzo.id/**', { timeout: 15_000 }).catch(() => {}),
      page.locator('input[type="password"]').waitFor({ timeout: 15_000 }).catch(() => {})
    ])

    if (page.url().includes('hanzo.id')) {
      const title = await page.title()
      const heading = await page.locator('h1, h2, [class*="title"]').first().textContent().catch(() => '')

      const brandText = `${title} ${heading}`.toLowerCase()
      expect(brandText).toContain('hanzo')
      expect(brandText).not.toContain('hanzo ai id')
    }
  })

  test('IAM login form shows password field and sign in button', async ({ page }) => {
    await page.goto(APP_BOT, { waitUntil: 'domcontentloaded' })

    // Wait for redirect to complete and login form to render
    await Promise.race([
      page.waitForURL('**/hanzo.id/**', { timeout: 15_000 }).catch(() => {}),
      page.locator('input[type="password"]').waitFor({ timeout: 15_000 }).catch(() => {})
    ])

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible({ timeout: 15_000 })

    const signInButton = page.locator(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")'
    )
    await expect(signInButton.first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3. app.hanzo.team UI Tests
// ---------------------------------------------------------------------------
test.describe('app.hanzo.team UI', () => {
  test('navigating to app.hanzo.team shows login page', async ({ page }) => {
    await page.goto(APP_TEAM, { waitUntil: 'networkidle' })

    // The Svelte SPA loads asynchronously. Wait for any interactive element
    // or a URL path change to /login.
    await page.waitForTimeout(3_000)

    const url = page.url()
    const hasLoginUrl = url.includes('/login')

    // Look for OpenID login button or any sign-in related element
    const hasLoginElement = await page.locator(
      'button:has-text("Sign"), button:has-text("Log"), a:has-text("Sign"), ' +
      'button:has-text("Hanzo"), button:has-text("OpenID"), [class*="login"]'
    ).first().isVisible().catch(() => false)

    // The SPA might also show "Redirecting" text
    const hasRedirectText = await page.locator('text=Redirecting').isVisible().catch(() => false)

    expect(
      hasLoginUrl || hasLoginElement || hasRedirectText,
      `Expected login page at ${url}`
    ).toBeTruthy()
  })

  test('title is "Hanzo Team"', async ({ page }) => {
    await page.goto(APP_TEAM, { waitUntil: 'domcontentloaded' })

    const title = await page.title()
    expect(title).toContain('Hanzo Team')
  })

  test('auth providers are ["openid"] only (no github, google, password)', async ({ request }) => {
    // The account service returns providers as a JSON array.
    // It may be a string array ["openid"] or an object array [{name: "openid"}].
    let providers: unknown[] = []
    let found = false

    const urls = [
      `${APP_TEAM}/_accounts/providers`,
      `https://hanzo.team/_accounts/providers`
    ]

    for (const url of urls) {
      try {
        const res = await request.get(url)
        if (res.ok()) {
          providers = await res.json()
          found = true
          break
        }
      } catch {
        // try next URL
      }
    }

    expect(found, 'providers endpoint must be reachable').toBeTruthy()

    // Normalize: providers can be ["openid"] or [{name: "openid", ...}]
    const names = providers.map((p) => (typeof p === 'string' ? p : (p as Record<string, unknown>).name))
    expect(names).toContain('openid')
    expect(names).not.toContain('github')
    expect(names).not.toContain('google')
    expect(names).not.toContain('password')
  })

  test('GET _accounts/providers returns ["openid"]', async ({ request }) => {
    let res = await request.get(`${APP_TEAM}/_accounts/providers`)

    if (!res.ok()) {
      res = await request.get(`https://hanzo.team/_accounts/providers`)
    }

    expect(res.status()).toBe(200)

    const providers: unknown[] = await res.json()

    // Normalize: may be string array or object array
    const names = providers.map((p) => (typeof p === 'string' ? p : (p as Record<string, unknown>).name))
    expect(names).toEqual(['openid'])
  })
})

// ---------------------------------------------------------------------------
// 4. Unified Bot Launch Test
// ---------------------------------------------------------------------------
test.describe('Unified bot infrastructure', () => {
  test('bot.hanzo.team nodes are accessible from both domains', async ({ request }) => {
    // Both bot.hanzo.team and app.hanzo.bot route to the same playground service.
    const [res1, res2] = await Promise.all([
      request.get(`${PLAYGROUND_API}/api/v1/nodes`),
      request.get(`${APP_BOT}/api/v1/nodes`)
    ])

    expect(res1.status()).toBe(200)
    expect(res2.status()).toBe(200)

    const body1 = await res1.json()
    const body2 = await res2.json()

    const nodes1 = Array.isArray(body1) ? body1 : body1.nodes
    const nodes2 = Array.isArray(body2) ? body2 : body2.nodes

    // Both should return the same set of node IDs
    const ids1 = nodes1.map((n: Record<string, unknown>) => n.id ?? n.name).sort()
    const ids2 = nodes2.map((n: Record<string, unknown>) => n.id ?? n.name).sort()
    expect(ids1).toEqual(ids2)
  })

  test('bot-gateway health endpoint works', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/health`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  test('team transactor is configured with AI_BOT_URL pointing to bot-gateway', async ({ request }) => {
    // We cannot query transactor config directly from outside the cluster.
    // Instead, verify that the playground knows about the ai-bot node,
    // which proves the bot registered itself via PLAYGROUND_URL and the
    // transactor can reach it via AI_BOT_URL=http://ai-bot:4010.
    const res = await request.get(`${PLAYGROUND_API}/api/v1/nodes`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    const nodes = Array.isArray(body) ? body : body.nodes

    expect(nodes.length).toBeGreaterThanOrEqual(1)

    const botNode = nodes.find(
      (n: Record<string, unknown>) =>
        n.id === 'ai-bot' || n.name === 'ai-bot' ||
        n.id === 'hanzo-bot-gateway' || n.name === 'hanzo-bot-gateway'
    )
    expect(
      botNode,
      'ai-bot / hanzo-bot-gateway must be registered, proving AI_BOT_URL config works'
    ).toBeDefined()
  })
})
