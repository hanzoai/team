import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

import { base, memberOf, rest } from './crm.ts'

type Sent = { url: string; method: string; body?: string }

const recording = (answer: unknown = {}) => {
  const sent: Sent[] = []
  const send = async <T>(url: string, init?: RequestInit): Promise<T> => {
    sent.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    return answer as T
  }
  return { sent, send }
}

/** A token whose claims are `claims`: the CRM reads them, it never verifies them. */
const token = (claims: Record<string, unknown>): string =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.')

test("the CRM's REST leaves through this app's one call, JSON in and out", async () => {
  const { sent, send } = recording({ ok: true })
  const r = rest(send)
  assert.deepEqual(await r.get('https://api.hanzo.ai/v1/marketing/sequences?limit=200'), { ok: true })
  await r.post('https://api.hanzo.ai/v1/marketing/suppressions', { channel: 'email', address: 'a@acme.com' })
  await r.post('https://api.hanzo.ai/v1/base/modules/crm', {})
  await r.del('https://api.hanzo.ai/v1/marketing/suppressions?address=a%40acme.com&channel=email')
  assert.deepEqual(
    sent.map((s) => [s.method, s.body]),
    [
      ['GET', undefined],
      ['POST', '{"channel":"email","address":"a@acme.com"}'],
      ['POST', '{}'],
      ['DELETE', undefined],
    ],
  )
})

test("the org's Base is /v1/base, its records under each collection", async () => {
  const { sent, send } = recording({ page: 1, perPage: 50, totalItems: 0, totalPages: 0, items: [] })
  const b = base(send)
  await b.listRecords('people', { perPage: 50, sort: '-created' })
  await b.updateRecord('people', 'p1', { name: 'Ada' })
  assert.match(sent[0].url, /\/v1\/base\/collections\/people\/records\?perPage=50&sort=-created$/)
  assert.equal(sent[1].method, 'PATCH')
  assert.match(sent[1].url, /\/v1\/base\/collections\/people\/records\/p1$/)
  assert.equal(sent[1].body, '{"name":"Ada"}')
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
  assert.equal(memberOf(token({ orgs: [{ org: 'admin', role: 'admin' }], type: 'normal-user' })).superAdmin, true)
})

test('no token is no org and no rank', () => {
  assert.deepEqual(memberOf(null), { org: '', superAdmin: false, adminOrgs: [] })
  assert.deepEqual(memberOf('not-a-token'), { org: '', superAdmin: false, adminOrgs: [] })
})

test('every CRM page, and every address the CRM replaced, is served the app', () => {
  const vite = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8')
  const listed = /const CRM_ROUTES = \[([\s\S]*?)\]/.exec(vite)?.[1] ?? ''
  const routes = [...listed.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
  // @hanzo/crm CRM_PAGES past People (which is /crm itself), and the old addresses.
  const pages = ['companies', 'deals', 'fundraising', 'tasks', 'lists', 'sequences', 'candidates']
  const replaced = ['people', 'leads', 'contacts', 'customers', 'investors', 'funds', 'opportunities', 'outreach', 'forms', 'feedback', 'errors', 'deliverability']
  assert.deepEqual([...routes].sort(), [...pages, ...replaced].sort())
})
