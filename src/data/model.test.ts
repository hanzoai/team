import assert from 'node:assert/strict'
import { test } from 'node:test'

import { bareAccount, findPerson, isUuid, nameOf, whose } from './model.ts'

test('an account finds its person by uuid, by the minted id, or by the id itself', () => {
  assert.ok(whose({ _id: 'p1', personUuid: 'acc-1' }, 'acc-1'))
  assert.ok(whose({ _id: 'person-acc-1' }, 'acc-1'))
  assert.ok(whose({ _id: 'acc-1' }, 'acc-1'))
  assert.equal(whose({ _id: 'person-acc-2', personUuid: 'acc-2' }, 'acc-1'), false)
  // No account names nobody, rather than every person with no uuid.
  assert.equal(whose({ _id: 'p1' }, ''), false)
})

test('bareAccount and findPerson resolve hanzo:, person-, bare uuid, and _id refs (#393/#394)', () => {
  const uuid = '54a8363d-1b2c-4d5e-8f90-1234567890ab'
  assert.equal(bareAccount(`hanzo:${uuid}`), uuid)
  assert.equal(bareAccount(`person-${uuid}`), uuid)
  assert.equal(bareAccount(uuid), uuid)
  assert.equal(isUuid(uuid), true)
  assert.equal(isUuid(`hanzo:${uuid}`), true)
  assert.equal(isUuid('Jane Doe'), false)

  const crowd = [
    { _id: `person-${uuid}`, _class: 'contact:class:Person', space: 's', modifiedOn: 1, name: 'Burns,James', personUuid: uuid },
    { _id: 'bot-1', _class: 'contact:class:Person', space: 's', modifiedOn: 1, name: ',vi' },
  ]
  assert.equal(findPerson(crowd, `hanzo:${uuid}`)?._id, `person-${uuid}`)
  assert.equal(findPerson(crowd, uuid)?._id, `person-${uuid}`)
  assert.equal(findPerson(crowd, `person-${uuid}`)?._id, `person-${uuid}`)
  assert.equal(findPerson(crowd, 'bot-1')?._id, 'bot-1')
  assert.equal(findPerson(crowd, ''), undefined)
})

test('nameOf formats Last,First and never renders raw 36-char UUIDs (#393)', () => {
  const uuid = '54a8363d-1b2c-4d5e-8f90-1234567890ab'
  assert.equal(nameOf({ name: 'Burns,James' }), 'James Burns')
  assert.equal(nameOf({ name: ',vi' }), 'vi')
  // Raw UUID stored as person name falls back to email local-part or readable short Member label.
  assert.equal(nameOf({ _id: `person-${uuid}`, name: uuid, email: 'james@hanzo.ai' }), 'james')
  const fallback = nameOf({ _id: `person-${uuid}`, name: uuid })
  assert.equal(fallback.includes(uuid), false)
  assert.match(fallback, /^Member · 54a836$/i)
  assert.equal(nameOf({ _id: `person-${uuid}`, name: `hanzo:${uuid}` }), 'Member · 54a836')
})
