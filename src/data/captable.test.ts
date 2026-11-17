import assert from 'node:assert/strict'
import { test } from 'node:test'

import { captable, memberOf, orgOf } from './captable.ts'

type Sent = { url: string; method: string; body?: string }

const recording = (answer: unknown = {}) => {
  const sent: Sent[] = []
  const send = async <T>(url: string, init?: RequestInit): Promise<T> => {
    sent.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    return answer as T
  }
  return { sent, send }
}

/** A token whose claims are `claims`: the cap table reads them, it never verifies them. */
const token = (claims: Record<string, unknown>): string =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.')

test("the cap table's REST leaves through this app's one call, JSON in and out", async () => {
  const { sent, send } = recording({ ok: true })
  const c = captable(send)
  assert.deepEqual(await c.get('https://api.hanzo.ai/v1/team/captable/rounds'), { ok: true })
  await c.post('https://api.hanzo.ai/v1/team/captable/rounds', { name: 'Seed' })
  await c.put('https://api.hanzo.ai/v1/team/captable/rounds/r1', { name: 'Series A' })
  await c.del('https://api.hanzo.ai/v1/team/captable/rounds/r1')
  assert.deepEqual(
    sent.map((s) => [s.method, s.body]),
    [
      ['GET', undefined],
      ['POST', '{"name":"Seed"}'],
      ['PUT', '{"name":"Series A"}'],
      ['DELETE', undefined],
    ],
  )
})

test('a member is read from the token as the console reads one', () => {
  const m = memberOf(
    token({
      orgs: [
        { org: 'acme', role: 'owner' },
        { org: 'beta', role: 'member' },
        { org: 'gamma', role: 'admin' },
      ],
    }),
  )
  assert.deepEqual(m, { org: 'acme', superAdmin: false, adminOrgs: ['acme', 'gamma'] })
})

test('orgOf is the org the token acts in', () => {
  assert.equal(
    orgOf(
      token({
        orgs: [{ org: 'acme', role: 'owner' }],
      }),
    ),
    'acme',
  )
  assert.equal(orgOf(null), '')
  assert.equal(orgOf('not-a-token'), '')
})
