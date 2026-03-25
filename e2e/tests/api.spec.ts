import { test, expect } from '@playwright/test'

const PLAYGROUND_API = 'https://bot.hanzo.team'
const CHAT = 'https://chat.hanzo.ai'
const CONSOLE = 'https://console.hanzo.ai'
const BILLING = 'https://billing.hanzo.ai'

const PLAYGROUND_KEY = process.env.PLAYGROUND_API_KEY ?? ''
const playgroundHeaders = PLAYGROUND_KEY
  ? { Authorization: `Bearer ${PLAYGROUND_KEY}`, 'Content-Type': 'application/json' }
  : { 'Content-Type': 'application/json' }

// ---------------------------------------------------------------------------
// 1. Bot playground API health
// ---------------------------------------------------------------------------
test.describe('Bot playground API', () => {
  test('GET /api/v1/health returns healthy', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/health`)
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  test('GET /api/v1/nodes returns registered bots', async ({ request }) => {
    const res = await request.get(`${PLAYGROUND_API}/api/v1/nodes`, {
      headers: playgroundHeaders,
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    const nodes = Array.isArray(body) ? body : body.nodes
    expect(nodes).toBeDefined()
    expect(nodes.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Chat service
// ---------------------------------------------------------------------------
test.describe('Chat service', () => {
  test('chat.hanzo.ai returns 200', async ({ request }) => {
    const res = await request.get(CHAT, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// 3. Console
// ---------------------------------------------------------------------------
test.describe('Console service', () => {
  test('console.hanzo.ai returns 200', async ({ request }) => {
    const res = await request.get(CONSOLE, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })
})

// ---------------------------------------------------------------------------
// 4. Billing
// ---------------------------------------------------------------------------
test.describe('Billing service', () => {
  test('billing.hanzo.ai returns 200', async ({ request }) => {
    const res = await request.get(BILLING, { timeout: 30_000 })
    expect(res.status()).toBeLessThan(400)
  })
})
