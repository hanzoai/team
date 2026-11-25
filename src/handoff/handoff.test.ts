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
  handoffNextAction,
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

test('handoffNextAction respects explicit override and derives actor-specific next actions by state', () => {
  const overridden = createHandoff({
    owner: devBot,
    handedOffBy: 'Zach',
    approvalRequired: true,
    nextAction: 'Run canary check',
    now: 1_000,
  })
  assert.equal(handoffNextAction(overridden), 'Run canary check')

  const noneBot = createHandoff({ owner: devBot, handedOffBy: 'Zach', approvalRequired: false, now: 1_000 })
  assert.match(handoffNextAction(noneBot), /@Dev/)

  const nonePerson = createHandoff({ owner: ada, handedOffBy: 'Zach', approvalRequired: false, now: 1_000 })
  assert.match(handoffNextAction(nonePerson), /Ada Lovelace/)

  const pendingNoDeliverable = createHandoff({
    owner: devBot,
    handedOffBy: 'Zach',
    approvalRequired: true,
    now: 1_000,
  })
  assert.match(handoffNextAction(pendingNoDeliverable), /@Dev/)

  const pendingWithDeliverable = submitDeliverable(pendingNoDeliverable, {
    summary: 'Opened PR #412',
    now: 2_000,
  })
  assert.match(handoffNextAction(pendingWithDeliverable), /Zach/)

  const changesReq = requestChanges(pendingWithDeliverable, {
    reviewedBy: 'Zach',
    note: 'Add rollback steps',
    now: 3_000,
  })
  assert.match(handoffNextAction(changesReq), /@Dev/)
  assert.match(handoffNextAction(changesReq), /revise|resubmit/i)

  const approvedManual = approveHandoff(pendingWithDeliverable, {
    approvedBy: 'Zach',
    now: 4_000,
  })
  assert.match(handoffNextAction(approvedManual), /Zach/)

  const autoApproved = submitDeliverable(nonePerson, {
    summary: 'Published Q3 deck',
    now: 2_000,
  })
  assert.match(handoffNextAction(autoApproved), /Ada Lovelace/)
})

test('handoffChatMessage includes Next action for explicit override and default derived state', () => {
  const msgExplicit = handoffChatMessage({
    title: 'Audit mobile checkout',
    owner: devBot,
    brief: 'Verify Stripe redirect.',
    approvalRequired: true,
    issueKey: 'ENG-42',
    nextAction: 'Run canary check',
  })
  assert.match(msgExplicit, /Next action/i)
  assert.match(msgExplicit, /Run canary check/)

  const msgDefault = handoffChatMessage({
    title: 'Audit mobile checkout',
    owner: devBot,
    approvalRequired: true,
  })
  assert.match(msgDefault, /Next action/i)
  assert.match(msgDefault, /@Dev/)
})

test('formatHandoff and parseHandoff round-trip nextAction cleanly', () => {
  const meta = createHandoff({
    owner: devBot,
    handedOffBy: 'Zach',
    approvalRequired: true,
    nextAction: 'Deploy to staging after QA',
    now: 1_000,
  })
  const decoded = parseHandoff(formatHandoff('Canary rollout task.', meta))
  assert.equal(decoded.handoff?.nextAction, 'Deploy to staging after QA')
  assert.deepEqual(decoded.handoff, meta)
})

test('submitDeliverable versions deliverables, archives deliverableHistory, and round-trips cleanly', () => {
  const h0 = createHandoff({
    owner: devBot,
    handedOffBy: 'Zach',
    approvalRequired: true,
    now: 1_000,
  })

  const h1 = submitDeliverable(h0, {
    summary: 'Initial PR #101',
    artifact: 'https://github.com/hanzoai/team/pull/101',
    now: 2_000,
  })
  assert.equal(h1.deliverable?.version, 1)
  assert.ok(!h1.deliverableHistory || h1.deliverableHistory.length === 0)

  const h2 = submitDeliverable(h1, {
    summary: 'Addressed review comments in PR #101',
    artifact: 'https://github.com/hanzoai/team/pull/101#commit-2',
    now: 3_000,
  })
  assert.equal(h2.deliverable?.version, 2)
  assert.equal(h2.deliverableHistory?.length, 1)
  assert.equal(h2.deliverableHistory?.[0]?.version, 1)
  assert.equal(h2.deliverableHistory?.[0]?.summary, 'Initial PR #101')

  const h3 = submitDeliverable(h2, {
    summary: 'Final verified build',
    artifact: 'https://github.com/hanzoai/team/pull/101#commit-3',
    now: 4_000,
  })
  assert.equal(h3.deliverable?.version, 3)
  assert.deepEqual(
    h3.deliverableHistory?.map((d) => d.version),
    [1, 2],
  )

  const decoded = parseHandoff(formatHandoff('Deliverable evolution', h3))
  assert.equal(decoded.handoff?.deliverable?.version, 3)
  assert.deepEqual(
    decoded.handoff?.deliverableHistory?.map((d) => d.version),
    [1, 2],
  )
  assert.deepEqual(decoded.handoff, h3)
})

test('parseHandoff defaults legacy deliverable missing version to 1', () => {
  const legacyPayload = {
    owner: devBot,
    handedOffBy: 'Zach',
    handedOffAt: 1_000,
    approvalRequired: true,
    approvalState: 'pending',
    deliverable: {
      summary: 'Legacy deliverable without version',
      completedBy: 'Dev',
      completedAt: 2_000,
      verified: false,
    },
  }
  const raw = `Legacy task body\n\n<!-- hanzo:handoff:v1 ${JSON.stringify(legacyPayload)} -->`
  const decoded = parseHandoff(raw)
  assert.equal(decoded.handoff?.deliverable?.version, 1)
})
