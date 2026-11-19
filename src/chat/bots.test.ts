import { deepEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'

import { addable, botDm, botIn, botsOf, hanzoBot, withId, withPath } from './bots.ts'
import { asking, completed, lines, markup, offered } from './text.ts'

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

test('a bot up close is hanzo.bot, open on it by name, in the space\'s org', () => {
  equal(hanzoBot('Dev', 'acme'), 'https://hanzo.bot/bots?bot=Dev&org=acme')
  equal(hanzoBot('Inbox Manager', null), 'https://hanzo.bot/bots?bot=Inbox+Manager')
  equal(hanzoBot(null, 'acme'), 'https://hanzo.bot/bots?org=acme')
  equal(hanzoBot(), 'https://hanzo.bot/bots')
})

test('a one-to-one direct message with a bot is the bot\'s; a group one is not', () => {
  equal(botDm({ kind: 'direct', members: ['u-1', 'u-2'] }, roster)?.name, 'Dev')
  equal(botDm({ kind: 'direct', members: ['u-2'] }, roster)?.name, 'Dev')
  equal(botDm({ kind: 'direct', members: ['u-1', 'u-2', 'u-3'] }, roster), undefined)
  equal(botDm({ kind: 'channel', members: ['u-2'] }, roster), undefined)
})

test('a channel can be given the live bots not already in it', () => {
  const gone = { id: 'u-5', name: 'Gone', bot: true, gone: true }
  deepEqual(addable({ kind: 'channel', members: ['u-1', 'u-2'] }, [...roster, gone]).map((p) => p.name), ['Cyber'])
  deepEqual(addable({ kind: 'direct', members: ['u-1'] }, roster), [])
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

test('a mention of a name with a space in it is that person, the longest name first', () => {
  const people = [...roster, { id: 'u-6', name: 'Ada Lovelace' }, { id: 'u-7', name: 'Ada' }]
  const m = JSON.parse(markup('ask @Ada Lovelace and @Ada.', people))
  deepEqual(m.content[0].content, [
    { type: 'text', text: 'ask ' },
    { type: 'reference', attrs: { id: 'person-u-6', objectclass: 'contact:class:Person', label: 'Ada Lovelace' } },
    { type: 'text', text: ' and ' },
    { type: 'reference', attrs: { id: 'person-u-7', objectclass: 'contact:class:Person', label: 'Ada' } },
    { type: 'text', text: '.' },
  ])
  // A name ends where a word does.
  equal(markup('@Devon here', roster), '<p>@Devon here</p>')
})

test('an @ opening the last word is a mention being typed', () => {
  deepEqual(asking('hey @De'), { at: 4, query: 'de' })
  deepEqual(asking('@'), { at: 0, query: '' })
  equal(asking('hey @Dev there'), null)
  equal(asking('mail z@ha'), null)
  equal(asking('plain'), null)
})

test('the picker offers bots first, by any word of the name, never a gone one', () => {
  const people = [...roster, { id: 'u-6', name: 'Ada Lovelace' }, { id: 'u-5', name: 'Cyborg', bot: true, gone: true }]
  deepEqual(offered(people, '').map((p) => p.name), ['Cyber', 'Dev', 'Ada Lovelace', 'Zach'])
  deepEqual(offered(people, 'cy').map((p) => p.name), ['Cyber'])
  deepEqual(offered(people, 'love').map((p) => p.name), ['Ada Lovelace'])
  equal(offered(people, '', 2).length, 2)
})

test('choosing completes the mention and leaves room to keep typing', () => {
  equal(completed('hey @De', 4, { id: 'u-2', name: 'Dev' }), 'hey @Dev ')
  equal(completed('@ad', 0, { id: 'u-6', name: 'Ada Lovelace' }), '@Ada Lovelace ')
})
