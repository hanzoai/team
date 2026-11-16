import assert from 'node:assert/strict'
import { test } from 'node:test'

import { whose } from './model.ts'

test('an account finds its person by uuid, by the minted id, or by the id itself', () => {
  assert.ok(whose({ _id: 'p1', personUuid: 'acc-1' }, 'acc-1'))
  assert.ok(whose({ _id: 'person-acc-1' }, 'acc-1'))
  assert.ok(whose({ _id: 'acc-1' }, 'acc-1'))
  assert.equal(whose({ _id: 'person-acc-2', personUuid: 'acc-2' }, 'acc-1'), false)
  // No account names nobody, rather than every person with no uuid.
  assert.equal(whose({ _id: 'p1' }, ''), false)
})
