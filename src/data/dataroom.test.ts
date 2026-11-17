import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dataroom, memberOf, orgOf } from './dataroom.ts'

type Sent = { url: string; method: string; body?: string }

const recording = (answer: unknown = {}) => {
  const sent: Sent[] = []
  const send = async <T>(url: string, init?: RequestInit): Promise<T> => {
    sent.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    return answer as T
  }
  return { sent, send }
}

/** A token whose claims are `claims`: the data room reads them, it never verifies them. */
const token = (claims: Record<string, unknown>): string =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.')

test("the data room's REST leaves through this app's one call, JSON in and out", async () => {
  const { sent, send } = recording({ ok: true })
  const d = dataroom(send)
  assert.deepEqual(await d.get('https://api.hanzo.ai/v1/team/dataroom/folders'), { ok: true })
  await d.post('https://api.hanzo.ai/v1/team/dataroom/folders', { name: 'Q1' })
  await d.put('https://api.hanzo.ai/v1/team/dataroom/folders/f1', { name: 'Q1 2026' })
  await d.del('https://api.hanzo.ai/v1/team/dataroom/folders/f1')
  assert.deepEqual(
    sent.map((s) => [s.method, s.body]),
    [
      ['GET', undefined],
      ['POST', '{"name":"Q1"}'],
      ['PUT', '{"name":"Q1 2026"}'],
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
      ],
    }),
  )
  assert.deepEqual(m, { org: 'acme', superAdmin: false, adminOrgs: ['acme'] })
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
