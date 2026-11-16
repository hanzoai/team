import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  QUERIES,
  SECTIONS,
  errorRow,
  errorsPath,
  formRow,
  iso,
  linksOf,
  membersBy,
  membersPath,
  moneyOf,
  opportunityRow,
  personRow,
  readSection,
  recordsPath,
  sectionOf,
  unopened,
} from './crm.ts'
import { Refused } from './http.ts'

/** A door that answers from a table of paths, and remembers what it was asked. */
const door = (answers: Record<string, unknown>) => {
  const asked: string[] = []
  const get = async <T>(path: string): Promise<T> => {
    asked.push(path)
    if (!(path in answers)) throw new Refused(404, `no answer for ${path}`)
    return answers[path] as T
  }
  return { get, asked }
}

test('a section address is itself; a moved one lands where it went; anything else lands on people', () => {
  for (const s of SECTIONS) assert.deepEqual(sectionOf(s), { section: s, exact: true })
  assert.deepEqual(sectionOf('feedback'), { section: 'forms', exact: false })
  assert.deepEqual(sectionOf('deliverability'), { section: 'people', exact: false })
  assert.deepEqual(sectionOf(undefined), { section: 'people', exact: false })
})

test('every Base section reads a collection the CRM module declares', () => {
  const declared = new Set(['people', 'companies', 'opportunities', 'activities', 'candidates', 'lists'])
  for (const q of Object.values(QUERIES)) assert.ok(declared.has(q.collection), q.collection)
})

test('a read asks Base for the section’s own records, filtered on the server', () => {
  const path = recordsPath(QUERIES.investors)
  const url = new URL(path, 'https://api.example')
  assert.equal(url.pathname, '/v1/base/collections/people/records')
  assert.equal(url.searchParams.get('filter'), 'type = "investor"')
  assert.equal(url.searchParams.get('expand'), 'company')
  assert.equal(url.searchParams.get('sort'), '-created')
  assert.equal(url.searchParams.get('perPage'), '200')

  const forms = new URL(recordsPath(QUERIES.forms), 'https://api.example')
  assert.equal(forms.pathname, '/v1/base/collections/activities/records')
  assert.equal(forms.searchParams.get('filter'), 'kind = "form"')
})

test('a Base instant becomes ISO, and anything else is left as it came', () => {
  assert.equal(iso('2026-11-16 17:41:19.123Z'), '2026-11-16T17:41:19.123Z')
  assert.equal(iso('2026-11-16T17:41:19Z'), '2026-11-16T17:41:19Z')
  assert.equal(iso('2026-11-16'), '2026-11-16')
  assert.equal(iso(''), '')
  assert.equal(iso(null), '')
})

test('money is kept in millionths and drawn in the major unit; an empty amount is no amount', () => {
  assert.deepEqual(moneyOf({ amountMicros: 25_000_000_000, currencyCode: 'USD' }), { amount: 25_000, currencyCode: 'USD' })
  assert.deepEqual(moneyOf({ amountMicros: 0, currencyCode: 'EUR' }), { amount: 0, currencyCode: 'EUR' })
  assert.equal(moneyOf(null), null)
  assert.equal(moneyOf({ currencyCode: 'USD' }), null)
})

test('links read the primary link first, then the rest, and drop empty ones', () => {
  assert.deepEqual(
    linksOf({
      primaryLinkUrl: 'https://hanzo.ai',
      primaryLinkLabel: '',
      secondaryLinks: [{ url: 'https://x.com/hanzoai', label: 'X' }, { url: '' }],
    }),
    [{ url: 'https://hanzo.ai' }, { url: 'https://x.com/hanzoai', label: 'X' }],
  )
  assert.deepEqual(linksOf(null), [])
})

test('a person reads its composite name and address, and the company it was joined to', () => {
  const row = personRow({
    id: 'p1',
    name: { firstName: 'Ada', lastName: 'Lovelace' },
    emails: { primaryEmail: 'ada@example.com', additionalEmails: [] },
    lifecycle: 'lead',
    type: 'investor',
    company: 'c1',
    expand: { company: { id: 'c1', name: 'Analytical Engines' } },
    created: '2026-11-01 09:00:00.000Z',
  })
  assert.equal(row.id, 'p1')
  assert.equal(row.name, 'Ada Lovelace')
  assert.equal(row.email, 'ada@example.com')
  assert.deepEqual(row.company, { id: 'c1', name: 'Analytical Engines' })
  assert.equal(row.created, '2026-11-01T09:00:00.000Z')
})

test('a person with no name is named by their address; a company not joined is not drawn as its id', () => {
  const row = personRow({ id: 'p2', name: null, emails: { primaryEmail: 'b@example.com' }, company: 'c9' })
  assert.equal(row.name, 'b@example.com')
  assert.equal(row.company, null)
})

test('an opportunity reads its money and both relations', () => {
  const row = opportunityRow({
    id: 'o1',
    name: 'Seed',
    pipeline: 'fundraising',
    stage: 'term_sheet',
    amount: { amountMicros: 1_500_000_000_000, currencyCode: 'USD' },
    company: 'c1',
    contact: 'p1',
    expand: { company: { id: 'c1', name: 'Fund I' }, contact: { id: 'p1', name: { firstName: 'Grace' } } },
  })
  assert.deepEqual(row.amount, { amount: 1_500_000, currencyCode: 'USD' })
  assert.deepEqual(row.company, { id: 'c1', name: 'Fund I' })
  assert.deepEqual(row.contact, { id: 'p1', name: 'Grace' })
})

test('a form names who filed it — a person, or an applicant — and its kind', () => {
  const lead = formRow({
    id: 'a1',
    kind: 'form',
    subject: 'Beta',
    source_id: 'lead_123',
    channel: 'web',
    at: '2026-11-10 12:00:00.000Z',
    data: { kind: 'beta' },
    person: 'p1',
    expand: { person: { id: 'p1', name: { firstName: 'Ada' }, emails: { primaryEmail: 'ada@example.com' } } },
  })
  assert.deepEqual(lead.from, { id: 'p1', name: 'Ada' })
  assert.equal(lead.email, 'ada@example.com')
  assert.equal(lead.kind, 'beta')
  assert.equal(lead.ref, 'lead_123')
  assert.equal(lead.at, '2026-11-10T12:00:00.000Z')

  const applicant = formRow({
    id: 'a2',
    data: { kind: 'careers' },
    candidate: 'k1',
    created: '2026-11-11 08:00:00.000Z',
    expand: { candidate: { id: 'k1', name: { firstName: 'Lin', lastName: 'Wu' }, emails: { primaryEmail: 'lin@example.com' } } },
  })
  assert.deepEqual(applicant.from, { id: 'k1', name: 'Lin Wu' })
  assert.equal(applicant.email, 'lin@example.com')
  assert.equal(applicant.at, '2026-11-11T08:00:00.000Z')
})

test('an error reads the exception the lens surfaces, not fields it never sends', () => {
  const row = errorRow(
    {
      id: 'e1',
      timestamp: '2026-11-16T10:00:00Z',
      event: '$exception',
      product: 'team',
      path: '/crm/people',
      library: '@hanzo/event',
      libraryVersion: '0.3.66',
      distinctId: 'u1',
      exception: { type: 'TypeError', message: 'x is undefined', handled: false },
    },
    0,
  )
  assert.equal(row.message, 'x is undefined')
  assert.equal(row.type, 'TypeError')
  assert.equal(row.product, 'team')
  assert.equal(row.path, '/crm/people')
  assert.equal(row.library, '@hanzo/event 0.3.66')
  assert.equal(row.handled, false)
  assert.equal(row.at, '2026-11-16T10:00:00Z')

  const bare = errorRow({ event: '$error', url: 'https://hanzo.team/chat' }, 3)
  assert.equal(bare.id, 'error-3')
  assert.equal(bare.message, '$error')
  assert.equal(bare.path, 'https://hanzo.team/chat')
  assert.equal(bare.handled, null)
})

test('members are counted per list from the aggregate, and a strange reply is refused', () => {
  const by = membersBy({ groups: [{ value: 'l1', count: 3 }, { value: 'l2', count: 0 }, { count: 9 }], total: { count: 3 } })
  assert.equal(by.get('l1'), 3)
  assert.equal(by.get('l2'), 0)
  assert.equal(by.size, 2)
  assert.throws(() => membersBy({ total: { count: 1 } }))
})

test('a section reads its records and reports the org’s total, not the page’s', async () => {
  const { get, asked } = door({
    [recordsPath(QUERIES.leads)]: {
      items: [{ id: 'p1', name: { firstName: 'Ada' }, lifecycle: 'lead' }],
      page: 1,
      perPage: 200,
      totalItems: 431,
    },
  })
  const sheet = await readSection('leads', get)
  assert.equal(sheet.total, 431)
  assert.equal(sheet.rows.length, 1)
  assert.equal(sheet.rows[0].name, 'Ada')
  assert.deepEqual(asked, [recordsPath(QUERIES.leads)])
})

test('lists carry their member counts; an org with no lists asks for none', async () => {
  const full = door({
    [recordsPath(QUERIES.lists)]: { items: [{ id: 'l1', name: 'Beta' }, { id: 'l2', name: 'Careers news' }], totalItems: 2 },
    [membersPath]: { groups: [{ value: 'l1', count: 12 }] },
  })
  const sheet = await readSection('lists', full.get)
  assert.deepEqual(
    sheet.rows.map((r) => [r.name, r.members]),
    [
      ['Beta', 12],
      ['Careers news', 0],
    ],
  )

  const none = door({ [recordsPath(QUERIES.lists)]: { items: [], totalItems: 0 } })
  assert.deepEqual(await readSection('lists', none.get), { rows: [], total: 0 })
  assert.deepEqual(none.asked, [recordsPath(QUERIES.lists)])
})

test('errors read the lens’s data array; any other shape is refused, not drawn empty', async () => {
  const ok = door({ [errorsPath]: { data: [{ id: 'e1', exception: { message: 'boom' } }] } })
  const sheet = await readSection('errors', ok.get)
  assert.equal(sheet.total, 1)
  assert.equal(sheet.rows[0].message, 'boom')

  const old = door({ [errorsPath]: { items: [] } })
  await assert.rejects(readSection('errors', old.get))
})

test('an org whose Base has no CRM is told apart from a failed read', async () => {
  const { get } = door({})
  const failure = await readSection('people', get).catch((e: unknown) => e)
  assert.equal(unopened(failure), true)
  assert.equal(unopened(new Refused(503, 'no available server')), false)
  assert.equal(unopened(new Error('Failed to fetch')), false)
})

test('the build pre-renders every section’s address', async () => {
  const { readFile } = await import('node:fs/promises')
  const config = await readFile(new URL('../../vite.config.ts', import.meta.url), 'utf8')
  const listed = config.match(/const CRM_SECTIONS = \[([^\]]*)\]/)?.[1] ?? ''
  for (const s of SECTIONS) assert.ok(listed.includes(`'${s}'`), `vite.config.ts CRM_SECTIONS lacks '${s}'`)
})
