import assert from 'node:assert/strict'
import { test } from 'node:test'

import { esign, memberOf, orgOf } from './esign.ts'

type Sent = { url: string; method: string; body?: string }

const recording = (answer: unknown = {}) => {
  const sent: Sent[] = []
  const send = async <T>(url: string, init?: RequestInit): Promise<T> => {
    sent.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    return answer as T
  }
  return { sent, send }
}

/** A token whose claims are `claims`: eSign reads them, it never verifies them. */
const token = (claims: Record<string, unknown>): string =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.')

test("eSign's REST leaves through this app's one call, JSON in and out", async () => {
  const { sent, send } = recording({ ok: true })
  const e = esign(send)
  assert.deepEqual(await e.get('https://api.hanzo.ai/v1/team/esign/envelopes'), { ok: true })
  await e.post('https://api.hanzo.ai/v1/team/esign/envelopes', { document: 'd1' })
  await e.put('https://api.hanzo.ai/v1/team/esign/envelopes/e1', { status: 'sent' })
  await e.del('https://api.hanzo.ai/v1/team/esign/envelopes/e1')
  assert.deepEqual(
    sent.map((s) => [s.method, s.body]),
    [
      ['GET', undefined],
      ['POST', '{"document":"d1"}'],
      ['PUT', '{"status":"sent"}'],
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
