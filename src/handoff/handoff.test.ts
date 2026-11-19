import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  activeMentionQuery,
  applyMention,
  approvalLabel,
  approveHandoff,
  createHandoff,
  formatHandoff,
  handoffChatMessage,
  handoffFromIssue,
  handoffLabels,
  issueHandoffPatch,
  mentionSuggestions,
  parseHandoff,
  requestChanges,
  submitDeliverable,
  type HandoffOwner,
} from './handoff.ts'

const devBot: HandoffOwner = { id: 'bot-dev', name: 'Dev', kind: 'bot' }
const ada: HandoffOwner = { id: 'usr-ada', name: 'Ada Lovelace', kind: 'person' }

test('handoff -> deliverable -> approval lifecycle with manual approval gate', () => {
  const h1 = createHandoff({
    owner: devBot,
    handedOffBy: 'Zach',
    approvalRequired: true,
    sourceRoomId: 'room-eng',
    sourceRoomName: '#engineering',
    now: 1_000,
  })
  assert.equal(h1.owner.kind, 'bot')
  assert.equal(h1.approvalState, 'pending')
  assert.equal(approvalLabel(h1.approvalState), 'Awaiting approval')

  const h2 = submitDeliverable(h1, {
    summary: 'Shipped Zen 6 router benchmark PR #412 with 99.4% pass@1.',
    artifact: 'https://github.com/hanzoai/team/pull/412',
    completedBy: 'Dev',
    now: 2_000,
  })
  assert.equal(h2.approvalState, 'pending')
  assert.equal(h2.deliverable?.verified, false)
  assert.equal(h2.deliverable?.artifact, 'https://github.com/hanzoai/team/pull/412')

  const h3 = approveHandoff(h2, {
    approvedBy: 'Zach',
    note: 'Verified tests and latency numbers. Ship it.',
    now: 3_000,
  })
  assert.equal(h3.approvalState, 'approved')
  assert.equal(h3.deliverable?.verified, true)
  assert.equal(h3.approvedBy, 'Zach')
  assert.equal(h3.approvalNote, 'Verified tests and latency numbers. Ship it.')
})

test('full-access handoff auto-approves deliverable on submission', () => {
  const h1 = createHandoff({
    owner: ada,
    handedOffBy: 'Zach',
    approvalRequired: false,
    now: 1_000,
  })
  assert.equal(h1.approvalState, 'none')

  const h2 = submitDeliverable(h1, {
    summary: 'Updated Q3 pricing sheet.',
    completedBy: 'Ada Lovelace',
    now: 2_000,
  })
  assert.equal(h2.approvalState, 'approved')
  assert.equal(h2.deliverable?.verified, true)
})

test('requestChanges marks deliverable unverified and keeps reviewer feedback', () => {
  const h1 = submitDeliverable(
    createHandoff({ owner: devBot, handedOffBy: 'Zach', approvalRequired: true, now: 1_000 }),
    { summary: 'Draft rollout plan', now: 2_000 },
  )
  const h2 = requestChanges(h1, {
    reviewedBy: 'Zach',
    note: 'Add rollback steps before production promotion.',
    now: 3_000,
  })
  assert.equal(h2.approvalState, 'changes_requested')
  assert.equal(h2.deliverable?.verified, false)
  assert.match(h2.approvalNote ?? '', /rollback steps/)
})

test('formatHandoff and parseHandoff round-trip cleanly with prose and special characters', () => {
  const meta = approveHandoff(
    submitDeliverable(
      createHandoff({
        owner: devBot,
        handedOffBy: 'Zach',
        approvalRequired: true,
        sourceRoomId: 'ch-1',
        sourceRoomName: '#ops',
        now: 100,
      }),
      {
        summary: 'Edge case --> handled cleanly',
        artifact: 'eval/zen6-router.parquet',
        now: 200,
      },
    ),
    { approvedBy: 'Zach', note: 'LGTM', now: 300 },
  )

  const encoded = formatHandoff('Verify production canary rollout.', meta)
  const decoded = parseHandoff(encoded)
  assert.equal(decoded.body, 'Verify production canary rollout.')
  assert.deepEqual(decoded.handoff, meta)
})

test('issueHandoffPatch computes status, done %, assignee, labels, and preserves user labels', () => {
  const metaPending = submitDeliverable(
    createHandoff({ owner: devBot, handedOffBy: 'Zach', approvalRequired: true, now: 100 }),
    { summary: 'Canary verified', now: 200 },
  )
  const pendingPatch = issueHandoffPatch(
    { description: 'Rollout spec', labels: ['Backend', 'Pending Approval'], status: 'todo' },
    metaPending,
  )
  assert.equal(pendingPatch.assigneeId, 'bot-dev')
  assert.equal(pendingPatch.status, 'progress')
  assert.equal(pendingPatch.done, 0.75)
  assert.deepEqual(pendingPatch.labels, ['Backend', 'Handoff', 'Pending Approval', 'Deliverable'])

  const metaApproved = approveHandoff(metaPending, { approvedBy: 'Zach', now: 300 })
  const approvedPatch = issueHandoffPatch(
    { description: pendingPatch.description, labels: pendingPatch.labels ?? [], status: 'progress' },
    metaApproved,
  )
  assert.equal(approvedPatch.status, 'done')
  assert.equal(approvedPatch.done, 1)
  assert.deepEqual(approvedPatch.labels, ['Backend', 'Handoff', 'Approved', 'Deliverable'])
})

test('handoffLabels strips stale managed labels without dropping custom tags', () => {
  assert.deepEqual(
    handoffLabels(['QA', 'Pending Approval', 'Handoff'], 'changes_requested', false),
    ['QA', 'Handoff', 'Changes Requested'],
  )
})

test('handoffChatMessage addresses @owner with issue key and approval policy', () => {
  const msg = handoffChatMessage({
    title: 'Audit mobile checkout',
    owner: devBot,
    brief: 'Verify Stripe redirect and receipt persistence.',
    approvalRequired: true,
    issueKey: 'ENG-42',
  })
  assert.ok(msg.startsWith('@Dev Handoff: [ENG-42] Audit mobile checkout'))
  assert.match(msg, /Approval required/)
})

test('handoffFromIssue extracts structured record from issue description', () => {
  const meta = createHandoff({ owner: devBot, handedOffBy: 'Zach', approvalRequired: true, now: 500 })
  const rec = handoffFromIssue({
    id: 'iss-1',
    key: 'ENG-7',
    title: 'Ship approval inbox',
    description: formatHandoff('Implement approval controls', meta),
    status: 'progress',
    labels: ['Handoff', 'Pending Approval'],
    people: [{ id: 'bot-dev', name: 'Dev' }],
    files: 0,
    replies: 0,
  })
  assert.ok(rec)
  assert.equal(rec.issueKey, 'ENG-7')
  assert.equal(rec.body, 'Implement approval controls')
  assert.equal(rec.meta.owner.name, 'Dev')
})

test('activeMentionQuery, mentionSuggestions, and applyMention prioritize bots and replace suffix', () => {
  const roster = [
    { id: '1', name: 'Zach', bot: false },
    { id: '2', name: 'Dev', bot: true },
    { id: '3', name: 'Sci', bot: true },
    { id: '4', name: 'DeletedBot', bot: true, gone: true },
  ]
  assert.deepEqual(activeMentionQuery('Please check @de'), { query: 'de', start: 13 })
  assert.equal(activeMentionQuery('email@domain.com'), null)

  const suggested = mentionSuggestions(roster, '')
  assert.deepEqual(suggested.map((p) => p.name), ['Dev', 'Sci', 'Zach'])

  assert.equal(applyMention('Please check @de', 'Dev'), 'Please check @Dev ')
  assert.equal(applyMention('Check this', 'Sci'), 'Check this @Sci ')
})
