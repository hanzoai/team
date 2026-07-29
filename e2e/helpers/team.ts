/**
 * ONE hanzo.team browser sign-in. hanzo.team has NO local form: the only login
 * surface is the 'Continue with Hanzo' SSO button → the server's
 * /v1/team/account/auth/openid redirect → the hanzo.id authorize form
 * ("Email or username" + Password + "Sign in") → the callback token drops the
 * browser on /workbench/<ws>/tracker.
 *
 * `teamJourney` drives that real flow end to end. `teamLogin` is the cached
 * entry every spec uses: the first call per worker runs the journey and captures
 * the context's storageState (the team token lives in hanzo.team localStorage +
 * cookies); later calls rehydrate that state onto the fresh context — one real
 * login per worker, same as the console helper.
 *
 * Canonical source: hanzoai/universe e2e/helpers/team.ts. The two suites live in
 * separate repos, so this is a byte-for-byte mirror (below this header) — change
 * both together.
 */
import type { BrowserContext, Page } from '@playwright/test'
import { TEAM_URL, TENANT_USER, TENANT_PASSWORD, haveTenantCreds, TENANT_SKIP } from './config'

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>
let cache: { state: StorageState; ws: string } | null = null

/** Extract the workspace slug from a /workbench/<ws>/… URL. */
function wsOf(page: Page): string {
  const m = page.url().match(/\/workbench\/([^/?#]+)/)
  if (!m) throw new Error(`not on a workbench URL: ${page.url()}`)
  return m[1]
}

/**
 * A `page.goto` that survives a TRANSIENT network drop (ERR_CONNECTION_RESET /
 * _CLOSED / ERR_NETWORK_CHANGED / net::ERR_ABORTED) by retrying a few times.
 * This is pure transport hardening — it never touches an assertion. It exists
 * because the CF edge in front of hanzo.team occasionally resets the first
 * connection of a fresh context (seen both on flaky home uplinks and as CI
 * transients); a genuine bad route still surfaces after the retries exhaust.
 */
async function gotoRetry(page: Page, url: string, timeout = 60_000): Promise<void> {
  const transient = /ERR_CONNECTION|ERR_NETWORK|ERR_TIMED_OUT|ERR_ABORTED|ERR_SOCKET|net::/i
  let last: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
      return
    } catch (err) {
      last = err
      if (!transient.test(String(err))) throw err
      await page.waitForTimeout(1_500 * (attempt + 1))
    }
  }
  throw last
}

/** The full real SSO journey (always drives the redirect). Returns the ws slug. */
export async function teamJourney(page: Page): Promise<string> {
  if (!haveTenantCreds()) throw new Error(TENANT_SKIP)
  await gotoRetry(page, TEAM_URL)
  const sso = page.getByText(/continue with hanzo/i).first()
  await sso.waitFor({ state: 'visible', timeout: 30_000 })
  await sso.click()
  await page.waitForURL(/\/login\/oauth\/authorize/, { timeout: 30_000 })

  // The hanzo.id sign-in SPA: fields carry no name/placeholder, so fall back to
  // "the one non-password input" (same hardening as the hanzo.app helper).
  const email = page.getByLabel(/email|username/i).first()
  let field = email
  try {
    await email.waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    field = page.locator('input:not([type="password"])').first()
    await field.waitFor({ state: 'visible', timeout: 15_000 })
  }
  await field.fill(TENANT_USER)
  await page.locator('input[type="password"]').first().fill(TENANT_PASSWORD)
  await page.getByRole('button', { name: /^sign in$/i }).first().click()

  await page.waitForURL((u) => u.href.startsWith(`${TEAM_URL}/workbench/`), { timeout: 60_000 })
  return wsOf(page)
}

/** Rehydrate a cached login onto this page's fresh context. Null when stale. */
async function rehydrate(page: Page, state: StorageState): Promise<string | null> {
  await page.context().addCookies(state.cookies).catch(() => {})
  const origin = state.origins.find((o) => o.origin === TEAM_URL)
  if (!origin) return null
  await page.context().addInitScript(
    ({ origin, entries }) => {
      if (location.origin !== origin) return
      for (const { name, value } of entries) localStorage.setItem(name, value)
    },
    { origin: TEAM_URL, entries: origin.localStorage },
  )
  await gotoRetry(page, TEAM_URL)
  await page.waitForURL((u) => u.href.startsWith(`${TEAM_URL}/workbench/`), { timeout: 45_000 })
  return wsOf(page)
}

/** Worker-cached login: one real journey, then storageState reuse. Returns ws. */
export async function teamLogin(page: Page): Promise<string> {
  if (!haveTenantCreds()) throw new Error(TENANT_SKIP)
  if (cache) {
    const ws = await rehydrate(page, cache.state).catch(() => null)
    if (ws) return ws
    cache = null // stale token — fall through to a fresh journey
  }
  const ws = await teamJourney(page)
  cache = { state: await page.context().storageState(), ws }
  return ws
}

/** Navigate an authenticated page to a workbench rail app. */
export async function gotoView(page: Page, ws: string, alias: string): Promise<void> {
  await gotoRetry(page, `${TEAM_URL}/workbench/${ws}/${alias}`)
  // Under parallel-session churn the SPA occasionally stalls on its loading
  // shell (clock header, no workbench). One reload recovers a stalled boot; a
  // view that genuinely cannot render still fails its anchor assertion after.
  const rail = page.locator('[id^="app-"]').first()
  try {
    await rail.waitFor({ state: 'visible', timeout: 20_000 })
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
  }
}
