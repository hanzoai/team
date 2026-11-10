/**
 * The workspace plane & deterministic state harness (`?state=`).
 *
 * Every state a screen has is reachable deliberately, by name, through ONE
 * knob for automated visual/unit tests:
 *
 *   ?state=loading    nothing ever answers
 *   ?state=empty      a space with no projects and no messages
 *   ?state=failure    every read refuses
 *   ?state=minimal    one project, four columns, three issues
 *   ?state=realistic  four columns filled, a channel, an inbox
 *
 * In `live` mode (the default on both `localhost` and `hanzo.team`), `Stand`
 * hydrates from and syncs with `https://api.hanzo.ai/v1` (`/v1/task/board`,
 * `/v1/task/projects`, `/v1/team/channels`, `/v1/team/inbox`, `/v1/chat/completions`)
 * and persists transactions locally so card moves, edits, new issues, and chat
 * messages survive reloads and reflect across all views immediately.
 */
import {
  Category,
  Class,
  Priority,
  Tx,
  type Channel,
  type Component,
  type Doc,
  type Issue,
  type Message,
  type Notice,
  type Person,
  type Project,
  type Status,
  type Tag,
} from './model.ts'
import { Socket, type Plane, type Standing, type Wire } from './socket.ts'
import type { SpaceRow } from './account.ts'
import { HANZO_AGENTS } from './agents.ts'
import { call } from './http.ts'

const NAMES = ['live', 'loading', 'empty', 'failure', 'minimal', 'realistic'] as const
type Name = (typeof NAMES)[number]

const chosen = (): Name => {
  if (typeof window === 'undefined') return 'live'
  const asked = new URLSearchParams(window.location.search).get('state')
  if ((NAMES as readonly string[]).includes(asked ?? '')) return asked as Name
  return 'live'
}

const name = chosen()

/** Whether this session is standing on fixtures at all. A screen may say so. */
export const standing = name

const never = <T>(): Promise<T> => new Promise<T>(() => {})
const refuse = <T>(): Promise<T> => Promise.reject(new Error('the fixture refuses, on purpose'))

// ── the world ─────────────────────────────────────────────────────────────────

const SPACE = 'hanzo'
const now = Date.now()
const base = (id: string, cls: string): Doc => ({
  _id: id,
  _class: cls,
  space: SPACE,
  modifiedOn: now,
  modifiedBy: 'p-zach',
})

/** Real Hanzo AI leadership + 23 autonomous 24/7 agents. */
const founders: Person[] = [
  { ...base('p-zach', Class.person), name: 'Kelling,Zach', city: 'San Francisco' },
  { ...base('p-antje', Class.person), name: 'Worring,Antje', city: 'Los Angeles' },
]

const agentPeople: Person[] = HANZO_AGENTS.map((a) => ({
  ...base(`bot-${a.id}`, Class.person),
  name: `${a.name} (@${a.id})`,
  avatar: a.avatar,
  city: a.department,
}))

const people: Person[] = [...founders, ...agentPeople]

const project = (
  id: string,
  name: string,
  identifier: string,
  sequence: number,
  members: string[],
  description: string,
): Project => ({
  ...base(`proj-${id}`, Class.project),
  space: SPACE,
  name,
  identifier,
  description,
  sequence,
  members,
})

const projects: Project[] = [
  project(
    'crm',
    'CRM & Revenue',
    'CRM',
    42,
    ['p-zach', 'p-antje', 'bot-rev', 'bot-sal', 'bot-data', 'bot-su', 'bot-fin', 'bot-biz'],
    'Hanzo CRM (`crm.hanzo.ai`), PostgreSQL audiences (346K investors, 422K customers, 13.5M developer leads), and Commerce deal desk.',
  ),
  project(
    'mkt',
    'Growth & Design',
    'MKT',
    18,
    ['p-antje', 'p-zach', 'bot-mark', 'bot-des', 'bot-art', 'bot-mo', 'bot-doc', 'bot-ed'],
    'Landing conversion funnels, @hanzo/gui monochrome design system, Omni 1.2 Flash creative assets, and lifecycle journeys.',
  ),
  project(
    'next',
    'Cloud & Platform',
    'CLOUD',
    25,
    ['p-zach', 'bot-sci', 'bot-dev', 'bot-opera', 'bot-cyber', 'bot-data', 'bot-vi'],
    'Unified Hanzo Cloud (`api.hanzo.ai/v1`), ZAP transactor ledger, Kubernetes Sites plane, and multi-org IAM.',
  ),
  project(
    'dev',
    'Hanzo Dev & AI',
    'DEV',
    31,
    ['p-zach', 'bot-dev', 'bot-opera', 'bot-cyber', 'bot-mana', 'bot-sci', 'bot-vi'],
    'Autonomous coding sandboxes, 13 unified MCP tools, KMS hardware enclaves, and ephemeral Kata CI runners.',
  ),
]

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

/** Real Hanzo repositories / components attached to tracker cards. */
const components: Component[] = [
  {
    ...base('cmp-freelynk', Class.component),
    space: 'proj-crm',
    label: 'hanzo/crm',
    description: 'Native CRM surface & PostgreSQL (`hanzo-sql`) audience queries',
    lead: 'bot-rev',
  },
  {
    ...base('cmp-acme', Class.component),
    space: 'proj-crm',
    label: 'hanzo/commerce',
    description: 'Enterprise deal desk, org credit grants & multi-seat billing',
    lead: 'bot-sal',
  },
  {
    ...base('cmp-atlas', Class.component),
    space: 'proj-next',
    label: 'hanzo/cloud',
    description: 'Unified `/v1` API gateway, ZAP transactor & Sites deployment plane',
    lead: 'bot-sci',
  },
  {
    ...base('cmp-ui', Class.component),
    space: 'proj-mkt',
    label: 'hanzo/ui',
    description: '@hanzo/gui & @hanzo/ui monochrome component primitives',
    lead: 'bot-des',
  },
  {
    ...base('cmp-runner', Class.component),
    space: 'proj-dev',
    label: 'hanzo/dev',
    description: 'Autonomous coding agent harness, MCP tools & Kata CI fleet',
    lead: 'bot-dev',
  },
]

type Row = {
  in: string
  at: (typeof COLUMNS)[number][0]
  title: string
  description: string
  rank: number
  done?: number
  tags?: string[]
  part?: string
  who: string[]
  files?: number
  replies?: number
}

const WORK: Row[] = [
  {
    in: 'crm',
    at: 'backlog',
    title: 'Sync ClickHouse telemetry alerts for `/v1/crm` query latency',
    description: 'Wire sub-second p99 latency monitors across `/v1/crm/investors`, `/v1/crm/funds`, and `/v1/crm/leads` in `hanzo-sql`.',
    rank: Priority.low,
    done: 12,
    tags: ['Devops'],
    part: 'cmp-freelynk',
    who: ['bot-opera', 'bot-data'],
    files: 1,
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Cluster & index 13.5M GitHub developer leads by language and star velocity',
    description: 'Build semantic & star-bucket cohorts (`1k-5k`, `5k-15k`, `15k+`) in `hanzo-sql` for targeted developer outreach.',
    rank: Priority.low,
    done: 0,
    tags: ['Devops', 'Research'],
    part: 'cmp-freelynk',
    who: ['bot-data', 'bot-sci', 'bot-rev'],
    files: 3,
    replies: 10,
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Benchmark institutional VC & Family Office reply rates across 28 lists',
    description: 'Compare open and reply conversion across `vc`, `crypto_vc`, `accredited`, and `family_office` segments.',
    rank: Priority.medium,
    done: 5,
    tags: ['Marketing'],
    part: 'cmp-freelynk',
    who: ['bot-mark', 'bot-sal'],
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Split Commerce billing export by human seat vs. 24/7 autonomous bot lease',
    description: 'Ensure `/v1/billing` invoices separate human workspace seats from per-second autonomous bot compute leases.',
    rank: Priority.medium,
    done: 0,
    tags: ['Backend'],
    part: 'cmp-acme',
    who: ['bot-fin', 'bot-rev'],
    replies: 3,
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Define retention policy for dormant trial workspaces on `/v1/team`',
    description: 'Archive inactive trial SQLite stores to `hanzoai/s3` cold storage after 90 days of zero transactor activity.',
    rank: Priority.low,
    tags: ['Research'],
    who: ['bot-law', 'bot-opera'],
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Streamline CSV column matcher in Hanzo CRM import modal',
    description: 'Auto-detect First Name, Email, Company, and Check Size headers when importing external LP/investor sheets.',
    rank: Priority.low,
    done: 0,
    tags: ['Design'],
    part: 'cmp-freelynk',
    who: ['bot-des', 'p-antje'],
    files: 2,
  },
  {
    in: 'crm',
    at: 'backlog',
    title: 'Measure first-response SLA on inbound enterprise deal rooms',
    description: 'Track time from inbound `/v1/crm` lead capture to `@sal` + `@rev` automated data room provisioning.',
    rank: Priority.medium,
    done: 8,
    tags: ['Devops', 'QA'],
    part: 'cmp-freelynk',
    who: ['bot-su', 'bot-rev'],
  },

  {
    in: 'crm',
    at: 'todo',
    title: 'Reconcile org prepaid credit grants (`z/hanzo`) with bot lease billing',
    description: 'Ensure autonomous agent leases charge the organization credit grant on `z/hanzo` ($156.6K balance) rather than individual user wallets.',
    rank: Priority.high,
    done: 20,
    tags: ['Sales', 'Backend'],
    part: 'cmp-acme',
    who: ['bot-rev', 'p-zach', 'bot-fin'],
    files: 1,
    replies: 7,
  },
  {
    in: 'crm',
    at: 'todo',
    title: 'Unify Slack-style top search bar and bottom-left account switcher across Team',
    description: 'Keep Back/Forward/History + centered `⌘K` search in the 40px top bar and place the active user avatar menu at the bottom of the left rail.',
    rank: Priority.medium,
    done: 25,
    tags: ['Design', 'Frontend'],
    part: 'cmp-ui',
    who: ['bot-des', 'p-zach'],
    replies: 4,
  },
  {
    in: 'crm',
    at: 'todo',
    title: 'Connect WebRTC spatial audio & live AI transcript in Virtual Office (`/meet`)',
    description: 'Bridge `@mana` real-time meeting notes directly into Tracker action items with 1-click issue creation.',
    rank: Priority.medium,
    done: 0,
    tags: ['Feature'],
    who: ['bot-mana', 'bot-mu'],
  },
  {
    in: 'crm',
    at: 'todo',
    title: 'Deduplicate 346K investor contacts by normalized email domain on import',
    description: 'Merge duplicate partner records across `investors` and `funds` tables in `hanzo-sql` while preserving check-size metadata.',
    rank: Priority.high,
    done: 40,
    tags: ['Backend', 'QA'],
    part: 'cmp-freelynk',
    who: ['bot-data', 'bot-dev'],
    files: 1,
    replies: 6,
  },
  {
    in: 'crm',
    at: 'todo',
    title: 'Persist custom cohort filters in `/crm/investors` and `/crm/leads`',
    description: 'Save active star-bucket (`★ 1000-5000`, `★ 15000+`) and investor category filters in URL query state.',
    rank: Priority.medium,
    done: 15,
    tags: ['Frontend'],
    part: 'cmp-freelynk',
    who: ['bot-dev', 'bot-des'],
  },
  {
    in: 'crm',
    at: 'todo',
    title: 'Retire legacy webhook payload in favor of typed `/v1/team` events',
    description: 'Standardize all outbound workspace webhooks on HIP-0139 OpenAPI schemas.',
    rank: Priority.low,
    tags: ['Backend'],
    who: ['bot-dev'],
    replies: 1,
  },

  {
    in: 'crm',
    at: 'doing',
    title: 'Interactive Issue Detail Drawer for editing cards across Kanban, List & Timeline',
    description: 'Allow clicking any issue card or row to edit title, description, status, priority, completion %, tags, assignee, and comments.',
    rank: Priority.urgent,
    done: 75,
    tags: ['Feature', 'Frontend'],
    part: 'cmp-freelynk',
    who: ['p-zach', 'bot-dev', 'bot-des'],
  },
  {
    in: 'crm',
    at: 'doing',
    title: 'Enterprise customer discovery & Data Room onboarding with top 20 funds',
    description: 'Coordinate `@sal`, `@rev`, and `@law` to provision watermarked Data Rooms and automated NDA/MSA e-signature flows.',
    rank: Priority.medium,
    done: 90,
    tags: ['Sales', 'QA'],
    part: 'cmp-acme',
    who: ['p-antje', 'bot-sal', 'bot-rev', 'bot-law'],
    files: 2,
    replies: 24,
  },
  {
    in: 'crm',
    at: 'doing',
    title: 'Wire live `api.hanzo.ai/v1/crm/*` PostgreSQL records into all CRM views',
    description: 'Eliminate all static sample companies/contacts and stream real `hanzo-sql` customers, funds, investors, and leads.',
    rank: Priority.high,
    done: 65,
    tags: ['Feature', 'Frontend'],
    part: 'cmp-freelynk',
    who: ['bot-rev', 'bot-data'],
  },

  {
    in: 'crm',
    at: 'done',
    title: 'Ship organization seat-count & credit grant reconciliation in `/v1/billing`',
    description: 'Verified accurate seat metering and prepaid credit deduction across Hanzo AI, The Foundation, Lux Network, and Zoo Labs.',
    rank: Priority.high,
    done: 100,
    tags: ['Backend'],
    part: 'cmp-acme',
    who: ['bot-rev', 'bot-fin'],
    replies: 6,
  },
  {
    in: 'crm',
    at: 'done',
    title: 'Deduplicate `@hanzogui/*` to single version 8.3.5 and enforce monochrome token sheet',
    description: 'Pinned all 113 `@hanzogui/*` packages in `pnpm-workspace.yaml` and verified `theme.test.ts` with zero literal colors outside `tokens.css`.',
    rank: Priority.low,
    done: 100,
    tags: ['Design'],
    part: 'cmp-ui',
    who: ['bot-des', 'bot-dev'],
  },
  {
    in: 'crm',
    at: 'done',
    title: 'Cut production release of Hanzo Team on `hanzo.team` + native Linux desktop app',
    description: 'Published SPA with 118 zero-404 route fallbacks to `hanzo.team` and built native Tauri v2 desktop binary.',
    rank: Priority.urgent,
    done: 100,
    tags: ['Feature'],
    part: 'cmp-acme',
    who: ['p-zach', 'bot-opera', 'bot-dev'],
    files: 2,
    replies: 11,
  },

  {
    in: 'mkt',
    at: 'backlog',
    title: 'Schedule Q4 multi-channel product broadcast across X, Discord & Hanzo Publish',
    description: 'Coordinate launch threads for Hanzo Team, Hanzo Bot 24/7 fleet, and Zen4 Coder benchmarks.',
    rank: Priority.medium,
    done: 0,
    tags: ['Marketing'],
    part: 'cmp-ui',
    who: ['bot-mark', 'p-antje'],
  },
  {
    in: 'mkt',
    at: 'todo',
    title: 'Render 4K Omni 1.2 Flash hero showcase for `hanzo.team` landing stage',
    description: 'Capture live desktop + mobile workspace frames with zero compression artifacts.',
    rank: Priority.high,
    done: 30,
    tags: ['Design', 'Marketing'],
    part: 'cmp-ui',
    who: ['bot-art', 'bot-des'],
    replies: 5,
  },
  {
    in: 'mkt',
    at: 'doing',
    title: 'Instrument self-serve checkout & workspace signup funnel in Hanzo Analytics',
    description: 'Track conversion from `hanzo.team/login` through first channel message and first bot run.',
    rank: Priority.medium,
    done: 60,
    tags: ['Devops'],
    who: ['bot-mark', 'bot-data'],
  },

  {
    in: 'next',
    at: 'backlog',
    title: 'Benchmark SQLCipher 4 envelope vs. cgo `libsqlcipher` on multi-tenant stores',
    description: 'Verify zero-plaintext invariant and WAL checkpoint behavior across `hanzoai/sqlite` builds.',
    rank: Priority.urgent,
    done: 0,
    tags: ['Research', 'Backend'],
    part: 'cmp-atlas',
    who: ['bot-sci', 'bot-cyber', 'p-zach'],
    replies: 8,
  },
  {
    in: 'next',
    at: 'todo',
    title: 'Expose `/v1/graph` entity & relationship endpoints alongside `/v1/semantic`',
    description: 'Support personal & organizational knowledge graph triples (`subject`, `predicate`, `object`, `confidence`) in Hanzo Cloud.',
    rank: Priority.high,
    done: 20,
    tags: ['Feature', 'Backend'],
    part: 'cmp-atlas',
    who: ['p-zach', 'bot-sci', 'bot-dev'],
  },
  {
    in: 'next',
    at: 'doing',
    title: 'Verify zero-downtime `/v1/team` transactor cutover inside unified Cloud binary',
    description: 'Run HIP-0106 in-process mount in parallel with standalone `team-go` and validate live WebSocket broadcasts.',
    rank: Priority.high,
    done: 45,
    tags: ['Devops', 'QA'],
    part: 'cmp-atlas',
    who: ['bot-opera', 'bot-dev'],
    files: 4,
  },

  {
    in: 'dev',
    at: 'todo',
    title: 'Quarantine flaky E2E specs and enforce deterministic 4-shard merge gate',
    description: 'Ensure all 46 unit, parity, and theme tests complete in under 3 seconds on every PR.',
    rank: Priority.high,
    done: 20,
    tags: ['QA'],
    part: 'cmp-runner',
    who: ['bot-dev', 'bot-opera'],
    replies: 9,
  },
  {
    in: 'dev',
    at: 'doing',
    title: 'Scale ephemeral `kata-fc` CI runner jobs across `linux-amd64` and `linux-arm64`',
    description: 'Reconcile queued GitHub & Forge workflow jobs via `/v1/build` multi-arch BuildKit fan-out.',
    rank: Priority.urgent,
    done: 70,
    tags: ['Devops'],
    part: 'cmp-runner',
    who: ['p-zach', 'bot-opera', 'bot-cyber'],
    files: 1,
    replies: 12,
  },
  {
    in: 'dev',
    at: 'done',
    title: 'Seal `NPM_TOKEN` and `CARGO_REGISTRY_TOKEN` grants in `universe/kms-grants.yaml`',
    description: 'Audited RBAC policy and verified automated package publishing from `hanzoai/ci`.',
    rank: Priority.medium,
    done: 100,
    tags: ['Backend'],
    part: 'cmp-runner',
    who: ['bot-cyber', 'bot-dev'],
  },
]

const rank = (n: number) => String(n + 1000)

const issues: Issue[] = WORK.map((row, i) => ({
  ...base(`i${i + 1}`, Class.issue),
  space: `proj-${row.in}`,
  title: row.title,
  description: row.description,
  status: `proj-${row.in}-${row.at}`,
  priority: row.rank,
  number: i + 1,
  rank: rank(i),
  assignee: row.who[0] ?? 'p-zach',
  collaborators: row.who,
  component: row.part ?? null,
  ...(row.done === undefined ? {} : { estimation: 100, reportedTime: row.done }),
  attachments: row.files ?? 0,
  comments: row.replies ?? 0,
  labels: row.tags?.length ?? 0,
}))

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
  { ...base('c-general', Class.channel), name: 'general', topic: 'Company-wide engineering, launches & announcements' },
  { ...base('c-errors', Class.channel), name: 'errors', topic: 'Live runtime exceptions, Sentry faults & CLI crash reports (/v1/event/errors)' },
  { ...base('c-feedback', Class.channel), name: 'feedback', topic: 'User feedback, hanzo doctor --share bundles, support tickets & inbound forms' },
  { ...base('c-hanzo-support', Class.channel), name: 'hanzo-support', topic: 'Customer support, triage & live escalations' },
  { ...base('c-hanzo-ui', Class.channel), name: 'hanzo-ui', topic: 'Design system, @hanzo/gui & @hanzo/ui components' },
  { ...base('c-hanzo-video', Class.channel), name: 'hanzo-video', topic: 'Studio, Omni Flash & video generation' },
  { ...base('c-hanzo-revenue', Class.channel), name: 'hanzo-revenue', topic: 'Live checkouts, orders, subscriptions, enterprise deals & pipeline (/v1/event)' },
  { ...base('c-tracker', Class.channel), name: 'tracker', topic: 'Sprint boards, PR gates & issue triage' },
  { ...base('c-design', Class.channel), name: 'design', topic: 'Product design, typography & monochrome tokens' },
  { ...base('c-hanzo-x-lux', Class.channel), name: 'hanzo-x-lux', topic: 'Hanzo Connect shared channel · Cross-org engineering & MPC settlement', bindings: ['connect:lux'] },
  { ...base('c-hanzo-x-zoo', Class.channel), name: 'hanzo-x-zoo', topic: 'Hanzo Connect shared channel · Decentralized AI & DeSci research', bindings: ['connect:zoo'] },
  { ...base('c-lux-bank', Class.channel), name: 'lux-bank', topic: 'Lux banking, cards & settlement', bindings: ['connect:lux'] },
  { ...base('c-lux-bridge', Class.channel), name: 'lux-bridge', topic: 'Cross-chain bridge & MPC', bindings: ['connect:lux'] },
]

const DIRECT_CLASS = Class.direct

const directs: Channel[] = HANZO_AGENTS.map((a) => ({
  ...base(`dm-${a.id}`, DIRECT_CLASS),
  name: a.name,
  topic: `${a.role} · ${a.department} · ${a.status}`,
  members: [`bot-${a.id}`, 'p-zach'],
}))

const messages: Message[] = [
  { ...base('m1', Class.message), message: 'Pinned all @hanzogui/* packages to 8.3.5 and moved the user account menu to the bottom-left rail.', attachedTo: 'c-general', modifiedOn: now - 3_600_000, modifiedBy: 'bot-des' },
  { ...base('m2', Class.message), message: 'Verified `/v1/team/health`, `/v1/crm/*`, and `/v1/task/*` on `api.hanzo.ai` — all endpoints healthy.', attachedTo: 'c-general', modifiedOn: now - 1_800_000, modifiedBy: 'bot-opera' },
  { ...base('m3', Class.message), message: '@everyone Hanzo Team is live on `hanzo.team` and running natively in the desktop app.', attachedTo: 'c-general', modifiedOn: now - 600_000, modifiedBy: 'p-zach' },
  { ...base('m4', Class.message), message: 'All 23 Hanzo AI agents and 24/7 bots are connected across Hanzo AI, The Foundation, Lux Network, and Zoo Labs.', attachedTo: 'c-general', modifiedOn: now - 300_000, modifiedBy: 'bot-vi' },
  { ...base('m5', Class.message), message: 'Zero open P0/P1 escalations. Automated triage resolved 18 tickets in the last hour.', attachedTo: 'c-hanzo-support', modifiedOn: now - 900_000, modifiedBy: 'bot-su' },
  { ...base('m-err-seed-1', Class.message), message: 'Streaming live runtime faults, Sentry exceptions, and CLI premature_stop diagnostics from `api.hanzo.ai/v1/event/errors` into this channel.', attachedTo: 'c-errors', modifiedOn: now - 420_000, modifiedBy: 'bot-cyber' },
  { ...base('m-fb-seed-1', Class.message), message: 'Streaming inbound user feedback, `hanzo doctor --share` / `dev report` bundles, support tickets, and website form submissions from `api.hanzo.ai/v1/base/collections/activities` and `/v1/event` into this channel.', attachedTo: 'c-feedback', modifiedOn: now - 380_000, modifiedBy: 'bot-su' },
  { ...base('m6', Class.message), message: 'Updated @hanzo/gui monochrome tokens and Slack-style top search bar across all workspace surfaces.', attachedTo: 'c-hanzo-ui', modifiedOn: now - 1_200_000, modifiedBy: 'bot-des' },
  { ...base('m7', Class.message), message: 'Rendered 4K hero stills and agent portraits via Omni 1.2 Flash in Studio.', attachedTo: 'c-hanzo-video', modifiedOn: now - 1_500_000, modifiedBy: 'bot-art' },
  { ...base('m8', Class.message), message: 'Synced org grants, prepaid balances, and enterprise seats with Commerce.', attachedTo: 'c-hanzo-revenue', modifiedOn: now - 450_000, modifiedBy: 'bot-rev' },
  { ...base('m-rev-seed-stream', Class.message), message: 'Streaming live checkouts (`order_completed`, `checkout_started`, `payment_info_added`, `checkout_failed`, `subscription_changed`, `invoice_requested`) and enterprise/sales leads in real time from `api.hanzo.ai/v1/event` into this channel and `/overview`.', attachedTo: 'c-hanzo-revenue', modifiedOn: now - 340_000, modifiedBy: 'bot-rev' },
  { ...base('m-connect-lux-1', Class.message), message: 'Connected `hanzo` ↔ `lux` via Hanzo Connect (`connect:lux`). Both organizations retain isolated IAM, KMS secrets, and billing while sharing this channel.', attachedTo: 'c-hanzo-x-lux', modifiedOn: now - 1_200_000, modifiedBy: 'bot-vi' },
  { ...base('m-connect-lux-2', Class.message), message: 'Lux MPC threshold signers and GPU settlement hooks are live on `api.hanzo.ai/v1/commerce`. Ready for joint end-to-end testing.', attachedTo: 'c-hanzo-x-lux', modifiedOn: now - 600_000, modifiedBy: 'p-zach' },
  { ...base('m-connect-lux-3', Class.message), message: 'Verified cross-org webhook signatures and KMS boundary checks between `hanzo` and `lux` — zero cross-tenant secret access.', attachedTo: 'c-hanzo-x-lux', modifiedOn: now - 240_000, modifiedBy: 'bot-cyber' },
  { ...base('m-connect-zoo-1', Class.message), message: 'Connected `hanzo` ↔ `zoo` via Hanzo Connect (`connect:zoo`). Decentralized AI & DeSci benchmark runs are streaming into this shared channel.', attachedTo: 'c-hanzo-x-zoo', modifiedOn: now - 900_000, modifiedBy: 'bot-scien' },
  { ...base('m-connect-zoo-2', Class.message), message: 'Published Zen-4 and Kai decision harness evaluation results for Zoo Labs foundation fellows.', attachedTo: 'c-hanzo-x-zoo', modifiedOn: now - 360_000, modifiedBy: 'bot-dev' },
  { ...base('m-connect-bank-1', Class.message), message: 'Card settlement rails and USD/LUX treasury sweeps reconciled across Hanzo Commerce and Lux Bank.', attachedTo: 'c-lux-bank', modifiedOn: now - 720_000, modifiedBy: 'bot-rev' },
  { ...base('m-connect-bridge-1', Class.message), message: 'Teleport bridge proof verification passing on C-Chain and Hanzo enclave signers.', attachedTo: 'c-lux-bridge', modifiedOn: now - 500_000, modifiedBy: 'bot-opera' },
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
  notice(1, 'bot-rev', 'reconciled $156.6K org grant on z/hanzo in CRM-8', now - 600_000, 'i8', false),
  notice(2, 'bot-dev', 'opened interactive Issue Drawer & live API sync on Cloud & Platform', now - 960_000, 'proj-next', false),
  notice(3, 'p-antje', '@everyone Enterprise Data Room & CRM PostgreSQL cohorts are live', now - 3_600_000, 'c-general', true),
  notice(4, 'bot-des', 'pinned @hanzogui/* to 8.3.5 and updated monochrome tokens', now - 10_800_000, 'i18', true),
  notice(5, 'bot-mana', 'moved CRM-16 (Live PostgreSQL CRM sync) to In progress', now - 14_400_000, 'i16', true),
  notice(6, 'bot-cyber', 'verified KMS secret grants in universe/kms-grants.yaml', now - 28_800_000, 'i28', true),
  notice(7, 'bot-opera', 'deployed Hanzo Team v82 to hanzo.team Sites plane', now - 32_400_000, 'i19', true),
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

// ── Live API + localStorage persistence plane ────────────────────────────────

const STORAGE_KEY = 'hanzo.team.plane.v7'
const ORGS_STORAGE_KEY = 'hanzo.team.orgs.v1'
const API_ORIGIN = import.meta.env.DEV ? '' : 'https://api.hanzo.ai'

const STATUS_FROM_API: Record<string, (typeof COLUMNS)[number][0]> = {
  backlog: 'backlog',
  todo: 'todo',
  in_progress: 'doing',
  done: 'done',
  canceled: 'done',
}

const PRIORITY_FROM_API: Record<string, number> = {
  none: Priority.none,
  urgent: Priority.urgent,
  high: Priority.high,
  medium: Priority.medium,
  low: Priority.low,
}

class Stand implements Plane {
  standing: Standing = 'live'
  readonly account = 'p-zach'
  private docs: Map<string, Doc[]>
  private listeners = new Set<(txes: Wire[]) => void>()
  private persistEnabled: boolean

  constructor(docs: Map<string, Doc[]>, persistEnabled = false) {
    this.docs = docs
    this.persistEnabled = persistEnabled && typeof window !== 'undefined'
    if (this.persistEnabled) {
      this.hydrateLocal()
      void this.syncFromLiveApi()
      window.setInterval(() => {
        void this.syncFromLiveApi()
      }, 30_000)
    }
  }

  private hydrateLocal() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Array<[string, Doc[]]>
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const [k, v] of parsed) {
          if (Array.isArray(v)) this.docs.set(k, v)
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private saveLocal() {
    if (!this.persistEnabled) return
    try {
      const entries = Array.from(this.docs.entries())
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // ignore storage errors
    }
  }

  private broadcast(txes: Wire[]) {
    for (const f of this.listeners) f(txes)
  }

  /**
   * Pulls live boards, issues, channels, and inbox items from `https://api.hanzo.ai/v1`
   * when authenticated or reachable, merging them into the active plane.
   */
  private async syncFromLiveApi() {
    try {
      const boardIssues = await call<
        Array<{
          id: string
          identifier: string
          projectKey: string
          number: number
          title: string
          description?: string
          status: string
          priority: string
          labels?: string[]
        }>
      >(`${API_ORIGIN}/v1/task/board`).catch(() => null)

      if (Array.isArray(boardIssues) && boardIssues.length > 0) {
        const currentIssues = (this.docs.get(Class.issue) ?? []) as Issue[]
        const byId = new Map(currentIssues.map((i) => [i._id, i]))
        let changed = false
        for (const remote of boardIssues) {
          const id = `api-${remote.id}`
          if (!byId.has(id)) {
            const col = STATUS_FROM_API[remote.status] ?? 'backlog'
            const space = 'proj-dev'
            byId.set(id, {
              ...base(id, Class.issue),
              space,
              title: remote.title,
              description: remote.description ?? '',
              status: `${space}-${col}`,
              priority: PRIORITY_FROM_API[remote.priority] ?? Priority.medium,
              number: remote.number || byId.size + 1,
              rank: rank(byId.size + 1),
              assignee: 'bot-dev',
              collaborators: ['bot-dev', 'p-zach'],
              component: 'cmp-runner',
              estimation: 100,
              reportedTime: col === 'done' ? 100 : col === 'doing' ? 50 : 10,
              attachments: 0,
              comments: 0,
              labels: remote.labels?.length ?? 0,
            })
            changed = true
          }
        }
        if (changed) {
          this.docs.set(Class.issue, Array.from(byId.values()))
          this.saveLocal()
          this.broadcast([])
        }
      }

      // Sync live runtime errors & CLI diagnostic bug reports from `/v1/event/errors`
      // and inbound user feedback / support tickets from `/v1/base/collections/activities/records`
      await this.syncLiveSignals()
    } catch {
      // fallback plane remains active
    }
  }

  private async syncLiveSignals() {
    try {
      const [errRes, actRes, evtRes] = await Promise.all([
        call<{ items?: Array<Record<string, unknown>>; errors?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
          `${API_ORIGIN}/v1/event/errors?limit=25`,
        ).catch(() => null),
        call<{ items?: Array<Record<string, unknown>> }>(
          `${API_ORIGIN}/v1/base/collections/activities/records?perPage=30&sort=-at,-created`,
        ).catch(() => null),
        call<{ items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
          `${API_ORIGIN}/v1/event/insights/events?limit=40`,
        ).catch(() => null),
      ])

      const currentMsgs = (this.docs.get(Class.message) ?? []) as Message[]
      const msgById = new Map(currentMsgs.map((m) => [m._id, m]))
      const currentNotices = (this.docs.get(Class.notice) ?? []) as Notice[]
      const noticeById = new Map(currentNotices.map((n) => [n._id, n]))
      let changed = false

      const errList = Array.isArray(errRes)
        ? errRes
        : Array.isArray(errRes?.items)
          ? errRes.items
          : Array.isArray(errRes?.errors)
            ? errRes.errors
            : []

      for (const err of errList) {
        const rawId = String(err.id ?? err.event_id ?? err.issue ?? '').trim()
        if (!rawId) continue
        const msgId = `m-live-err-${rawId}`
        if (msgById.has(msgId)) continue

        const kind = String(err.type ?? err.class ?? err.name ?? 'Error')
        const value = String(err.value ?? err.message ?? err.title ?? '(no message)')
        const app = String(err.app ?? err.service ?? err.product ?? 'hanzo')
        const env = String(err.environment ?? err.env ?? 'production')
        const culprit = String(err.culprit ?? err.origin ?? err.path ?? '')
        const tsRaw = err.timestamp ?? err.time ?? err.created_at
        const atMs = typeof tsRaw === 'number'
          ? (tsRaw > 1e12 ? tsRaw : tsRaw * 1000)
          : typeof tsRaw === 'string' && Date.parse(tsRaw)
            ? Date.parse(tsRaw)
            : Date.now()

        const tags = (err.tags ?? err.attributes ?? {}) as Record<string, unknown>
        const reportId = String(tags.report_id ?? '')
        const isCliReport =
          kind === 'premature_stop' ||
          kind === 'user_report' ||
          err.name === 'feedback' ||
          Boolean(reportId)

        const summary = [
          isCliReport
            ? `[CLI Bug Report] ${kind}: ${value}`
            : `[ERROR] ${kind}: ${value}`,
          `app=${app} · env=${env}${culprit ? ` · at ${culprit}` : ''}${reportId ? ` · report_id=${reportId}` : ''}`,
        ].join('\n')

        msgById.set(msgId, {
          ...base(msgId, Class.message),
          message: summary,
          attachedTo: 'c-errors',
          modifiedOn: atMs,
          modifiedBy: 'bot-cyber',
        })
        if (isCliReport) {
          const fbMsgId = `m-live-fb-${rawId}`
          msgById.set(fbMsgId, {
            ...base(fbMsgId, Class.message),
            message: summary,
            attachedTo: 'c-feedback',
            modifiedOn: atMs,
            modifiedBy: 'bot-su',
          })
        }
        const nId = `n-live-err-${rawId}`
        if (!noticeById.has(nId)) {
          noticeById.set(nId, {
            ...base(nId, Class.notice),
            modifiedBy: isCliReport ? 'bot-su' : 'bot-cyber',
            modifiedOn: atMs,
            body: `${isCliReport ? 'reported CLI bug' : 'captured runtime fault'} in ${app}: ${kind}: ${value.slice(0, 90)}`,
            attachedTo: isCliReport ? 'c-feedback' : 'c-errors',
            attachedToClass: Class.message,
            isViewed: false,
          })
        }
        changed = true
      }

      const actList = Array.isArray(actRes?.items) ? actRes.items : []
      for (const act of actList) {
        const rawId = String(act.id ?? '').trim()
        if (!rawId) continue
        const data = (act.data ?? {}) as Record<string, unknown>
        const actKind = String(act.kind ?? data.kind ?? '')
        const program = String(data.program ?? '').toLowerCase()
        if (actKind !== 'form' && !program) continue

        const msgId = `m-live-act-${rawId}`
        if (msgById.has(msgId)) continue

        const subject = String(act.subject ?? data.need ?? data.description ?? 'Inbound submission')
        const source = String(data.source ?? act.channel ?? 'web')
        const publicRef = String(data.public_ref ?? '')
        const tsRaw = act.at ?? act.created ?? act.updated
        const atMs = typeof tsRaw === 'string' && Date.parse(tsRaw) ? Date.parse(tsRaw) : Date.now()

        const label =
          program === 'feedback' || source.includes('hanzo-dev')
            ? 'Feedback & Bug Report'
            : program === 'support'
              ? 'Support Ticket'
              : program === 'chat'
                ? 'Sales / Support Chat'
                : program
                  ? `Inbound Form (${program})`
                  : 'Inbound Form'

        const text = [
          `[${label}] ${subject}`,
          `source=${source}${program ? ` · program=${program}` : ''}${publicRef ? ` · ref=${publicRef}` : ''}`,
        ].join('\n')

        msgById.set(msgId, {
          ...base(msgId, Class.message),
          message: text,
          attachedTo: 'c-feedback',
          modifiedOn: atMs,
          modifiedBy: 'bot-su',
        })

        if (program === 'support' || program === 'chat') {
          const supMsgId = `m-live-sup-${rawId}`
          msgById.set(supMsgId, {
            ...base(supMsgId, Class.message),
            message: text,
            attachedTo: 'c-hanzo-support',
            modifiedOn: atMs,
            modifiedBy: 'bot-su',
          })
        }

        if (program === 'sales' || program === 'enterprise' || program === 'investor' || program === 'partner') {
          const revMsgId = `m-live-rev-act-${rawId}`
          msgById.set(revMsgId, {
            ...base(revMsgId, Class.message),
            message: text,
            attachedTo: 'c-hanzo-revenue',
            modifiedOn: atMs,
            modifiedBy: 'bot-sal',
          })
        }

        const nId = `n-live-act-${rawId}`
        if (!noticeById.has(nId)) {
          noticeById.set(nId, {
            ...base(nId, Class.notice),
            modifiedBy: 'bot-su',
            modifiedOn: atMs,
            body: `received ${label.toLowerCase()}: ${subject.slice(0, 90)}`,
            attachedTo: program === 'support' ? 'c-hanzo-support' : 'c-feedback',
            attachedToClass: Class.message,
            isViewed: false,
          })
        }
        changed = true
      }

      const evtList = Array.isArray(evtRes)
        ? evtRes
        : Array.isArray(evtRes?.items)
          ? evtRes.items
          : []

      for (const evt of evtList) {
        const name = String(evt.name ?? '').toLowerCase()
        const product = String(evt.product ?? evt.app ?? 'hanzo').toLowerCase()
        const isCheckout =
          name === 'order_completed' ||
          name === 'checkout_started' ||
          name === 'payment_info_added' ||
          name === 'checkout_failed' ||
          name === 'subscription_changed' ||
          name === 'subscription_canceled' ||
          name === 'order_refunded' ||
          name === 'invoice_requested' ||
          name === 'plan_selected' ||
          name === 'upgrade_clicked'
        const isLeadOrForm =
          name === 'generate_lead' ||
          name === 'sales_contacted' ||
          name === 'waitlist_joined' ||
          name === 'newsletter_subscribed' ||
          name === 'beta_submitted' ||
          name === 'research_access_applied' ||
          name === 'signup_submitted' ||
          name === 'signup_completed' ||
          name === 'form_submitted' ||
          name === 'response_completed' ||
          name === 'response_submitted' ||
          product === 'form'

        if (!isCheckout && !isLeadOrForm) continue

        const attrs = (evt.attributes ?? evt.properties ?? {}) as Record<string, unknown>
        const tsRaw = evt.at ?? evt.timestamp ?? evt.time
        const atMs = typeof tsRaw === 'string' && Date.parse(tsRaw) ? Date.parse(tsRaw) : Date.now()
        const rawId = String(evt.id ?? attrs.order_id ?? attrs.response_id ?? `${name}-${atMs}`)
        const msgId = `m-live-evt-${rawId}`
        if (msgById.has(msgId)) continue

        const who = String(attrs.email ?? attrs.payer ?? attrs.name ?? evt.user ?? 'Anonymous')
        const company = String(attrs.company ?? '')
        const plan = String(attrs.plan ?? attrs.item_id ?? '')
        const orderId = String(attrs.order_id ?? '')
        const revRaw = evt.value ?? attrs.revenue ?? attrs.amount
        const cur = String(attrs.currency ?? 'USD').toUpperCase()
        const amtText =
          typeof revRaw === 'number' && revRaw > 0
            ? `${cur === 'USD' ? '$' : `${cur} `}${revRaw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : ''

        const label = isCheckout
          ? name === 'order_completed'
            ? 'Order Completed'
            : name === 'checkout_started'
              ? 'Checkout Started'
              : name === 'payment_info_added'
                ? 'Payment Info Added'
                : name === 'checkout_failed'
                  ? 'Checkout Failed'
                  : name === 'invoice_requested'
                    ? 'Enterprise Invoice Requested'
                    : `Commerce (${name})`
          : name === 'response_completed' || name === 'form_submitted' || product === 'form'
            ? 'Form Submitted'
            : name === 'beta_submitted'
              ? 'Beta Application'
              : name === 'generate_lead' || name === 'sales_contacted'
                ? 'Inbound Lead'
                : `Lead / Signup (${name})`

        const text = [
          `[${label}] ${who}${company ? ` · ${company}` : ''}${amtText ? ` — ${amtText}` : ''}${plan ? ` (${plan})` : ''}`,
          `event=${name} · app=${product}${orderId ? ` · order=${orderId}` : ''}`,
        ].join('\n')

        const targetChannel = isCheckout ? 'c-hanzo-revenue' : 'c-feedback'
        const author = isCheckout ? 'bot-rev' : 'bot-su'

        msgById.set(msgId, {
          ...base(msgId, Class.message),
          message: text,
          attachedTo: targetChannel,
          modifiedOn: atMs,
          modifiedBy: author,
        })

        const nId = `n-live-evt-${rawId}`
        if (!noticeById.has(nId)) {
          noticeById.set(nId, {
            ...base(nId, Class.notice),
            modifiedBy: author,
            modifiedOn: atMs,
            body: `${label.toLowerCase()}: ${who}${amtText ? ` (${amtText})` : ''}`,
            attachedTo: targetChannel,
            attachedToClass: Class.message,
            isViewed: false,
          })
        }
        changed = true
      }

      if (changed) {
        this.docs.set(Class.message, Array.from(msgById.values()))
        this.docs.set(Class.notice, Array.from(noticeById.values()))
        this.saveLocal()
        this.broadcast([])
      }
    } catch {
      // ignore transient network errors
    }
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
      const createdNow = Date.now()
      const doc = {
        ...(tx.attributes as object),
        _id: id,
        _class: cls,
        space: String(tx.objectSpace ?? SPACE),
        attachedTo: tx.attachedTo,
        attachedToClass: tx.attachedToClass,
        collection: tx.collection,
        modifiedBy: tx.modifiedBy,
        createdBy: tx.createdBy ?? tx.modifiedBy,
        modifiedOn: createdNow,
        createdOn: tx.createdOn ?? createdNow,
      } as unknown as Doc
      rows.push(doc)
      this.docs.set(cls, rows)

      // When a user messages a 24/7 bot in `dm-<agentId>`, trigger a live bot reply
      if (this.persistEnabled && cls === Class.message) {
        const room = String(tx.attachedTo ?? '')
        const author = String(tx.modifiedBy ?? '')
        if (room.startsWith('dm-') && !author.startsWith('bot-')) {
          const agentId = room.slice(3)
          const agent = HANZO_AGENTS.find((a) => a.id === agentId)
          if (agent) {
            setTimeout(() => {
              const replyTx: Wire = {
                _class: Tx.create,
                objectId: `m-auto-${Date.now()}`,
                objectClass: Class.message,
                objectSpace: room,
                attachedTo: room,
                attachedToClass: DIRECT_CLASS,
                collection: 'messages',
                modifiedBy: `bot-${agent.id}`,
                createdBy: `bot-${agent.id}`,
                modifiedOn: Date.now(),
                createdOn: Date.now(),
                attributes: {
                  message: `On it — executing via Hanzo MCP (${agent.department} · ${agent.role}). Current status: ${agent.status}`,
                },
              }
              void this.write(replyTx)
            }, 450)
          }
        }
      }
    } else if (tx._class === Tx.update) {
      const row = rows.find((r) => r._id === id)
      if (row) Object.assign(row, tx.operations as object, { modifiedOn: Date.now() })
      this.docs.set(cls, rows)
    } else if (tx._class === Tx.remove) {
      this.docs.set(cls, rows.filter((r) => r._id !== id))
    } else {
      this.docs.set(cls, rows)
    }

    this.saveLocal()
    this.broadcast([tx])
    return Promise.resolve()
  }
}

const matches = (row: Record<string, unknown>, query: Record<string, unknown>): boolean =>
  Object.entries(query).every(([field, want]) => {
    const has = row[field]
    if (want && typeof want === 'object' && '$in' in (want as object)) {
      return (((want as { $in: unknown[] }).$in) ?? []).includes(has)
    }
    return has === want
  })

const DEFAULT_SPACES: SpaceRow[] = [
  { uuid: SPACE, name: 'Hanzo AI', url: SPACE, org: 'hanzo', isDisabled: false },
  { uuid: 'foundation', name: 'The Foundation', url: 'foundation', org: 'foundation', isDisabled: false },
  { uuid: 'lux', name: 'Lux Network', url: 'lux', org: 'lux', isDisabled: false },
  { uuid: 'zoo', name: 'Zoo Labs', url: 'zoo', org: 'zoo', isDisabled: false },
]

const loadSavedSpaces = (): SpaceRow[] => {
  if (typeof window === 'undefined') return [...DEFAULT_SPACES]
  try {
    const raw = window.localStorage.getItem(ORGS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_SPACES]
    const extra = JSON.parse(raw) as SpaceRow[]
    if (!Array.isArray(extra)) return [...DEFAULT_SPACES]
    const merged = [...DEFAULT_SPACES]
    for (const item of extra) {
      if (item && item.url && !merged.some((s) => s.url === item.url)) {
        merged.push(item)
      }
    }
    return merged
  } catch {
    return [...DEFAULT_SPACES]
  }
}

const SPACES: SpaceRow[] = loadSavedSpaces()

// ── the one knob ──────────────────────────────────────────────────────────────

export const fixture = {
  /** Whether anything below is standing in for the real plane. */
  on: name !== 'live',

  /** Register a newly created organization workspace locally and in memory. */
  addSpace: (slug: string, displayName: string): SpaceRow => {
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '') || 'org'
    const existing = SPACES.find((s) => s.url === cleanSlug)
    if (existing) return existing
    const row: SpaceRow = {
      uuid: cleanSlug,
      name: displayName.trim() || cleanSlug,
      url: cleanSlug,
      org: cleanSlug,
      isDisabled: false,
    }
    SPACES.push(row)
    if (typeof window !== 'undefined') {
      try {
        const custom = SPACES.filter((s) => !DEFAULT_SPACES.some((d) => d.url === s.url))
        window.localStorage.setItem(ORGS_STORAGE_KEY, JSON.stringify(custom))
      } catch {
        // ignore storage quota errors
      }
    }
    return row
  },

  /** The space list, or the real one. */
  spaces: (live: () => Promise<SpaceRow[]>): Promise<SpaceRow[]> => {
    switch (name) {
      case 'live':
        return live()
          .then((rows) => (rows.length > 0 ? rows : [...SPACES]))
          .catch(() => [...SPACES])
      case 'loading':
        return never()
      case 'failure':
        return refuse()
      default:
        return Promise.resolve([...SPACES])
    }
  },

  /** The plane for a space, or the real one. */
  plane: (slug: string): Plane => {
    switch (name) {
      case 'live':
        if (SPACES.some((s) => s.url === slug)) {
          return new Stand(world(), true)
        }
        return new Socket(slug)
      case 'empty':
        return new Stand(nothing(), false)
      case 'minimal':
        return new Stand(trimmed(), false)
      case 'realistic':
        return new Stand(world(), false)
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
