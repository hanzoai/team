import { test, expect } from '@playwright/test'
import { haveTenantCreds, TENANT_SKIP } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * SETTINGS + BILLING + WORKSPACE SWITCHER — the account surfaces:
 *   settings view renders; the usage/billing surface is reachable inside it;
 *   the workspace switcher opens and lists the user's workspaces.
 */

test.describe('settings · account surfaces', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  test('settings view renders', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'setting')
    await expect(
      page.getByText('Settings').filter({ visible: true }).first(),
      'the Settings view must render its anchor',
    ).toBeVisible({ timeout: 30_000 })
  })

  test('usage/billing surface is reachable from settings', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'setting')

    const billing = page.getByText(/usage & billing|billing/i).filter({ visible: true }).first()
    await expect(billing, 'a Usage & billing entry must exist in settings').toBeVisible({ timeout: 30_000 })
    await billing.click()
    // The billing/usage panel: tier + usage vocabulary from the billing plugin.
    await expect(
      page.getByText(/tier|usage|plan|upgrade|storage/i).filter({ visible: true }).first(),
      'the billing panel must render usage/tier content',
    ).toBeVisible({ timeout: 30_000 })
  })

  // Workspace switching moved to the org-grouped top-left switcher (the .antiLogo
  // menu), grouping workspaces by owning IAM org — no longer in the account popup.
  test('org-grouped switcher opens and lists workspaces', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'tracker')

    await page.locator('.antiLogo').first().click()
    await expect(
      page.locator('.popup, .antiPopup, [class*="selectWorkspace"], div[class*="workspace"]').first(),
      'the switcher must open and list at least one workspace',
    ).toBeVisible({ timeout: 30_000 })
  })
})
