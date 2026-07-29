import { test, expect, type Page } from '@playwright/test'
import { haveTenantCreds, TENANT_SKIP, stamp } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * TRACKER — real functional coverage against the live workbench:
 *   issue create → appears in All Issues; comment on an issue; status change.
 * Every test is self-contained (creates what it asserts on) with a run-unique
 * name, so parallel runs never collide and nothing depends on seeded data.
 */

const form = (page: Page) => page.locator('form[id="tracker:string:NewIssue"]')

/** Create an issue through the real New Issue form; returns when it is listed. */
async function createIssue(page: Page, ws: string, title: string): Promise<void> {
  await gotoView(page, ws, 'tracker')
  await page.locator('a[href$="all-issues"]').first().click()
  await page.locator('label[data-id="tab-all"]').first().click().catch(() => {})
  await page.locator('#tracker-string-NewIssue').click()
  await form(page).locator('input[type="text"]').fill(title)
  await form(page).locator('div.tiptap').fill(`created by the e2e functional suite: ${title}`)
  await page.locator('button > span', { hasText: 'Create issue' }).click()
  await expect(
    page.locator('div.listGrid a', { hasText: title }).first(),
    `issue "${title}" must appear in All Issues`,
  ).toBeVisible({ timeout: 30_000 })
}

test.describe('tracker · issues', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  test('create an issue and see it in All Issues', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await createIssue(page, ws, stamp('Issue create'))
  })

  test('comment on an issue and see the comment persist', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    const title = stamp('Issue comment')
    await createIssue(page, ws, title)

    await page.locator('div.listGrid a', { hasText: title }).first().click()
    const comment = stamp('A real comment')
    const input = page.locator('div.text-input div.tiptap').first()
    await input.waitFor({ state: 'visible', timeout: 30_000 })
    await input.fill(comment)
    await page.locator('g#Send').first().click()
    await expect(
      page.locator('div.showMore-content p', { hasText: comment }).first(),
      'the comment must render in the issue activity',
    ).toBeVisible({ timeout: 30_000 })

    // Persistence: a fresh load of the same issue still shows the comment.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(
      page.locator('div.showMore-content p', { hasText: comment }).first(),
      'the comment must survive a reload',
    ).toBeVisible({ timeout: 30_000 })
  })

  test('change an issue status Backlog → In Progress', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    const title = stamp('Issue status')
    await createIssue(page, ws, title)

    await page.locator('div.listGrid a', { hasText: title }).first().click()
    const status = page.locator('//span[text()="Status"]/../button[1]//span').first()
    await status.waitFor({ state: 'visible', timeout: 30_000 })
    await status.click()
    await page.locator('.selectPopup button', { hasText: 'In Progress' }).first().click()
    await expect(
      page.locator('//span[text()="Status"]/../button[1]//span').first(),
      'the status control must show the new state',
    ).toHaveText(/in progress/i, { timeout: 30_000 })
  })
})
