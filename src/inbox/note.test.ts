import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Class, type Notice, type Person } from '../data/model.ts'
import { buildNote, type Place } from './build.ts'
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

test('buildNote resolves hanzo: actors, populates chat quote, and links to message or issue (#394/#400)', () => {
  const uuid = '54a8363d-1b2c-4d5e-8f90-1234567890ab'
  const crowd: Person[] = [
    {
      _id: `person-${uuid}`,
      _class: Class.person,
      space: 's',
      modifiedOn: 1,
      name: 'Kelling,Zach',
      personUuid: uuid,
    },
  ]
  const where = new Map<string, Place>([
    ['msg-1', { label: '#engineering', to: '/chat/c-eng?msg=msg-1', quote: 'Ship the @james inbox fix today' }],
    ['iss-7', { label: 'Hanzo App', to: '/issues?issue=iss-7' }],
  ])

  const chatNotice: Notice = {
    _id: 'n-1',
    _class: Class.notice,
    space: 's',
    modifiedOn: 1_700_000_000_000,
    modifiedBy: `hanzo:${uuid}`,
    attachedTo: 'msg-1',
    attachedToClass: Class.message,
    title: 'mentioned you in #engineering',
    body: 'Ship the @james inbox fix today',
    isViewed: false,
  }
  const builtChat = buildNote(chatNotice, crowd, where)
  assert.equal(builtChat.actor.name, 'Zach Kelling')
  assert.equal(builtChat.kind, 'chat')
  assert.equal(builtChat.place, '#engineering')
  assert.equal(builtChat.to, '/chat/c-eng?msg=msg-1')
  assert.ok(builtChat.quote && builtChat.quote.some((s) => s.mention && s.text === '@james'))

  const taskNotice: Notice = {
    _id: 'n-2',
    _class: Class.notice,
    space: 's',
    modifiedOn: 1_700_000_100_000,
    modifiedBy: uuid,
    attachedTo: 'iss-7',
    attachedToClass: Class.issue,
    body: 'assigned ENG-7 to you',
    isViewed: true,
  }
  const builtTask = buildNote(taskNotice, crowd, where)
  assert.equal(builtTask.actor.name, 'Zach Kelling')
  assert.equal(builtTask.kind, 'task')
  assert.equal(builtTask.place, 'Hanzo App')
  assert.equal(builtTask.to, '/issues?issue=iss-7')

  // Chat notice with empty title and HTML body strips HTML and moves body into quote.
  const htmlChat: Notice = {
    _id: 'n-3',
    _class: Class.notice,
    space: 's',
    modifiedOn: 1_700_000_200_000,
    modifiedBy: `hanzo:${uuid}`,
    attachedTo: 'c-eng',
    attachedToClass: Class.channel,
    body: '<p>Hey @james check this</p>',
    isViewed: false,
  }
  const builtHtml = buildNote(htmlChat, crowd, new Map([['c-eng', { label: '#engineering', to: '/chat/c-eng' }]]))
  assert.ok(builtHtml.quote && builtHtml.quote.map((s) => s.text).join('').includes('Hey @james check this'))
  assert.equal(builtHtml.quote!.map((s) => s.text).join('').includes('<p>'), false)
  assert.ok(builtHtml.line.map((s) => s.text).join('').includes('sent a message in #engineering'))
})
