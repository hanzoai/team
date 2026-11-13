import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Denied } from './account.ts'

test('Denied marks account:status:Unauthorized as unauthorized and other refusals as not', () => {
  const unauth = new Denied('account:status:Unauthorized', 'no account')
  assert.equal(unauth.unauthorized, true)

  const unknown = new Denied('account:status:UnknownMethod', 'enrol')
  assert.equal(unknown.unauthorized, false)
})
