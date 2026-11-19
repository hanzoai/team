import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Category, Class, Tx } from './model.ts'
import type { Plane, Wire } from './socket.ts'
import { COLUMNS, KEY, ORDER, keyOf, start } from './tracker.ts'

/** A plane that only takes conditional applies: it keeps what it was sent and answers `held`. */
const plane = (held: boolean) => {
  const sent: Wire[] = []
  const fake = {
    apply: async (tx: Wire) => {
      sent.push(tx)
      return held
    },
  } as unknown as Plane
  return { fake, sent }
}

type Create = { objectId: string; objectClass: string; objectSpace: string; attributes: Record<string, unknown> }

test('a name suggests a key that starts with a letter', () => {
  assert.equal(keyOf('Engineering'), 'ENG')
  assert.equal(keyOf('Hanzo Team'), 'HT')
  assert.equal(keyOf('website redesign q3'), 'WRQ')
  assert.equal(keyOf('2026 Roadmap'), 'ROA')
  assert.equal(keyOf('v2 launch'), 'VL')
  assert.equal(keyOf('a b c d e f g'), 'ABCDE')
  assert.equal(keyOf('  '), '')
  assert.equal(keyOf('프로젝트'), '')
  for (const name of ['Engineering', 'Hanzo Team', '2026 Roadmap', 'a b c d e f g']) {
    assert.match(keyOf(name), KEY, name)
  }
})

test('a key is a letter, then up to four letters or digits', () => {
  for (const ok of ['E', 'ENG', 'OPS2', 'ABCDE']) assert.match(ok, KEY)
  for (const bad of ['', 'eng', '2OPS', 'ABCDEF', 'EN-G', 'EN G']) assert.doesNotMatch(bad, KEY)
})

test('a project opens with its four columns, in one write conditioned on its key', async () => {
  const { fake, sent } = plane(true)
  const id = await start(fake, 'hanzo:acc-1', { name: 'Engineering', identifier: 'ENG' })

  assert.equal(sent.length, 1, 'one write, so a project never lands without its columns')
  const tx = sent[0] as Wire & { notMatch: unknown; txes: Create[]; modifiedBy: string }
  assert.equal(tx._class, Tx.applyIf)
  assert.deepEqual(tx.notMatch, [{ _class: Class.project, query: { identifier: 'ENG' } }])

  const [opened, ...columns] = tx.txes
  assert.equal(opened.objectId, id)
  assert.equal(opened.objectClass, Class.project)
  assert.equal(opened.objectSpace, 'core:space:Space')
  assert.equal(opened.attributes.name, 'Engineering')
  assert.equal(opened.attributes.identifier, 'ENG')
  assert.equal(opened.attributes.sequence, 0)
  assert.equal(opened.attributes.private, false)
  // The server checks membership against the bare account, not the author's spelling.
  assert.deepEqual(opened.attributes.members, ['acc-1'])

  assert.equal(columns.length, COLUMNS.length)
  assert.deepEqual(
    columns.map((c) => c.attributes.category),
    [...ORDER],
    'one column per category, in board order',
  )
  for (const c of columns) {
    assert.equal(c.objectClass, Class.status)
    // `statuses(plane, project)` reads a board's columns by the project's id.
    assert.equal(c.objectSpace, id)
  }
  assert.equal(opened.attributes.defaultIssueStatus, columns[0].objectId)
  assert.equal(columns[0].attributes.category, Category.backlog)
})

test('a key already taken opens nothing and says so', async () => {
  const { fake } = plane(false)
  assert.equal(await start(fake, 'hanzo:acc-1', { name: 'Engineering', identifier: 'ENG' }), null)
})

test('nothing is sent without an author or with a key the board cannot use', async () => {
  const { fake, sent } = plane(true)
  await assert.rejects(start(fake, '', { name: 'Engineering', identifier: 'ENG' }))
  await assert.rejects(start(fake, 'hanzo:acc-1', { name: 'Engineering', identifier: 'eng' }))
  assert.equal(sent.length, 0)
})
