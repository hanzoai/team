import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { HandoffRecord } from '../handoff/handoff.ts'
import type { Note } from '../inbox/note.ts'
import type { Issue } from '../tracker/board/model.ts'
import { buildHomeSummary } from './summary.ts'

test('buildHomeSummary aggregates real approvals, active/overdue issues by owner, and unread activity (#391)', () => {
  const now = Date.UTC(2026, 10, 25, 12, 0, 0)
  const issues: Issue[] = [
    {
      id: 'i1',
      key: 'ENG-1',
      title: 'Fix inbox navigation',
      status: 'progress',
      priority: 'high',
      labels: [],
      people: [{ id: 'p1', name: 'James Burns' }],
      dueDate: now - 86_400_000, // overdue
      files: 0,
      replies: 1,
    },
    {
      id: 'i2',
      key: 'ENG-2',
      title: 'Deploy bot',
      status: 'todo',
      labels: [],
      people: [{ id: 'b1', name: 'vi', bot: true }],
      dueDate: now + 3 * 86_400_000,
      files: 0,
      replies: 0,
    },
    {
      id: 'i3',
      key: 'ENG-3',
      title: 'Already done',
      status: 'done',
      labels: [],
      people: [{ id: 'p1', name: 'James Burns' }],
      dueDate: now - 86_400_000, // done issues are never overdue
      files: 0,
      replies: 0,
    },
  ]

  const approvals: HandoffRecord[] = [
    {
      id: 'h1',
      issueId: 'i2',
      issueKey: 'ENG-2',
      title: 'Deploy bot',
      body: '',
      status: 'todo',
      updatedAt: now,
      meta: {
        owner: { id: 'b1', name: 'vi', kind: 'bot' },
        handedOffBy: 'James Burns',
        handedOffAt: now,
        approvalRequired: true,
        approvalState: 'pending',
      },
    },
  ]

  const notes: Note[] = [
    {
      id: 'n1',
      kind: 'chat',
      actor: { name: 'Zach Kelling' },
      line: [{ text: 'Zach Kelling', strong: true }, { text: ' mentioned @james', mention: true }],
      at: now - 60_000,
      place: '#general',
      to: '/chat/c-1?msg=m1',
      seen: false,
    },
  ]

  const summary = buildHomeSummary({ issues, approvals, notes, now })
  assert.equal(summary.activeCount, 2)
  assert.equal(summary.overdueCount, 1)
  assert.equal(summary.pendingApprovalsCount, 1)
  assert.equal(summary.unreadNotesCount, 1)
  assert.equal(summary.owners.length, 2)
  const james = summary.owners.find((o) => o.name === 'James Burns')
  const vi = summary.owners.find((o) => o.name === '@vi')
  assert.ok(james && james.active === 1 && james.overdue === 1)
  assert.ok(vi && vi.active === 1 && vi.bot === true)
  assert.equal(summary.recentNotes.length, 1)
})
