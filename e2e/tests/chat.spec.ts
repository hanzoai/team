import { test, expect, type Page } from '@playwright/test'
import { haveTenantCreds, TENANT_SKIP, stamp } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * CHAT (chunter) — real functional coverage against the live workbench:
 *   channel create + message send; direct message send.
 * NOTE: chat/messaging has a known live breakage under active fix — reds here
 * are evidence, not flake. Do not weaken these assertions.
 */

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.locator('div[class~="text-editor-view"]').first()
  await input.waitFor({ state: 'visible', timeout: 30_000 })
  await input.fill(text)
  await page.locator('g#Send').first().click()
  await expect(
    page.locator('.activityMessage', { hasText: text }).first(),
    'the sent message must render in the channel',
  ).toBeVisible({ timeout: 30_000 })
}

test.describe('chat · channels + direct messages', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  test('create a channel and send a message that persists', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'chunter')

    const channel = stamp('e2e').toLowerCase().replace(/\s+/g, '-')
    await page.locator('.hanzoaiNavPanel-header > button.type-button-icon').first().click()
    await page.getByRole('button', { name: 'New channel' }).click()
    await page.getByPlaceholder('New channel').fill(channel)
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // The new channel opens (or is one click away in the nav).
    const inNav = page.locator('div.antiPanel-navigator').getByRole('button', { name: channel }).first()
    if (!(await page.locator('div[class~="text-editor-view"]').first().isVisible().catch(() => false))) {
      await inNav.click()
    }
    const message = stamp('hello channel')
    await sendMessage(page, message)

    // Persistence: reload the view — the message is still in the channel.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(
      page.locator('.activityMessage', { hasText: message }).first(),
      'the channel message must survive a reload',
    ).toBeVisible({ timeout: 30_000 })
  })

  test('send a direct message', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'chunter')

    await page.locator('.hanzoaiNavPanel-header > button.type-button-icon').first().click()
    await page.getByRole('button', { name: 'New direct chat' }).click()
    const rows = page.locator('.popup .users button.row')
    await rows.first().waitFor({ state: 'visible', timeout: 30_000 })
    await rows.first().click()
    await page.locator('.hanzoaiModal-footer button:has-text("Next")').click()
    await page.locator('.hanzoaiModal-footer button:has-text("Create")').click().catch(() => {})

    await sendMessage(page, stamp('hello direct'))
  })
})
