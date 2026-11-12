import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import { botIn, botPath, botsOf, withId, withPath } from './bots.ts'
import { lines, markup } from './text.ts'

const roster = [
  { id: 'u-1', name: 'Zach' },
  { id: 'u-2', name: 'Dev', bot: true },
  { id: 'u-4', name: 'Cyber', bot: true },
]

test('a conversation with somebody has an address and the address names them', () => {
  equal(withPath(roster[1]!), '/chat/with-u-2')
  equal(withId('with-u-2'), 'u-2')
  equal(withId('dm-3f9a'), undefined)
  equal(withId(undefined), undefined)
})

test('a bot is talked to in the Bots app, open on it by name', () => {
  equal(botPath(roster[1]!), '/bots?bot=Dev')
  equal(botPath({ name: 'Inbox Manager' }), '/bots?bot=Inbox%20Manager')
})

test('bots are the agents on the roster, by name', () => {
  deepEqual(botsOf(roster).map((p) => p.name), ['Cyber', 'Dev'])
})

test('a deleted agent is not offered as a bot', () => {
  deepEqual(botsOf([...roster, { id: 'u-5', name: 'Gone', bot: true, gone: true }]).map((p) => p.name), ['Cyber', 'Dev'])
})

test('the agent in a direct message is the member who is one', () => {
  equal(botIn({ kind: 'direct', members: ['u-1', 'u-2'] }, roster)?.name, 'Dev')
  equal(botIn({ kind: 'direct', members: ['u-1'] }, roster), undefined)
  equal(botIn({ kind: 'channel', members: ['u-2'] }, roster), undefined)
})

test('a mention of somebody on the roster is a reference node', () => {
  const m = JSON.parse(markup('hey @Dev, look', roster))
  deepEqual(m.content[0].content, [
    { type: 'text', text: 'hey ' },
    { type: 'reference', attrs: { id: 'person-u-2', objectclass: 'contact:class:Person', label: 'Dev' } },
    { type: 'text', text: ', look' },
  ])
})

test('no mention of anybody known leaves the markup as it was', () => {
  equal(markup('hi @nobody', roster), '<p>hi @nobody</p>')
  equal(markup('mail z@Zach.com', roster), '<p>mail z@Zach.com</p>')
  equal(markup('plain', []), '<p>plain</p>')
})

test('a stored document reads back as lines with the mention as @name', () => {
  deepEqual(lines(markup('hey @Zach\nbye', roster)), ['hey @Zach', 'bye'])
})
