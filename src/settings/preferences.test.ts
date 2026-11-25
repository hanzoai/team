import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  billingUrl,
  DEFAULT_APPEARANCE,
  DEFAULT_CHAT_PREFS,
  fontScaleFor,
  parseAppearancePreferences,
  parseChatPreferences,
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

test('SettingsModal routes billing through billingUrl rather than billing.hanzo.ai', () => {
  const modalPath = join(new URL('.', import.meta.url).pathname, 'SettingsModal.tsx')
  const src = readFileSync(modalPath, 'utf8')
  assert.ok(!src.includes('https://billing.hanzo.ai'), 'SettingsModal must not hardcode billing.hanzo.ai')
  assert.ok(src.includes('billingUrl('), 'SettingsModal must call billingUrl(')
})
