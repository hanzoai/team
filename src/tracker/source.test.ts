import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createHandoff, formatHandoff, handoffFromIssue } from '../handoff/handoff.ts'
import { dueWeekIndex, formatChatSource, formatDueDate, fromDateInput, isOverdue, parseChatSource, timelineWeeks } from './source.ts'

test('chat source marker round-trips cleanly and coexists with handoff metadata (#396)', () => {
  const src = { roomId: 'c-eng', roomName: '#engineering', messageId: 'msg-42' }
  const encoded = formatChatSource('Fix OAuth callback redirect', src)
  const parsed = parseChatSource(encoded)
  assert.equal(parsed.body, 'Fix OAuth callback redirect')
  assert.deepEqual(parsed.source, src)

  // Handing off a chat-linked task must strip both markers in HandoffRecord.body.
  const meta = createHandoff({
    owner: { id: 'p1', name: 'James', kind: 'person' },
    handedOffBy: 'Zach',
    approvalRequired: true,
    sourceRoomId: src.roomId,
    sourceRoomName: src.roomName,
    sourceMessageId: src.messageId,
  })
  const combined = formatHandoff(encoded, meta)
  const rec = handoffFromIssue({
    id: 'iss-1',
    key: 'ENG-1',
    title: 'Fix OAuth',
    description: combined,
    status: 'progress',
    labels: [],
    people: [],
    files: 0,
    replies: 0,
  })
  assert.ok(rec)
  assert.equal(rec.body, 'Fix OAuth callback redirect')
  assert.equal(rec.meta.sourceMessageId, 'msg-42')

  // Plain descriptions return no source.
  const plain = parseChatSource('No link here')
  assert.equal(plain.body, 'No link here')
  assert.equal(plain.source, null)
})

test('timelineWeeks, dueWeekIndex, and isOverdue treat today as not overdue and >6w as beyond window (#395)', () => {
  // Wednesday, 2026-11-25 18:00 UTC (after noon UTC!)
  const now = Date.UTC(2026, 10, 25, 18, 0, 0)
  const weeks = timelineWeeks(now, 6)
  assert.equal(weeks.length, 6)
  assert.equal(weeks[0]!.now, true)
  assert.equal(weeks.filter((w) => w.now).length, 1)
  // Must not contain hardcoded Sprint 14/15 fake labels.
  assert.equal(weeks.some((w) => /Sprint 14|Sprint 15|Oct 20/.test(w.label + ' ' + w.sub)), false)

  // Due date inside week 0 maps to index 0; due date 15 days later maps to index 2; >6w or null maps to -1.
  assert.equal(dueWeekIndex(Date.UTC(2026, 10, 27), weeks), 0)
  assert.equal(dueWeekIndex(Date.UTC(2026, 11, 10), weeks), 2)
  assert.equal(dueWeekIndex(Date.UTC(2027, 2, 15), weeks), -1)
  assert.equal(dueWeekIndex(null, weeks), -1)
  assert.equal(formatDueDate(Date.UTC(2026, 10, 27)), 'Nov 27')

  // A task due TODAY (stored at UTC noon) must NOT be overdue at 18:00 UTC.
  const todayDue = fromDateInput('2026-11-25')
  const yesterdayDue = fromDateInput('2026-11-24')
  assert.equal(isOverdue(todayDue, 'progress', now), false)
  assert.equal(isOverdue(yesterdayDue, 'progress', now), true)
  assert.equal(isOverdue(yesterdayDue, 'done', now), false)
})
