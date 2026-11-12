import { equal } from 'node:assert/strict'
import { test } from 'node:test'

import { nameOf } from '../data/model.ts'

// The server stores Last,First (apps/team/projections.go personName; a bot is ",name").
test('stored names are said First Last', () => {
  equal(nameOf({ name: 'Lorenzini,Dave' }), 'Dave Lorenzini')
  equal(nameOf({ name: ',dev' }), 'dev')
  equal(nameOf({ name: 'Plain Name' }), 'Plain Name')
  equal(nameOf(undefined), '')
})
