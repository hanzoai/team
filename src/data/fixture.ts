/**
 * A world on purpose, so a screen can be entered in a state rather than in
 * whichever one the server happened to produce.
 *
 * A board that looks right because the plane answered nothing is not a board
 * that works, and a screenshot of it proves nothing about the populated one.
 * So every state a screen has is reachable deliberately, by name, through ONE
 * knob:
 *
 *   ?state=loading    nothing ever answers
 *   ?state=empty      a space with no projects and no messages
 *   ?state=failure    every read refuses
 *   ?state=minimal    one project, four columns, three issues
 *   ?state=realistic  four columns filled, a channel, an inbox
 *
 * Absent the knob this module is inert and every call goes to the real plane.
 * It is one parameter read in one place; there is no build flag, no second
 * entry point and no branch anywhere else in the app.
 *
 * The stand APPLIES the transactions it is given and broadcasts them back, the
 * way the server does — so dragging a card in `?state=realistic` exercises the
 * same write path, the same push, and the same re-read as dragging one in a
 * live space.
 */
import { Category, Class, Priority, Tx, type Channel, type Component, type Doc, type Issue, type Message, type Notice, type Person, type Project, type Status, type Tag } from './model.ts'
import { Socket, type Plane, type Standing, type Wire } from './socket.ts'
import type { SpaceRow } from './account.ts'
import { HANZO_AGENTS } from './agents.ts'

const NAMES = ['live', 'loading', 'empty', 'failure', 'minimal', 'realistic'] as const
type Name = (typeof NAMES)[number]

const chosen = (): Name => {
  if (typeof window === 'undefined') return 'live'
  const asked = new URLSearchParams(window.location.search).get('state')
  if ((NAMES as readonly string[]).includes(asked ?? '')) return asked as Name
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return 'realistic'
  return 'live'
}

const name = chosen()

/** Whether this session is standing on fixtures at all. A screen may say so. */
export const standing = name

const never = <T>(): Promise<T> => new Promise<T>(() => {})
const refuse = <T>(): Promise<T> => Promise.reject(new Error('the fixture refuses, on purpose'))

// ── the world ─────────────────────────────────────────────────────────────────

const SPACE = 'fixture'
const now = Date.UTC(2026, 8, 8)
const base = (id: string, cls: string): Doc => ({ _id: id, _class: cls, space: SPACE, modifiedOn: now, modifiedBy: 'p1' })

/** Everyone in the space. `Last,First` is the platform's own sort key. */
const humans: Person[] = [
  'Reynolds,Elizabeth',
  'Wolf,Sonya',
  'Osinski,Kenny',
  'Zinovyev,Alexey',
  'Christiansen,Billy',
  'Thompson,Warren',
  'Price,Shelia',
  'Navarro,Marta',
  'Okafor,Daniel',
].map((name, i) => ({ ...base(`p${i + 1}`, Class.person), name }))

const agentPeople: Person[] = [
  { ...base('p-zach', Class.person), name: 'Kelling,Zach' },
  ...HANZO_AGENTS.map((a) => ({
    ...base(`bot-${a.id}`, Class.person),
    name: a.name,
    avatar: a.avatar,
  })),
]

const people: Person[] = [...humans, ...agentPeople]

const everyone = humans.map((p) => p._id)

const project = (id: string, name: string, sequence: number, members: string[]): Project => ({
  ...base(`proj-${id}`, Class.project),
  space: 'core:space:Space',
  name,
  identifier: id.toUpperCase(),
  sequence,
  members,
})

const projects: Project[] = [
  project('crm', 'CRM', 42, everyone),
  project('mkt', 'Marketing and PM', 18, everyone.slice(0, 5)),
  project('next', 'Next Platform', 9, everyone.slice(2, 7)),
  project('dev', 'Development', 27, everyone.slice(1, 6)),
]

/**
 * The four workflow states, per project — which is where the platform keeps
 * them: `IssueStatus.space` IS the project, so two projects never share a
 * column document even when they agree on its name.
 */
const COLUMNS = [
  ['backlog', 'Backlog', Category.backlog],
  ['todo', 'To do', Category.todo],
  ['doing', 'In progress', Category.doing],
  ['done', 'Done', Category.done],
] as const

const statuses: Status[] = projects.flatMap((p) =>
  COLUMNS.map(([id, name, category]) => ({
    ...base(`${p._id}-${id}`, Class.status),
    space: p._id,
    name,
    category,
  })),
)

/** The parts of a project a card can name. */
const components: Component[] = [
  { ...base('cmp-freelynk', Class.component), space: 'proj-crm', label: 'freelynk' },
  { ...base('cmp-acme', Class.component), space: 'proj-crm', label: 'acme' },
  { ...base('cmp-atlas', Class.component), space: 'proj-next', label: 'atlas' },
]

/**
 * One row of work.
 *
 * `at` is completion as a percentage, which the platform holds as time reported
 * against time estimated — so it is stored as those two numbers and never as a
 * third field the model does not have.
 */
type Row = {
  in: string
  at: (typeof COLUMNS)[number][0]
  title: string
  rank: number
  done?: number
  tags?: string[]
  part?: string
  crew?: number
  files?: number
  replies?: number
}

const WORK: Row[] = [
  { in: 'crm', at: 'backlog', title: 'Set up cluster monitoring', rank: Priority.low, done: 12, tags: ['Devops'], part: 'cmp-freelynk', crew: 2, files: 1 },
  { in: 'crm', at: 'backlog', title: 'Analyze, cluster, and understand search queries', rank: Priority.low, done: 0, tags: ['Devops', 'Research'], crew: 3, files: 3, replies: 10 },
  { in: 'crm', at: 'backlog', title: "Collect the Linkedin's integration benchmarks", rank: Priority.medium, done: 5, tags: ['Marketing'], crew: 1 },
  { in: 'crm', at: 'backlog', title: 'Split the billing export by seat type', rank: Priority.medium, done: 0, tags: ['Backend'], crew: 2, replies: 3 },
  { in: 'crm', at: 'backlog', title: 'Decide what a dormant account keeps', rank: Priority.low, tags: ['Research'], crew: 1 },
  { in: 'crm', at: 'backlog', title: 'Rewrite the import wizard copy', rank: Priority.low, done: 0, tags: ['Design'], crew: 2, files: 2 },
  { in: 'crm', at: 'backlog', title: 'Measure first-contact latency by region', rank: Priority.medium, done: 8, tags: ['Devops', 'QA'], part: 'cmp-freelynk', crew: 2 },

  { in: 'crm', at: 'todo', title: 'Sales planning and monitoring of important transactions', rank: Priority.low, done: 20, tags: ['Sales', 'Marketing'], part: 'cmp-freelynk', crew: 3, files: 1, replies: 2 },
  { in: 'crm', at: 'todo', title: 'Rework the user onboarding', rank: Priority.medium, done: 25, tags: ['Design'], crew: 2, replies: 4 },
  { in: 'crm', at: 'todo', title: 'Telephony + call recording', rank: Priority.medium, done: 0, crew: 1 },
  { in: 'crm', at: 'todo', title: 'Deduplicate contacts on import', rank: Priority.high, done: 40, tags: ['Backend', 'QA'], crew: 2, files: 1, replies: 6 },
  { in: 'crm', at: 'todo', title: 'Give the pipeline view a saved filter', rank: Priority.medium, done: 15, tags: ['Frontend'], crew: 2 },
  { in: 'crm', at: 'todo', title: 'Retire the legacy webhook payload', rank: Priority.low, tags: ['Backend'], crew: 1, replies: 1 },

  { in: 'crm', at: 'doing', title: 'Find the respondents for the moderated testing', rank: Priority.medium, done: 50, tags: ['QA'], crew: 3 },
  { in: 'crm', at: 'doing', title: 'Conduct custdev interview w/ existing client', rank: Priority.medium, done: 90, tags: ['QA'], crew: 4, files: 1, replies: 24 },
  { in: 'crm', at: 'doing', title: 'Add view-resource for MVP Deal Screen', rank: Priority.high, done: 35, tags: ['Feature', 'Frontend'], part: 'cmp-acme', crew: 2 },

  { in: 'crm', at: 'done', title: 'Ship the seat-count reconciliation', rank: Priority.high, done: 100, tags: ['Backend'], crew: 2, replies: 6 },
  { in: 'crm', at: 'done', title: 'Retire the second colour table', rank: Priority.low, done: 100, tags: ['Design'], crew: 1 },
  { in: 'crm', at: 'done', title: 'Cut the first release of the deal screen', rank: Priority.urgent, done: 100, tags: ['Feature'], part: 'cmp-acme', crew: 3, files: 2, replies: 11 },

  { in: 'mkt', at: 'backlog', title: 'Draft the quarter’s launch calendar', rank: Priority.medium, done: 0, tags: ['Marketing'], crew: 2 },
  { in: 'mkt', at: 'todo', title: 'Rewrite the pricing page above the fold', rank: Priority.high, done: 30, tags: ['Design', 'Marketing'], crew: 2, replies: 5 },
  { in: 'mkt', at: 'doing', title: 'Instrument the signup funnel', rank: Priority.medium, done: 60, tags: ['Devops'], crew: 1 },

  { in: 'next', at: 'backlog', title: 'Choose the storage engine for the ledger', rank: Priority.urgent, done: 0, tags: ['Research', 'Backend'], part: 'cmp-atlas', crew: 3, replies: 8 },
  { in: 'next', at: 'todo', title: 'Sketch the plugin surface', rank: Priority.medium, done: 10, tags: ['Design'], crew: 2 },
  { in: 'next', at: 'doing', title: 'Prove the migration on a copy of production', rank: Priority.high, done: 45, tags: ['Devops', 'QA'], part: 'cmp-atlas', crew: 2, files: 4 },

  { in: 'dev', at: 'todo', title: 'Cut the flaky tests out of the merge gate', rank: Priority.high, done: 20, tags: ['QA'], crew: 2, replies: 9 },
  { in: 'dev', at: 'doing', title: 'Move the build off the shared runner', rank: Priority.urgent, done: 70, tags: ['Devops'], crew: 3, files: 1, replies: 12 },
  { in: 'dev', at: 'done', title: 'Pin every dependency to one version', rank: Priority.medium, done: 100, tags: ['Backend'], crew: 2 },
]

const rank = (n: number) => String(n + 1000)

const issues: Issue[] = WORK.map((row, i) => ({
  ...base(`i${i + 1}`, Class.issue),
  space: `proj-${row.in}`,
  title: row.title,
  status: `proj-${row.in}-${row.at}`,
  priority: row.rank,
  number: i + 1,
  rank: rank(i),
  assignee: people[i % people.length]._id,
  collaborators: Array.from({ length: row.crew ?? 1 }, (_, k) => people[(i + k) % people.length]._id),
  component: row.part ?? null,
  // Completion is time reported against time estimated, which is the only one
  // the model holds. No estimate is unknown progress, and a card draws no ring.
  ...(row.done === undefined ? {} : { estimation: 100, reportedTime: row.done }),
  attachments: row.files ?? 0,
  comments: row.replies ?? 0,
  labels: row.tags?.length ?? 0,
}))

/** The tags themselves. The model keeps a count on the issue and the words in
 *  their own documents, so a card that paints words reads these. */
const tags: Tag[] = WORK.flatMap((row, i) =>
  (row.tags ?? []).map((title) => ({
    ...base(`t${i + 1}-${title}`, Class.tag),
    space: `proj-${row.in}`,
    attachedTo: `i${i + 1}`,
    attachedToClass: Class.issue,
    title,
  })),
)

const channels: Channel[] = [
  { ...base('c-general', Class.channel), name: 'general', topic: 'Everything that has no better home' },
  { ...base('c-hanzo-support', Class.channel), name: 'hanzo-support', topic: 'Customer support, triage & live escalations' },
  { ...base('c-hanzo-ui', Class.channel), name: 'hanzo-ui', topic: 'Design system, @hanzo/gui & @hanzo/ui components' },
  { ...base('c-hanzo-video', Class.channel), name: 'hanzo-video', topic: 'Studio, Omni Flash & video generation' },
  { ...base('c-hanzo-revenue', Class.channel), name: 'hanzo-revenue', topic: 'Pipeline, enterprise deals & billing' },
  { ...base('c-tracker', Class.channel), name: 'tracker', topic: 'The board' },
  { ...base('c-design', Class.channel), name: 'design', topic: 'What it looks like and why' },
  { ...base('c-lux-bank', Class.channel), name: 'lux-bank', topic: 'Lux banking, cards & settlement' },
  { ...base('c-lux-bridge', Class.channel), name: 'lux-bridge', topic: 'Cross-chain bridge & MPC' },
]

const DIRECT_CLASS = 'chunter:class:DirectMessage'

const directs: Channel[] = HANZO_AGENTS.map((a) => ({
  ...base(`dm-${a.id}`, DIRECT_CLASS),
  name: a.name,
  topic: `${a.role} · ${a.department} · ${a.status}`,
  members: [`bot-${a.id}`, 'p-zach'],
}))

const messages: Message[] = [
  { ...base('m1', Class.message), message: 'Moved the estimate ring off the reference brand and onto our own accent.', attachedTo: 'c-general', modifiedOn: now - 3_600_000, modifiedBy: 'p2' },
  { ...base('m2', Class.message), message: 'Pushed the column headers flush with the card box — they were sitting on the panel padding.', attachedTo: 'c-general', modifiedOn: now - 1_800_000, modifiedBy: 'p3' },
  { ...base('m3', Class.message), message: '@everyone the tracker is on the real plane now.', attachedTo: 'c-general', modifiedOn: now - 600_000, modifiedBy: 'p1' },
  { ...base('m4', Class.message), message: 'All 23 Hanzo AI agents and 24/7 bots are connected across Hanzo AI, The Foundation, Lux Network, and Zoo Labs.', attachedTo: 'c-general', modifiedOn: now - 300_000, modifiedBy: 'bot-vi' },
  { ...base('m5', Class.message), message: 'Zero open P0/P1 escalations. Automated triage resolved 18 tickets in the last hour.', attachedTo: 'c-hanzo-support', modifiedOn: now - 900_000, modifiedBy: 'bot-su' },
  { ...base('m6', Class.message), message: 'Updated @hanzo/gui monochrome tokens and BusinessHeader switcher across all workspace surfaces.', attachedTo: 'c-hanzo-ui', modifiedOn: now - 1_200_000, modifiedBy: 'bot-des' },
  { ...base('m7', Class.message), message: 'Rendered 4K hero stills and agent portraits via Omni 1.2 Flash in Studio.', attachedTo: 'c-hanzo-video', modifiedOn: now - 1_500_000, modifiedBy: 'bot-art' },
  { ...base('m8', Class.message), message: 'Synced org grants, prepaid balances, and enterprise seats with Commerce.', attachedTo: 'c-hanzo-revenue', modifiedOn: now - 450_000, modifiedBy: 'bot-rev' },
  { ...base('m-rev-1', Class.message), message: 'Tell me when it’s done and I’ll re-send all six fixes and check them on the live site. I’ve posted the cause in #hanzo-revenue. Longer term, a platform rule that a member can’t spend org credits on leases will block every agent this way, and it’s worth fixing.', attachedTo: 'dm-rev', modifiedOn: now - 900_000, modifiedBy: 'bot-rev' },
  { ...base('m-rev-2', Class.message), message: 'hanzo has a credit grant this is some kind of bug?', attachedTo: 'dm-rev', modifiedOn: now - 780_000, modifiedBy: 'p-zach' },
  { ...base('m-rev-3', Class.message), message: 'Probably, yes. If the org has a grant but the lease reads $0, it’s likely looking up the wrong account, under user ID "hanzo" instead of the org’s ID. I’m checking the grant and the account the lease charges now.', attachedTo: 'dm-rev', modifiedOn: now - 700_000, modifiedBy: 'bot-rev' },
  { ...base('m-rev-4', Class.message), message: 'its z/hanzo', attachedTo: 'dm-rev', modifiedOn: now - 640_000, modifiedBy: 'p-zach' },
  { ...base('m-rev-5', Class.message), message: 'Noted, the account is z/hanzo. I’ll check whether the grant is on z/hanzo while the lease charges hanzo or hanzo/z. A mismatch like that would explain the $0.', attachedTo: 'dm-rev', modifiedOn: now - 580_000, modifiedBy: 'bot-rev' },
  { ...base('m-rev-6', Class.message), message: "i'm also super admin", attachedTo: 'dm-rev', modifiedOn: now - 520_000, modifiedBy: 'p-zach' },
  { ...base('m-rev-7', Class.message), message: "Good. Since you're a super admin, I'll check whether the grok-bot-iam key actually carries your admin rights or only member rights. If it doesn't, the fix is giving it access under z/hanzo, which only you can do. Results shortly.\n\nYou're right that it's a bug. The coding service is back up, but all three new runs failed within a second with the same \"wallet holds 0\" error:\n• The org's money is invisible to the lease ($156.6K prepaid on the org, but the lease checks user ID hanzo).\n• Sessions run under hanzo/hanzo/z with the org prefix doubled.\n• Make grok-bot-iam an admin acting as the hanzo org or put $20 on user ID hanzo while the fix lands.", attachedTo: 'dm-rev', modifiedOn: now - 300_000, modifiedBy: 'bot-rev' },

  { ...base('m-dev-1', Class.message), message: "Got it. I'll re-test PR 464 end to end through the Hanzo MCP now. The npm token is the other thing you're waiting on: it has to be a granular token with 2FA bypass, and only you can create one, so I'll send a secure field for it after the test.\n\nThe PR 464 re-test is running. It's a live Hanzo coding run on iam#32 that regenerates the stale zipdoc_gen.go, runs gofmt, then runs the tests and pushes to the same branch.", attachedTo: 'dm-dev', modifiedOn: now - 840_000, modifiedBy: 'bot-dev' },
  { ...base('m-dev-2', Class.message), message: 'Token received. It authenticates as zeekay with read-write access to the @hanzo packages. Sealing it in KMS now.', attachedTo: 'dm-dev', modifiedOn: now - 660_000, modifiedBy: 'bot-dev' },
  { ...base('m-dev-3', Class.message), message: 'Give hanzo/z write access to /orgs/hanzo (NPM_TOKEN, prod). is admin and owner of hanzo so why is this not working?', attachedTo: 'dm-dev', modifiedOn: now - 480_000, modifiedBy: 'p-zach' },
  { ...base('m-dev-4', Class.message), message: "Looking at how KMS decides who can write, to find why your owner role isn't counting.\n\nThis is working as designed. KMS deliberately doesn't let org owners or admins read or write secret values. The only ways in are an audited SuperAdmin token or a grant written into universe's kms-grants.yaml. hanzo/z already has a write grant at /orgs/hanzo there, but only for CARGO_REGISTRY_TOKEN. I'm opening the universe PR that adds NPM_TOKEN to that grant now.\n\nYou already merged the same grant to universe main in 15698d7, so my universe#41 is redundant. I'm retrying the KMS write now, as soon as CD picks up your commit.", attachedTo: 'dm-dev', modifiedOn: now - 240_000, modifiedBy: 'bot-dev' },

  { ...base('m-mark-1', Class.message), message: 'Checkout and signup funnel across hanzo.ai (last 7d): 169 started checkout, 174 completed signups, and top 20 landing and docs pages audited with 0 broken links.', attachedTo: 'dm-mark', modifiedOn: now - 540_000, modifiedBy: 'bot-mark' },

  ...HANZO_AGENTS.filter((a) => a.id !== 'rev' && a.id !== 'dev' && a.id !== 'mark').map((a, idx): Message => ({
    ...base(`m-dm-${a.id}`, Class.message),
    message: `${a.status} Watching ${a.triggers.join(', ')} events across ${a.department}.`,
    attachedTo: `dm-${a.id}`,
    modifiedOn: now - (idx + 1) * 120_000,
    modifiedBy: `bot-${a.id}`,
  })),
]

/** Seven notifications from seven different people, because one person's name
 *  on every row is a mapping bug that a fixture written by one author hides. */
const notice = (n: number, by: string, body: string, at: number, on: string, viewed: boolean): Notice => ({
  ...base(`n${n}`, Class.notice),
  modifiedBy: by,
  modifiedOn: at,
  body,
  attachedTo: on,
  attachedToClass: on.startsWith('c-') ? Class.message : Class.issue,
  isViewed: viewed,
})

const notices: Notice[] = [
  notice(1, 'p1', 'mentioned you in a page', now - 600_000, 'i2', false),
  notice(2, 'p2', 'joined the Next Platform project', now - 960_000, 'proj-next', false),
  notice(3, 'p3', '@everyone Hi there! Let’s discuss the new onboarding copy', now - 3_600_000, 'c-general', true),
  notice(4, 'p4', 'added a new tag to the Issues page', now - 10_800_000, 'i14', true),
  notice(5, 'p5', 'changed status CRM-15 to In progress', now - 14_400_000, 'i15', true),
  notice(6, 'p6', 'added a new task to the Issues page', now - 28_800_000, 'i8', true),
  notice(7, 'p7', 'mentioned you in a page', now - 32_400_000, 'i9', true),
]

const world = (): Map<string, Doc[]> =>
  new Map<string, Doc[]>([
    [Class.project, structuredClone(projects)],
    [Class.status, structuredClone(statuses)],
    [Class.issue, structuredClone(issues)],
    [Class.component, structuredClone(components)],
    [Class.tag, structuredClone(tags)],
    [Class.person, structuredClone(people)],
    [Class.channel, structuredClone(channels)],
    [DIRECT_CLASS, structuredClone(directs)],
    [Class.message, structuredClone(messages)],
    [Class.notice, structuredClone(notices)],
  ])

const nothing = (): Map<string, Doc[]> =>
  new Map(Object.values(Class).map((c) => [c, [] as Doc[]]))

/** `minimal` is the same world with one project and one column's worth of work. */
const trimmed = (): Map<string, Doc[]> => {
  const w = world()
  const kept = issues.filter((i) => i.space === 'proj-crm').slice(0, 3)
  w.set(Class.project, structuredClone(projects.slice(0, 1)))
  w.set(Class.issue, structuredClone(kept))
  w.set(Class.tag, structuredClone(tags.filter((t) => kept.some((i) => i._id === t.attachedTo))))
  w.set(Class.message, structuredClone(messages.slice(0, 1)))
  w.set(Class.notice, structuredClone(notices.slice(0, 2)))
  return w
}

// ── the stand ─────────────────────────────────────────────────────────────────

/**
 * A plane over a map. It applies a transaction and broadcasts it, because that
 * is what the server does — so the write path a drag takes is the same one
 * whether the space is real or not.
 */
class Stand implements Plane {
  standing: Standing = 'live'
  readonly account = 'hanzo:fixture'
  private docs: Map<string, Doc[]>
  private listeners = new Set<(txes: Wire[]) => void>()

  constructor(docs: Map<string, Doc[]>) {
    this.docs = docs
  }

  watch(f: (txes: Wire[]) => void) {
    this.listeners.add(f)
    return () => void this.listeners.delete(f)
  }

  observe(f: (s: Standing) => void) {
    f('live')
    return () => {}
  }

  open() {
    return Promise.resolve()
  }

  close() {}

  find<T>(cls: string, query: Record<string, unknown> = {}) {
    const rows = (this.docs.get(cls) ?? []) as unknown as T[]
    return Promise.resolve(rows.filter((r) => matches(r as Record<string, unknown>, query)))
  }

  async one<T>(cls: string, query: Record<string, unknown>) {
    return (await this.find<T>(cls, query))[0]
  }

  write(tx: Wire) {
    const cls = String(tx.objectClass ?? '')
    const rows = this.docs.get(cls) ?? []
    const id = String(tx.objectId ?? '')
    if (tx._class === Tx.create) {
      // The same fields the server's own txCreate copies onto the document.
      // Keeping only `attributes` drops `attachedTo`, and an attached document
      // that has forgotten what it is attached to is one no read can find —
      // so a message written here would be applied, broadcast, and invisible.
      const now = Date.now()
      rows.push({
        ...(tx.attributes as object),
        _id: id,
        _class: cls,
        space: String(tx.objectSpace ?? SPACE),
        attachedTo: tx.attachedTo,
        attachedToClass: tx.attachedToClass,
        collection: tx.collection,
        modifiedBy: tx.modifiedBy,
        createdBy: tx.createdBy ?? tx.modifiedBy,
        modifiedOn: now,
        createdOn: tx.createdOn ?? now,
      } as unknown as Doc)
    } else if (tx._class === Tx.update) {
      const row = rows.find((r) => r._id === id)
      if (row) Object.assign(row, tx.operations as object, { modifiedOn: Date.now() })
    } else if (tx._class === Tx.remove) {
      this.docs.set(cls, rows.filter((r) => r._id !== id))
    }
    this.docs.set(cls, rows)
    for (const f of this.listeners) f([tx])
    return Promise.resolve()
  }
}

/** The subset of the platform's query language a fixture needs. */
const matches = (row: Record<string, unknown>, query: Record<string, unknown>): boolean =>
  Object.entries(query).every(([field, want]) => {
    const has = row[field]
    if (want && typeof want === 'object' && '$in' in (want as object)) {
      return (((want as { $in: unknown[] }).$in) ?? []).includes(has)
    }
    return has === want
  })

const SPACES: SpaceRow[] = [
  { uuid: 'fixture', name: 'Hanzo AI', url: SPACE, org: 'hanzo', isDisabled: false },
  { uuid: 'foundation', name: 'The Foundation', url: 'foundation', org: 'foundation', isDisabled: false },
  { uuid: 'lux', name: 'Lux Network', url: 'lux', org: 'lux', isDisabled: false },
  { uuid: 'zoo', name: 'Zoo Labs', url: 'zoo', org: 'zoo', isDisabled: false },
]

// ── the one knob ──────────────────────────────────────────────────────────────

export const fixture = {
  /** Whether anything below is standing in for the real plane. */
  on: name !== 'live',

  /** The space list, or the real one. */
  spaces: (live: () => Promise<SpaceRow[]>): Promise<SpaceRow[]> => {
    switch (name) {
      case 'live':
        return live()
          .then((rows) => (rows.length > 0 ? rows : SPACES))
          .catch(() => SPACES)
      case 'loading':
        return never()
      case 'failure':
        return refuse()
      default:
        return Promise.resolve(SPACES)
    }
  },

  /** The plane for a space, or the real one. */
  plane: (slug: string): Plane => {
    switch (name) {
      case 'live':
        if (SPACES.some((s) => s.url === slug)) {
          return new Stand(world())
        }
        return new Socket(slug)
      case 'empty':
        return new Stand(nothing())
      case 'minimal':
        return new Stand(trimmed())
      case 'realistic':
        return new Stand(world())
      case 'loading':
        return new Held('opening')
      default:
        return new Held('lost')
    }
  },
}

/** A plane that never answers, for the loading and failure states. */
class Held implements Plane {
  readonly account = null
  constructor(readonly standing: Standing) {}
  watch() {
    return () => {}
  }
  observe(f: (s: Standing) => void) {
    f(this.standing)
    return () => {}
  }
  open() {
    return this.standing === 'opening' ? never<void>() : refuse<void>()
  }
  close() {}
  find<T>(): Promise<T[]> {
    return this.standing === 'opening' ? never<T[]>() : refuse<T[]>()
  }
  one<T>(): Promise<T | undefined> {
    return this.standing === 'opening' ? never<T | undefined>() : refuse<T | undefined>()
  }
  write() {
    return refuse<void>()
  }
}
