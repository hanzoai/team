import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  approveDeployRelease,
  createWorkspaceChannel,
  getWorkspace,
  joinVoiceRoom,
  leaveVoiceRoom,
  openThreadPane,
  resetWorkspaceStore,
  selectGuildOrg,
  sendThreadReply,
  sendWorkspaceMessage,
  toggleMessageReaction,
} from './store.ts'

test('Guild rail orgs, voice huddles, channels, thread RHS, and @bot dispatch work deterministically', () => {
  resetWorkspaceStore()
  const initial = getWorkspace()
  assert.deepEqual(
    initial.orgs.map((o) => o.letter),
    ['H', 'L', 'Z', 'S'],
  )
  assert.equal(initial.connectedVoiceId, 'eng-pairing')

  selectGuildOrg('lux')
  assert.equal(getWorkspace().activeOrgId, 'lux')

  joinVoiceRoom('lounge')
  assert.equal(getWorkspace().connectedVoiceId, 'lounge')
  leaveVoiceRoom()
  assert.equal(getWorkspace().connectedVoiceId, null)

  const sent = sendWorkspaceMessage('engineering', '@dev Verify Rust Cargo clippy clean')
  assert.ok(sent)
  const msgs = getWorkspace().messages.filter((m) => m.roomId === 'engineering')
  assert.ok(msgs.some((m) => m.body.includes('Verify Rust Cargo clippy clean')))
  assert.ok(msgs.some((m) => m.authorId === 'dev' && m.body.includes('Picked up')))

  openThreadPane('engineering', 'eng-m1')
  assert.equal(getWorkspace().rightPaneMode, 'thread')
  sendThreadReply('engineering', 'eng-m1', 'Confirmed on Linux X11!', true)
  const parent = getWorkspace().messages.find((m) => m.id === 'eng-m1')
  assert.equal(parent?.replies.length, 4)

  toggleMessageReaction('eng-m1', '🚀')
  const updated = getWorkspace().messages.find((m) => m.id === 'eng-m1')
  assert.ok(updated?.reactions.some((r) => r.emoji === '🚀' && r.mine))

  approveDeployRelease('eng-m2', 'Zach Kelling')
  const rc = getWorkspace().messages.find((m) => m.id === 'eng-m2')
  assert.equal(rc?.deployCard?.approvedBy, 'Zach Kelling')

  const slug = createWorkspaceChannel('#platform-ops')
  assert.equal(slug, 'platform-ops')
})
