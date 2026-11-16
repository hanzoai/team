import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DETAIL, TABLE_MIN, docked } from './layout.ts'

test('the record panel stands beside the table only when both fit', () => {
  assert.equal(docked(1180), true)
  assert.equal(docked(DETAIL + TABLE_MIN), true)
  assert.equal(docked(DETAIL + TABLE_MIN - 1), false)
})

test('on a phone, and on a tablet with the navigator drawn, the panel covers the table', () => {
  assert.equal(docked(375 - 48), false)
  assert.equal(docked(768 - 48 - 70), false)
})
