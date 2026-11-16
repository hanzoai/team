/**
 * The CRM, read from the org's own Base.
 *
 * Since 2026-10-30 the CRM is the org's Base (module `crm`): people, companies,
 * opportunities, candidates, the forms on their timeline (`activities`) and the
 * lists they are on. crm.hanzo.ai and the site's intake (`POST
 * /v1/marketing/leads`) read and write the same records, so what a section
 * shows here is what the org holds, nothing derived and nothing kept in the
 * browser. The old `/v1/crm/{investors,funds,customers,leads,lists}` service
 * is gone and its address answers 503.
 *
 * Runtime errors are the one section that is not Base: the event plane's read
 * lens, `GET /v1/event/errors`, answers `{data: [...]}` newest first.
 *
 * A reply of any other shape is refused rather than drawn as an empty list,
 * and an org whose Base has no CRM yet answers 404, which `unopened` names.
 */
import { base, event } from './api.ts'
import { call, Refused } from './http.ts'

export type Section =
  | 'people'
  | 'leads'
  | 'customers'
  | 'investors'
  | 'companies'
  | 'funds'
  | 'opportunities'
  | 'forms'
  | 'candidates'
  | 'errors'
  | 'lists'

/** Every section, in the navigator's order. The first is where `/crm` lands. */
export const SECTIONS: readonly Section[] = [
  'people',
  'leads',
  'customers',
  'investors',
  'companies',
  'funds',
  'opportunities',
  'forms',
  'candidates',
  'errors',
  'lists',
]

/** Addresses this area answered before, and the section each became. */
const MOVED: Readonly<Record<string, Section>> = { feedback: 'forms' }

/**
 * The section an address names. `exact` false means the address is not this
 * section's own (a moved one, or one that never existed) and the screen should
 * replace it, so a stale bookmark lands somewhere real under the right address.
 */
export const sectionOf = (raw: string | undefined): { section: Section; exact: boolean } => {
  if (raw && (SECTIONS as readonly string[]).includes(raw)) return { section: raw as Section, exact: true }
  return { section: (raw && MOVED[raw]) || SECTIONS[0], exact: false }
}

/** One read of a Base collection: which records, in what order, with which relations joined. */
export type Query = { collection: string; filter?: string; sort?: string; expand?: string }

export const QUERIES: Readonly<Record<Exclude<Section, 'errors'>, Query>> = {
  people: { collection: 'people', sort: '-created', expand: 'company' },
  leads: { collection: 'people', filter: 'lifecycle = "lead"', sort: '-created', expand: 'company' },
  customers: { collection: 'people', filter: 'lifecycle = "customer" || type = "customer"', sort: '-created', expand: 'company' },
  investors: { collection: 'people', filter: 'type = "investor"', sort: '-created', expand: 'company' },
  companies: { collection: 'companies', sort: '-created' },
  funds: { collection: 'companies', filter: 'type = "investor"', sort: '-created' },
  opportunities: { collection: 'opportunities', sort: '-created', expand: 'company,contact' },
  forms: { collection: 'activities', filter: 'kind = "form"', sort: '-at,-created', expand: 'person,candidate' },
  candidates: { collection: 'candidates', sort: '-created' },
  lists: { collection: 'lists', sort: 'name' },
}

/** How many records one read asks for. A section holding more says so. */
export const PAGE = 200

/** How many errors the lens is asked for: its own ceiling. */
export const RECENT = 200

export const recordsPath = (q: Query, perPage = PAGE): string => {
  const qs = new URLSearchParams({ perPage: String(perPage) })
  if (q.filter) qs.set('filter', q.filter)
  if (q.sort) qs.set('sort', q.sort)
  if (q.expand) qs.set('expand', q.expand)
  return `${base.collections}/${q.collection}/records?${qs}`
}

/** Members per list, in one read: `{groups: [{value: <list id>, count}]}`. */
export const membersPath = `${base.collections}/list_members/aggregate?ops=count&group=list`

export const errorsPath = `${event.errors}?limit=${RECENT}`

// ── the record shapes ──────────────────────────────────────────────────────────

type Rec = Record<string, unknown>

/** One row of a section: the record's id and the values its columns read. */
export type Row = Record<string, unknown> & { id: string }

/** A section as read: the rows that came back and how many the org holds. */
export type Sheet = { rows: Row[]; total: number }

/** A record joined through a relation, as the chip @hanzo/data draws. */
export type Linked = { id: string; name: string }

const obj = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {})
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * A Base instant (`2026-11-16 17:41:19.123Z`) as ISO 8601. The space is Base's
 * own spelling, and a browser that does not read it draws no date at all.
 */
export const iso = (v: unknown): string => str(v).replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2')

/** A person's name on one line, from the `{firstName, lastName}` composite. */
export const nameOf = (v: unknown): string => {
  if (typeof v === 'string') return v.trim()
  const n = obj(v)
  return [str(n.firstName), str(n.lastName)].filter(Boolean).join(' ')
}

/** The address an `emails` composite leads with. */
export const emailOf = (v: unknown): string => str(obj(v).primaryEmail)

/** A `links` composite as the list @hanzo/data draws: the primary link, then the rest. */
export const linksOf = (v: unknown): { url: string; label?: string }[] => {
  const l = obj(v)
  const all = [
    { url: l.primaryLinkUrl, label: l.primaryLinkLabel },
    ...(Array.isArray(l.secondaryLinks) ? l.secondaryLinks.map(obj) : []),
  ]
  return all
    .map((x) => ({ url: str(x.url), label: str(x.label) }))
    .filter((x) => x.url)
    .map((x) => (x.label ? x : { url: x.url }))
}

/** A `currency` composite: Base keeps millionths, @hanzo/data draws the major unit. Null when empty. */
export const moneyOf = (v: unknown): { amount: number; currencyCode: string } | null => {
  const m = obj(v)
  const micros = num(m.amountMicros)
  return micros === null ? null : { amount: micros / 1e6, currencyCode: str(m.currencyCode) }
}

const personName = (p: Rec) => nameOf(p.name) || emailOf(p.emails)
const companyName = (c: Rec) => str(c.name)

/**
 * The record a relation names, when the read joined it. A relation the read
 * could not join (one the caller may not see) is drawn as nothing rather than
 * as a bare id nobody can read.
 */
const linked = (r: Rec, key: string, label: (x: Rec) => string): Linked | null => {
  const x = obj(obj(r.expand)[key])
  const id = str(x.id) || str(r[key])
  const name = label(x)
  return id && name ? { id, name } : null
}

export const personRow = (r: Rec): Row => ({
  id: str(r.id),
  name: personName(r),
  company: linked(r, 'company', companyName),
  email: emailOf(r.emails),
  phone: r.phones ?? null,
  job_title: str(r.job_title),
  lifecycle: str(r.lifecycle),
  type: str(r.type),
  outreach: str(r.outreach),
  contacted: iso(r.contacted),
  address: r.address ?? null,
  linkedin: linksOf(r.linkedin),
  source: str(r.source),
  created: iso(r.created),
})

export const companyRow = (r: Rec): Row => ({
  id: str(r.id),
  name: companyName(r),
  type: str(r.type),
  domain: linksOf(r.domain),
  employees: num(r.employees),
  annual_revenue: moneyOf(r.annual_revenue),
  icp: r.icp === true,
  address: r.address ?? null,
  linkedin: linksOf(r.linkedin),
  created: iso(r.created),
})

export const opportunityRow = (r: Rec): Row => ({
  id: str(r.id),
  name: str(r.name),
  pipeline: str(r.pipeline),
  stage: str(r.stage),
  amount: moneyOf(r.amount),
  company: linked(r, 'company', companyName),
  contact: linked(r, 'contact', personName),
  close_date: iso(r.close_date),
  next_step: str(r.next_step),
  contacted: iso(r.contacted),
  created: iso(r.created),
})

/** A form on someone's timeline: who filed it (a person, or an applicant) and what it was. */
export const formRow = (r: Rec): Row => {
  const joined = obj(r.expand)
  const filer = obj(joined.person ?? joined.candidate)
  return {
    id: str(r.id),
    subject: str(r.subject),
    kind: str(obj(r.data).kind),
    from: linked(r, 'person', personName) ?? linked(r, 'candidate', personName),
    email: emailOf(filer.emails),
    channel: str(r.channel),
    ref: str(r.source_id),
    at: iso(r.at) || iso(r.created),
  }
}

export const candidateRow = (r: Rec): Row => ({
  id: str(r.id),
  name: personName(r),
  email: emailOf(r.emails),
  phone: r.phones ?? null,
  role: str(r.role),
  department: str(r.department),
  location: str(r.location),
  stage: str(r.stage),
  consent: str(r.consent),
  links: linksOf(r.links),
  source: str(r.source),
  applied: iso(r.applied) || iso(r.created),
})

/** One captured error: the exception the client sent, where it fired, and when. */
export const errorRow = (e: Rec, i: number): Row => {
  const ex = obj(e.exception)
  return {
    id: str(e.id) || `error-${i}`,
    message: str(ex.message) || str(e.event),
    type: str(ex.type),
    product: str(e.product),
    path: str(e.path) || str(e.url),
    library: [str(e.library), str(e.libraryVersion)].filter(Boolean).join(' '),
    handled: typeof ex.handled === 'boolean' ? ex.handled : null,
    who: str(e.distinctId),
    at: iso(e.timestamp),
  }
}

export const listRow = (r: Rec): Row => ({
  id: str(r.id),
  name: str(r.name),
  purpose: str(r.purpose),
  object: str(r.object),
  members: 0,
  description: str(r.description),
  created: iso(r.created),
})

/** Members per list id, from the aggregate's groups. */
export const membersBy = (reply: unknown): Map<string, number> => {
  const groups = obj(reply).groups
  if (!Array.isArray(groups)) throw new Error('The list members came back in a shape this client does not read.')
  const out = new Map<string, number>()
  for (const g of groups.map(obj)) {
    const id = str(g.value)
    const n = num(g.count)
    if (id && n !== null) out.set(id, n)
  }
  return out
}

const SHAPES: Readonly<Record<Exclude<Section, 'errors'>, (r: Rec) => Row>> = {
  people: personRow,
  leads: personRow,
  customers: personRow,
  investors: personRow,
  companies: companyRow,
  funds: companyRow,
  opportunities: opportunityRow,
  forms: formRow,
  candidates: candidateRow,
  lists: listRow,
}

// ── the reads ──────────────────────────────────────────────────────────────────

type Get = <T>(path: string) => Promise<T>

const items = (reply: unknown, key: string): Rec[] => {
  const list = obj(reply)[key]
  if (!Array.isArray(list)) throw new Error('The CRM answered in a shape this client does not read.')
  return list.map(obj)
}

/**
 * Read one section. `get` is the one door (`call`); a test hands its own.
 *
 * Lists take a second read, the member count per list, so the number beside a
 * list is the org's and not a guess.
 */
export const readSection = async (section: Section, get: Get = call): Promise<Sheet> => {
  if (section === 'errors') {
    const rows = items(await get<unknown>(errorsPath), 'data').map(errorRow)
    return { rows, total: rows.length }
  }
  const reply = await get<unknown>(recordsPath(QUERIES[section]))
  let rows = items(reply, 'items').map(SHAPES[section])
  if (section === 'lists' && rows.length > 0) {
    const members = membersBy(await get<unknown>(membersPath))
    rows = rows.map((r) => ({ ...r, members: members.get(r.id) ?? 0 }))
  }
  const total = num(obj(reply).totalItems)
  return { rows, total: total ?? rows.length }
}

/** True when the org's Base has no CRM in it: the collection is not there to read. */
export const unopened = (e: unknown): boolean => e instanceof Refused && e.status === 404
