import { test, expect } from '@playwright/test'
import { haveTenantCreds, TENANT_SKIP, MOBILE } from '../helpers/config'
import { teamLogin, gotoView } from '../helpers/team'

/**
 * MOBILE (iPhone 14 frame, 390x844) — the core three views on a phone:
 * tracker, chat, documents. The workbench is responsive (no interstitial wall):
 * the view renders its anchor, the app rail is reachable as a bottom bar, and the
 * body never scrolls horizontally.
 */
test.use({
  viewport: { ...MOBILE.viewport },
  isMobile: MOBILE.isMobile,
  hasTouch: MOBILE.hasTouch,
  userAgent: MOBILE.userAgent,
})

const VIEWS: Array<{ alias: string; anchor: string }> = [
  { alias: 'tracker', anchor: 'Tracker' },
  { alias: 'chunter', anchor: 'Chat' },
  { alias: 'document', anchor: 'Documents' },
]

test.describe('mobile · core views', () => {
  test.beforeEach(({}) => test.skip(!haveTenantCreds(), TENANT_SKIP))

  for (const { alias, anchor } of VIEWS) {
    test(`${alias} renders on a phone`, async ({ page }) => {
      test.setTimeout(240_000)
      const ws = await teamLogin(page)
      await gotoView(page, ws, alias)

      await expect(
        page.getByText(anchor).filter({ visible: true }).first(),
        `${alias} must render its "${anchor}" anchor on mobile`,
      ).toBeVisible({ timeout: 30_000 })

      await expect(
        page.locator('[id^="app-"]').first(),
        'the app rail must be reachable on mobile',
      ).toBeVisible({ timeout: 15_000 })

      const overflow = await page.evaluate(
        () => document.body.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, 'no horizontal body scroll on mobile').toBeLessThanOrEqual(0)
    })
  }
})
