import assert from 'node:assert/strict'
import { test } from 'node:test'

import { by, inTab, seen, TABS, unseen, type Note } from './note.ts'

// Pure logic over literal rows; no feed, no clock.
const actor = { name: 'Ada' }
const row = (id: string, kind: Note['kind'], isSeen: boolean): Note => ({
  id,
  kind,
  actor,
  line: [by(actor), { text: ' did a thing' }],
  at: 1_700_000_000_000,
  seen: isSeen,
})
const rows: Note[] = [row('a', 'task', false), row('b', 'task', false), row('c', 'chat', true)]

test('the sentence carries the actor as its first span', () => {
  assert.deepEqual(by(actor), { text: 'Ada', strong: true })
})

test('a tab holds its own kind, and all holds the union', () => {
  assert.equal(inTab(rows, 'all').length, rows.length)
  for (const t of TABS) if (t !== 'all') for (const n of inTab(rows, t)) assert.equal(n.kind, t)
})

test('the badge counts unread per kind', () => {
  assert.equal(unseen(rows, 'task'), 2)
  assert.equal(unseen(rows, 'chat'), 0)
})

test('reading one clears exactly one', () => {
  const after = seen(rows, 'a')
  assert.equal(unseen(after, 'task'), 1)
  assert.equal(after.find((n) => n.id === 'b')!.seen, false)
  assert.equal(rows.find((n) => n.id === 'a')!.seen, false, 'the original is untouched')
})
