import assert from 'node:assert/strict'
import { test } from 'node:test'

import { rows } from './rows.ts'

test('a TotalArray reply is its value', () => {
  const doc = { _id: 'c-general', _class: 'chunter:class:Channel' }
  assert.deepEqual(rows({ dataType: 'TotalArray', total: 1, value: [doc] }), [doc])
  assert.deepEqual(rows({ dataType: 'TotalArray', total: 0, value: [] }), [])
})

test('a bare array is itself, and no answer is no rows', () => {
  assert.deepEqual(rows([1, 2]), [1, 2])
  assert.deepEqual(rows(null), [])
  assert.deepEqual(rows(undefined), [])
})

test('any other shape is refused, not drawn as an empty space', () => {
  assert.throws(() => rows({ dataType: 'TotalArray', total: 3 }))
  assert.throws(() => rows({ docs: [] }))
  assert.throws(() => rows('nope'))
})
