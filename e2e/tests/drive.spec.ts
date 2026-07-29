import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { haveTenantCreds, TENANT_SKIP, stamp } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * DRIVE — real functional coverage against the live workbench: create a drive,
 * upload a file through the real file chooser, see it listed, then download it
 * back and verify the BYTES round-trip intact (not just that a link exists).
 */

const PAYLOAD = `hanzo.team drive e2e payload ${Date.now()}\n`

/** Write the fixture file this run uploads (unique name, known bytes). */
function fixture(name: string): string {
  const p = path.join(os.tmpdir(), name)
  fs.writeFileSync(p, PAYLOAD)
  return p
}

/** Ensure a drive exists and is open; returns nothing — leaves page inside it. */
async function ensureDrive(page: Page, name: string): Promise<void> {
  await page.locator('button#tree-drives').click()
  const form = page.locator('div.popup form[id^="drive:string:"]')
  await form.waitFor({ state: 'visible', timeout: 15_000 })
  await form.locator('div.antiGrid-row:has-text("Name") input').fill(name)
  await form.locator('button[type="submit"]').click()
  // The new drive appears in the tree; open it.
  const inTree = page.locator('.hanzoaiNavItem-container', { hasText: name }).first()
  await inTree.waitFor({ state: 'visible', timeout: 30_000 })
  await inTree.click()
}

test.describe('drive · upload + download', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  test('upload a file, see it listed, download it back byte-identical', async ({ page }) => {
    test.setTimeout(240_000)
    const ws = await teamLogin(page)
    await gotoView(page, ws, 'drive')

    const drive = stamp('e2e drive')
    await ensureDrive(page, drive)

    const fileName = `e2e-${Date.now().toString(36)}.txt`
    const filePath = fixture(fileName)
    const upload = page.getByRole('button', { name: 'Upload files' }).first()
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), upload.click()])
    await chooser.setFiles(filePath)

    const link = page.locator(`td:has(span:text-is("${fileName}")) a`).first()
    await expect(link, 'the uploaded file must be listed in the drive').toBeVisible({ timeout: 60_000 })

    // Download through the real context menu and verify the bytes round-trip.
    await link.click({ button: 'right' })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.locator('div.antiPopup').getByRole('button', { name: 'Download' }).click(),
    ])
    const out = path.join(os.tmpdir(), `dl-${fileName}`)
    await download.saveAs(out)
    expect(fs.readFileSync(out, 'utf8'), 'downloaded bytes must equal uploaded bytes').toBe(PAYLOAD)
  })
})
