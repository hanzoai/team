import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ACCESS, follow, home, subjectOf } from './follow.ts'

/** An unsigned JWT naming `sub`, the shape the SDK stores. */
const token = (sub: string, n = 0) => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${part({ alg: 'none' })}.${part({ sub, n })}.`
}

const ANN = token('ann')
const ANN_REFRESHED = token('ann', 1)
const BOB = token('bob')

test('a sign-out in another tab signs a signed-in tab out', () => {
  assert.equal(follow('in', ACCESS, ANN, null), 'drop')
})

test('the whole store cleared in another tab reads as a sign-out', () => {
  assert.equal(follow('in', null, null, null), 'drop')
})

test('a sign-in in another tab signs a signed-out tab in', () => {
  assert.equal(follow('out', ACCESS, null, ANN), 'adopt')
})

test('another person signed in in another tab is drawn as themselves', () => {
  assert.equal(follow('in', ACCESS, ANN, BOB), 'adopt')
})

test('a refresh in another tab, the same person, changes nothing', () => {
  assert.equal(follow('in', ACCESS, ANN, ANN_REFRESHED), null)
})

test('a signed-out tab hears a sign-out as nothing', () => {
  assert.equal(follow('out', ACCESS, ANN, null), null)
})

test('a tab still settling its first answer is left to settle it', () => {
  assert.equal(follow('unknown', ACCESS, ANN, null), null)
  assert.equal(follow('unknown', ACCESS, null, ANN), null)
})

test('another key changing is not a move', () => {
  assert.equal(follow('in', 'hanzo_iam_refresh_token', 'r1', null), null)
  assert.equal(follow('out', 'team.theme', null, 'dark'), null)
})

test('a session that ends elsewhere sends a tab on any page to the front page', () => {
  assert.equal(home('/chat/general', ''), '/')
  assert.equal(home('/crm', '?view=pipeline'), '/')
  assert.equal(home('/', '?channel=x'), '/')
})

test('a tab already on the front page stays and is only drawn signed out', () => {
  assert.equal(home('/', ''), null)
})

test('a subject is read off the token, and a token that names none names nobody', () => {
  assert.equal(subjectOf(ANN), 'ann')
  assert.equal(subjectOf('not-a-jwt'), null)
  assert.equal(subjectOf(null), null)
  assert.equal(subjectOf(token('')), null)
})
