import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
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
