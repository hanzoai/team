import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Issue, IssuePatch } from '../tracker/board/model.ts'
import { createHandoff, formatHandoff, parseHandoff } from './handoff.ts'
import {
  addHandoffRecord,
  approveHandoffRecord,
  getHandoffs,
  requestHandoffChanges,
  resetHandoffStore,
  submitHandoffDeliverable,
  syncBoardHandoffs,
} from './store.ts'

test('syncBoardHandoffs extracts board handoffs and persists Approval Inbox actions back to source.update', async () => {
  resetHandoffStore('space-1')
  const meta = createHandoff({
    owner: { id: 'bot-dev', name: 'Dev', kind: 'bot' },
    handedOffBy: 'Zach',
    approvalRequired: true,
    sourceRoomId: 'room-1',
    sourceRoomName: '#engineering',
    now: 1_000,
  })
  const issue: Issue = {
    id: 'iss-10',
    key: 'ENG-10',
    title: 'Ship mobile checkout flow',
    description: formatHandoff('Verify Apple Pay and receipt page', meta),
    status: 'progress',
    labels: ['Frontend', 'Handoff', 'Pending Approval'],
    people: [{ id: 'bot-dev', name: 'Dev', bot: true }],
    files: 0,
    replies: 0,
  }

  const patches: { id: string; patch: IssuePatch }[] = []
  syncBoardHandoffs([issue], {
    async update(id, patch) {
      patches.push({ id, patch })
    },
  })

  assert.equal(getHandoffs().length, 1)
  assert.equal(getHandoffs()[0]!.meta.approvalState, 'pending')

  await submitHandoffDeliverable('issue:iss-10', {
    summary: 'Verified mobile checkout flow on 375px viewport.',
    artifact: 'pr/mobile-checkout-412',
    completedBy: 'Dev',
    now: 2_000,
  })
  assert.equal(patches.length, 1)
  assert.equal(patches[0]!.patch.done, 0.75)
  assert.equal(parseHandoff(patches[0]!.patch.description).handoff?.deliverable?.artifact, 'pr/mobile-checkout-412')

  await approveHandoffRecord('issue:iss-10', {
    approvedBy: 'Zach',
    note: 'Looks solid.',
    now: 3_000,
  })
  assert.equal(patches.length, 2)
  assert.equal(patches[1]!.patch.status, 'done')
  assert.equal(patches[1]!.patch.done, 1)
  assert.equal(getHandoffs()[0]!.meta.approvalState, 'approved')
  assert.equal(getHandoffs()[0]!.meta.deliverable?.verified, true)
})

test('chat-originated local handoff supports request changes and sorts pending approvals first', async () => {
  resetHandoffStore('space-2')
  addHandoffRecord({
    id: 'chat:1',
    title: 'Prepare Zen 6 benchmark deck',
    body: 'Compare latency across zen6-flash and zen6-max.',
    status: 'progress',
    meta: createHandoff({
      owner: { id: 'bot-sci', name: 'Sci', kind: 'bot' },
      handedOffBy: 'Zach',
      approvalRequired: false,
      sourceRoomId: 'room-research',
      sourceRoomName: '#research',
      now: 2_000,
    }),
    updatedAt: 2_000,
  })
  addHandoffRecord({
    id: 'chat:2',
    title: 'Rotate staging webhook secret',
    body: 'Update KMS secret and verify 200 on healthcheck.',
    status: 'progress',
    meta: createHandoff({
      owner: { id: 'bot-opera', name: 'Opera', kind: 'bot' },
      handedOffBy: 'Zach',
      approvalRequired: true,
      sourceRoomId: 'room-ops',
      sourceRoomName: '#ops',
      now: 1_000,
    }),
    updatedAt: 1_000,
  })

  // Pending approval sorts ahead of newer non-pending handoff.
  assert.equal(getHandoffs()[0]!.id, 'chat:2')

  await requestHandoffChanges('chat:2', {
    reviewedBy: 'Zach',
    note: 'Include KMS audit log link.',
    now: 3_000,
  })
  const updated = getHandoffs().find((h) => h.id === 'chat:2')!
  assert.equal(updated.meta.approvalState, 'changes_requested')
  assert.equal(updated.meta.approvalNote, 'Include KMS audit log link.')
})
