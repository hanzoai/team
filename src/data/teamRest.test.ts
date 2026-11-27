import assert from 'node:assert/strict'
import { test } from 'node:test'

import { decodeMentionsForDisplay, encodeMentionsForApi, teamAvatarUrl } from './teamRest.ts'

const DEV_UUID = '11111111-2222-3333-4444-555555555555'
const ADA_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const ADA_L_UUID = '99999999-8888-7777-6666-555555555555'

test('encodeMentionsForApi converts @handle and @Name into <@uuid> per cloud/apps/team/markup.go:31', () => {
  const roster = [
    { id: DEV_UUID, handle: 'dev', name: 'Dev' },
    { id: ADA_UUID, handle: 'ada', name: 'Ada' },
    { id: ADA_L_UUID, handle: 'ada-lovelace', name: 'Ada Lovelace' },
    { id: 'non-uuid-id', handle: 'ignored', name: 'Ignored' },
  ]

  assert.equal(
    encodeMentionsForApi('Hey @dev can you check this PR?', roster),
    `Hey <@${DEV_UUID}> can you check this PR?`,
  )

  // Longest match wins: @Ada Lovelace matches full name, not @Ada
  assert.equal(
    encodeMentionsForApi('Ping @Ada Lovelace and @ada, please review.', roster),
    `Ping <@${ADA_L_UUID}> and <@${ADA_UUID}>, please review.`,
  )

  // Emails and word prefixes are NOT turned into mentions
  assert.equal(
    encodeMentionsForApi('Email dev@hanzo.ai and @devon about @dev!', roster),
    `Email dev@hanzo.ai and @devon about <@${DEV_UUID}>!`,
  )

  // Unknown handles and non-UUID members stay untouched
  assert.equal(
    encodeMentionsForApi('Hello @unknown and @ignored', roster),
    'Hello @unknown and @ignored',
  )

  // Existing <@uuid> tokens are preserved without double-wrapping
  assert.equal(
    encodeMentionsForApi(`Already formatted <@${DEV_UUID}> and @dev`, roster),
    `Already formatted <@${DEV_UUID}> and <@${DEV_UUID}>`,
  )
})

test('decodeMentionsForDisplay renders <@uuid> tokens cleanly as @handle using roster', () => {
  const roster = [
    { id: DEV_UUID, handle: 'dev', name: 'Dev', bot: true },
    { id: ADA_UUID, handle: 'ada', name: 'Ada', bot: false },
  ]
  assert.equal(
    decodeMentionsForDisplay(`<@${DEV_UUID}> please check with <@${ADA_UUID}>`, roster),
    '@dev please check with @ada',
  )
  // Unknown UUID stays untouched
  assert.equal(
    decodeMentionsForDisplay(`<@${ADA_L_UUID}> hello`, roster),
    `<@${ADA_L_UUID}> hello`,
  )
})

test('teamAvatarUrl resolves blob ids and preserves absolute URLs', () => {
  assert.equal(teamAvatarUrl('space-1', 'https://cdn.example.com/a.png'), 'https://cdn.example.com/a.png')
  assert.equal(teamAvatarUrl('space-1', '/agents/dev.png'), '/agents/dev.png')
  assert.match(teamAvatarUrl('space-1', 'blob-123') ?? '', /\/v1\/team\/files\/space-1\/avatar\?file=blob-123$/)
  assert.equal(teamAvatarUrl('', 'blob-123'), undefined)
})
