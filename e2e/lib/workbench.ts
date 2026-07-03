import { Page, WebSocket, expect } from '@playwright/test'

// Credentials come from the environment — never hardcoded. The email defaults to
// the seeded superuser; the password is required (CI sources it from KMS).
export const EMAIL = process.env.TEAM_E2E_EMAIL || 'z@hanzo.ai'
export const PASSWORD = process.env.TEAM_E2E_PASSWORD || ''

export type TokenPayload = { account?: string; workspace?: string; extra?: { org?: string } }

// decodeToken reads the JWT payload segment (base64url) the front appends to the
// transactor URL — the workspace token. No verification here: the test asserts on
// its SHAPE (account + workspace present), which is exactly what the transactor
// requires before it will hold the socket open.
export function decodeToken(jwt: string): TokenPayload {
  try {
    const seg = jwt.split('.')[1]
    return JSON.parse(Buffer.from(seg, 'base64url').toString())
  } catch {
    return {}
  }
}

// TransactorWatch records the transactor WebSocket lifecycle so a spec can assert
// the socket OPENED with a well-formed workspace token and STAYED open (a 401
// "invalid workspace token" surfaces as an immediate close with no frames).
export class TransactorWatch {
  url = ''
  token: TokenPayload = {}
  closedEarly = false
  framesReceived = 0
  private opened = false

  constructor(page: Page) {
    page.on('websocket', (ws: WebSocket) => {
      if (!ws.url().includes('/transactor/')) return
      this.opened = true
      this.url = ws.url()
      const m = ws.url().match(/\/transactor\/([^/?]+)/)
      if (m) this.token = decodeToken(m[1])
      ws.on('framereceived', () => { this.framesReceived++ })
      ws.on('close', () => {
        // A close before any frame arrived == the server rejected the token.
        if (this.framesReceived === 0) this.closedEarly = true
      })
    })
  }

  get connected() {
    return this.opened && !!this.token.account && !!this.token.workspace
  }
}

// login drives a FRESH OIDC login (no stored session) all the way to a rendered
// workbench. Returns the workspace slug from the resulting URL. The caller may
// pass a TransactorWatch (constructed before this call) to assert the socket.
export async function login(page: Page): Promise<string> {
  if (!PASSWORD) throw new Error('TEAM_E2E_PASSWORD is required for the e2e login flow')

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByText(/continue with hanzo/i).first().click()

  await page.waitForURL(/hanzo\.id/, { timeout: 30_000 })
  const inputs = page.locator('input')
  await inputs.nth(0).fill(EMAIL)
  await inputs.nth(1).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).first().click()

  await page.waitForURL(/\/workbench\//, { timeout: 60_000 })
  const slug = new URL(page.url()).pathname.split('/')[2]
  expect(slug, 'workbench URL should carry a workspace slug').toBeTruthy()
  return slug
}

// openApp switches to a workbench application by its model id (client-side nav —
// no page reload), then waits for the app frame to settle. Returns nothing; the
// caller asserts on the rendered content or on eject-guards.
export async function openApp(page: Page, appId: string): Promise<void> {
  await page.locator(`[id="${appId}"]`).first().click()
  await page.waitForTimeout(2500)
}

export const APP = {
  inbox: 'app-notification:string:Inbox',
  contacts: 'app-contact:string:Contacts',
  chat: 'app-chunter:string:ApplicationLabelChunter',
  tracker: 'app-tracker:string:TrackerApplication',
  hr: 'app-hr:string:HRApplication',
}

// assertNoEject fails if the SPA has been bounced to a foreign sign-in guard
// (the BLOCKER-2 symptom: a shared hanzo-admin-guard hijack to console.hanzo.ai).
export function assertNoEject(page: Page) {
  const u = page.url()
  expect(u, 'must not be ejected to a foreign sign-in guard').not.toMatch(/console\.hanzo\.ai|\/signin/)
}
