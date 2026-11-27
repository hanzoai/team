import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import {
  billingUrl,
  chatMaxWidthCssFor,
  DEFAULT_APPEARANCE,
  DEFAULT_CHAT_PREFS,
  DEFAULT_TEAM_SETTINGS,
  fontScaleFor,
  launchPathFor,
  parseAppearancePreferences,
  parseChatPreferences,
  parseTeamSettings,
  sidebarWidthPxFor,
  syncAccountAppearance,
} from './preferences.ts'

test('parseAppearancePreferences falls back cleanly on unknown values', () => {
  assert.deepEqual(parseAppearancePreferences(null), DEFAULT_APPEARANCE)
  assert.deepEqual(parseAppearancePreferences({ theme: 'neon', density: 'ultra', font: 'huge' }), DEFAULT_APPEARANCE)
  assert.deepEqual(
    parseAppearancePreferences({ theme: 'light', density: 'compact', font: 'large', accent: 'coral' }),
    { theme: 'light', density: 'compact', font: 'large', accent: 'coral' },
  )
})

test('parseChatPreferences validates effort, approvalMode, and model flags', () => {
  assert.deepEqual(parseChatPreferences(undefined), DEFAULT_CHAT_PREFS)
  assert.deepEqual(
    parseChatPreferences({
      effort: 'high',
      approvalMode: 'manual',
      allowThirdPartyModels: false,
      spokenLanguage: 'en-US',
    }),
    {
      effort: 'high',
      approvalMode: 'manual',
      allowThirdPartyModels: false,
      spokenLanguage: 'en-US',
    },
  )
  assert.deepEqual(parseChatPreferences({ effort: 'invalid', approvalMode: 'invalid' }), DEFAULT_CHAT_PREFS)
})

test('parseTeamSettings clamps sliders and validates Hanzo Dev unified layout fields', () => {
  assert.deepEqual(parseTeamSettings(null), DEFAULT_TEAM_SETTINGS)
  assert.equal(DEFAULT_TEAM_SETTINGS.defaultModel, 'enso')
  assert.equal(DEFAULT_TEAM_SETTINGS.themePreset, 'zen')
  assert.equal(DEFAULT_TEAM_SETTINGS.messageDensity, 'cozy')

  const parsed = parseTeamSettings({
    themePreset: 'clay',
    messageDensity: 'compact',
    chatWidth: 'wide',
    sidebarWidth: 'compact',
    rightPaneDefault: 'collapsed',
    appearanceContrast: 200,
    surfaceSolidness: 40,
    fontSizePx: 22,
    panelAnimationMs: -20,
    defaultLaunchView: 'office',
  })
  assert.equal(parsed.themePreset, 'clay')
  assert.equal(parsed.messageDensity, 'compact')
  assert.equal(parsed.chatWidth, 'wide')
  assert.equal(parsed.sidebarWidth, 'compact')
  assert.equal(parsed.rightPaneDefault, 'collapsed')
  assert.equal(parsed.appearanceContrast, 125)
  assert.equal(parsed.surfaceSolidness, 70)
  assert.equal(parsed.fontSizePx, 16)
  assert.equal(parsed.panelAnimationMs, 0)
  assert.equal(parsed.defaultLaunchView, 'office')

  assert.equal(sidebarWidthPxFor('compact'), 216)
  assert.equal(sidebarWidthPxFor('default'), 248)
  assert.equal(sidebarWidthPxFor('wide'), 288)
  assert.equal(chatMaxWidthCssFor('comfortable'), '920px')
  assert.equal(chatMaxWidthCssFor('wide'), '1200px')
  assert.equal(chatMaxWidthCssFor('full'), '100%')
  assert.equal(launchPathFor('channels'), '/chat/engineering')
  assert.equal(launchPathFor('office'), '/office')
})

test('fontScaleFor maps compact, default, and large cleanly', () => {
  assert.equal(fontScaleFor('compact'), '0.92')
  assert.equal(fontScaleFor('default'), '1')
  assert.equal(fontScaleFor('large'), '1.08')
})

test('syncAccountAppearance ignores missing tokens and non-200 responses safely', async () => {
  await assert.doesNotReject(() => syncAccountAppearance(null))
  await assert.doesNotReject(() => syncAccountAppearance(''))
})

test('billingUrl points to hanzo.ai/pay and encodes org parameter', () => {
  assert.equal(billingUrl(), 'https://hanzo.ai/pay')
  assert.equal(billingUrl(null), 'https://hanzo.ai/pay')
  assert.equal(billingUrl(''), 'https://hanzo.ai/pay')
  assert.equal(billingUrl('local'), 'https://hanzo.ai/pay')
  assert.equal(billingUrl('hanzo'), 'https://hanzo.ai/pay?org=hanzo')
  assert.equal(billingUrl('acme & co/dev'), 'https://hanzo.ai/pay?org=acme%20%26%20co%2Fdev')
})

test('SettingsModal routes billing through billingUrl and unifies Hanzo Dev sections with zero legacy models', () => {
  const dir = fileURLToPath(new URL('.', import.meta.url))
  const modalSrc = readFileSync(join(dir, 'SettingsModal.tsx'), 'utf8')
  const appearanceSrc = readFileSync(join(dir, 'AppearancePanel.tsx'), 'utf8')
  const workplaceSrc = readFileSync(join(dir, 'WorkplacePanels.tsx'), 'utf8')
  const systemSrc = readFileSync(join(dir, 'SystemPanels.tsx'), 'utf8')
  const combined = [modalSrc, appearanceSrc, workplaceSrc, systemSrc].join('\n')

  assert.ok(!combined.includes('https://billing.hanzo.ai'), 'Settings must not hardcode billing.hanzo.ai')
  assert.ok(modalSrc.includes('billingUrl('), 'SettingsModal must call billingUrl(')
  assert.ok(!/zen[1-5]|qwen2/i.test(combined), 'Settings must contain zero legacy zen1..zen5 or qwen2 references')
  assert.ok(workplaceSrc.includes('https://hanzo.ai/download#mobile'), 'Devices must link mobile download')
  assert.ok(systemSrc.includes('Hanzo Team v1.1.1'), 'About must display Hanzo Team v1.1.1')
})
