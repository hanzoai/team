import { test, expect } from '@playwright/test'
import { login, openApp, assertNoEject, APP, TransactorWatch } from '../lib/workbench'

// BLOCKER 1 — workspace-token issuance on a FRESH OIDC login.
// The regression: after a fresh login the transactor was handed a null/invalid
// workspace token and returned 401 "invalid workspace token", killing all live
// data. This asserts the socket opens with a well-formed {account, workspace}
// token AND stays open, and the workbench renders as OWNER.
test('fresh OIDC login connects the transactor and renders the workbench', async ({ page }) => {
  const tx = new TransactorWatch(page)

  const slug = await login(page)
  expect(slug).toBeTruthy()

  // The Tracker (default workbench app) header is the "rendered as OWNER" signal —
  // an unauthenticated / token-rejected session never gets this far.
  await expect(page.getByText('Tracker').first()).toBeVisible({ timeout: 30_000 })

  // The transactor socket must have opened with a signed workspace token carrying
  // both account and workspace, and must not have been closed before any frame.
  await expect.poll(() => tx.connected, { timeout: 30_000 }).toBe(true)
  expect(tx.token.workspace, 'workspace token carries a workspace uuid').toBeTruthy()
  expect(tx.token.account, 'workspace token carries an account uuid').toBeTruthy()
  expect(tx.closedEarly, 'transactor must not reject the token (early close)').toBe(false)
})

// BLOCKER 2 — a data action must not eject the SPA to a foreign sign-in guard.
// The regression: opening a channel bounced to console.hanzo.ai/signin via a
// shared hanzo-admin-guard. This walks the primary modules and asserts the SPA
// stays on hanzo.team and each module renders its own chrome.
test('navigating modules keeps the session (no foreign-guard eject)', async ({ page }) => {
  await login(page)

  await openApp(page, APP.inbox)
  assertNoEject(page)
  await expect(page).toHaveURL(/\/notification\b/)

  await openApp(page, APP.contacts)
  assertNoEject(page)
  await expect(page.getByText('Person').first()).toBeVisible()

  await openApp(page, APP.chat)
  assertNoEject(page)
  await expect(page.getByText('Channels').first()).toBeVisible()
})
