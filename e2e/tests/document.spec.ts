import { test, expect, type Page } from '@playwright/test'
import { haveTenantCreds, TENANT_SKIP, stamp } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * DOCUMENTS (knowledge base) — real functional coverage against the live
 * workbench: create a document, write content, and prove it PERSISTS across a
 * full reload (the collaborative editor autosaves — persistence is the whole
 * point of a knowledge base).
 */

/** Ensure at least one teamspace exists (a document needs a space to live in). */
async function ensureTeamspace(page: Page): Promise<void> {
  const create = page.locator('button[id="document-string-CreateDocument"]')
  if (await create.isVisible().catch(() => false)) return
  await page.locator('button#tree-teamspaces').click()
  const form = page.locator('form[id="document:string:NewTeamspace"]')
  await form.waitFor({ state: 'visible', timeout: 15_000 })
  await form.locator('div[id="teamspace-title"] input').fill(stamp('e2e space'))
  await form.locator('button[type="submit"]').click()
  await create.waitFor({ state: 'visible', timeout: 30_000 })
}

test.describe('documents · create + persist', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  test('create a document, write content, content survives reload', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'document')
    await ensureTeamspace(page)

    const title = stamp('Doc')
    await page.locator('button[id="document-string-CreateDocument"]').click()
    const form = page.locator('form[id="document:string:CreateDocument"]')
    await form.waitFor({ state: 'visible', timeout: 15_000 })
    await form.locator('input').fill(title)
    await form.locator('button[type="submit"]').click()

    // The editor opens on the new document; write real content.
    const body = page.locator('div.textInput div.tiptap').first()
    await body.waitFor({ state: 'visible', timeout: 30_000 })
    const content = stamp('knowledge written by the e2e suite')
    await body.click()
    await page.keyboard.type(content)
    await expect(body).toContainText(content, { timeout: 15_000 })

    // Collaborative autosave, then the proof: a cold reload still has it all.
    await page.waitForTimeout(3_000)
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(
      page.locator('div.textInput div.tiptap').first(),
      'document content must survive a reload',
    ).toContainText(content, { timeout: 30_000 })
    await expect(
      page.locator(`button.hanzoaiNavItem-container:has-text("${title}")`).first(),
      'the document must be listed in its teamspace tree',
    ).toBeVisible({ timeout: 30_000 })
  })
})
