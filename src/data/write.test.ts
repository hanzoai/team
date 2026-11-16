import assert from 'node:assert/strict'
import { test } from 'node:test'

import { between, mint } from './write.ts'

const ordered = (...xs: string[]) => xs.every((x, i) => i === 0 || xs[i - 1] < x)

test('a rank always lands between its neighbours', () => {
  let a = between()
  let b = between(a)
  assert.ok(a < b, `${a} < ${b}`)
  // The case that has to work is the repeated squeeze, not the first one: a
  // card dropped into the same gap fifty times is one person dragging.
  for (let i = 0; i < 50; i++) {
    const mid = between(a, b)
    assert.ok(ordered(a, mid, b), `${a} < ${mid} < ${b} on pass ${i}`)
    b = mid
  }
  for (let i = 0; i < 50; i++) {
    const mid = between(a, b)
    assert.ok(ordered(a, mid, b), `${a} < ${mid} < ${b} on pass ${i}`)
    a = mid
  }
})

test('an open end keeps going in the right direction', () => {
  let top = between(undefined, 'm')
  for (let i = 0; i < 20; i++) {
    const above = between(undefined, top)
    assert.ok(above < top, `${above} < ${top}`)
    top = above
  }
  let bottom = between('m')
  for (let i = 0; i < 20; i++) {
    const below = between(bottom)
    assert.ok(bottom < below, `${bottom} < ${below}`)
    bottom = below
  }
})

test('an id is twenty-four hex characters and time ordered', () => {
  const a = mint()
  assert.match(a, /^[0-9a-f]{24}$/)
  assert.notEqual(a, mint())
})

test('a label rides on the transaction, where the server reads what it hangs off', async () => {
  const { attach } = await import('./write.ts')
  const tx = attach('proj-1', 'hanzo:acc-1', 'tags:class:TagReference', { id: 'issue-1', cls: 'tracker:class:Issue', collection: 'labels' }, {
    tag: 'tag-design',
    title: 'Design',
  })
  assert.equal(tx.attachedTo, 'issue-1')
  assert.equal(tx.attachedToClass, 'tracker:class:Issue')
  assert.equal(tx.collection, 'labels')
  assert.equal(tx.objectSpace, 'proj-1')
  // The server drops these from attributes, so a label that carried them only
  // there was stored hanging off nothing.
  assert.equal('attachedTo' in tx.attributes, false)
  assert.deepEqual(tx.attributes, { tag: 'tag-design', title: 'Design' })
})
