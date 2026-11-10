export type Workflow = {
  id: string
  title: string
  group: 'Team' | 'Publishing' | 'CRM & Growth'
  description: string
  app: string
  href: string
  surface: string
  path?: string
  columns: readonly string[]
}

const cms = 'https://cms.hanzo.ai/admin'
const crm = 'https://crm.hanzo.ai'
const base = (collection: string) => '/v1/base/collections/' + collection + '/records'

export const views: readonly Workflow[] = [
  {
    id: 'actions',
    title: 'Next actions',
    group: 'Team',
    description: 'Track reviews, handoffs and follow-up across projects.',
    app: 'Tracker',
    href: '/issues',
    surface: '/v1/team',
    columns: ['Task', 'Project', 'Owner', 'Status'],
  },
  {
    id: 'accounts',
    title: 'Connected accounts',
    group: 'Publishing',
    description: 'See which social accounts can receive a post.',
    app: 'Hanzo CMS',
    href: cms,
    surface: '/v1/social · /v1/provider',
    path: '/v1/social/accounts',
    columns: ['Account', 'Network', 'Status'],
  },
  {
    id: 'calendar',
    title: 'Content calendar',
    group: 'Publishing',
    description: 'Scheduled social posts, in your local time.',
    app: 'Hanzo CMS',
    href: cms,
    surface: '/v1/social',
    path: '/v1/social/posts?status=scheduled',
    columns: ['Content', 'Network', 'Scheduled for'],
  },
  {
    id: 'editorial',
    title: 'Blog, news & press',
    group: 'Publishing',
    description: 'Editorial copy, collection categories and publication status.',
    app: 'Hanzo CMS',
    href: cms,
    surface: '/v1/framework',
    path: '/v1/framework/cms.Post',
    columns: ['Headline', 'Category', 'Status'],
  },
  {
    id: 'reviews',
    title: 'Drafts & approvals',
    group: 'Publishing',
    description: 'Move content from draft through editorial review.',
    app: 'Hanzo CMS',
    href: cms,
    surface: '/v1/content',
    path: '/v1/content/board',
    columns: ['Content', 'Type', 'Status'],
  },
  {
    id: 'publishing',
    title: 'Publishing status',
    group: 'Publishing',
    description: 'Inspect each post’s delivery state and the publisher’s response.',
    app: 'Hanzo CMS',
    href: cms,
    surface: '/v1/social',
    path: '/v1/social/posts',
    columns: ['Content', 'Network', 'Status', 'Delivery detail'],
  },
  {
    id: 'campaigns',
    title: 'Campaign performance',
    group: 'CRM & Growth',
    description: 'Compare campaign status, reported spend and budget.',
    app: 'Hanzo CRM',
    href: crm + '/sequences',
    surface: '/v1/marketing',
    path: '/v1/marketing/campaigns',
    columns: ['Campaign', 'Channel', 'Status', 'Spend', 'Budget'],
  },
  {
    id: 'segments',
    title: 'Lead segments',
    group: 'CRM & Growth',
    description: 'Review saved lead audiences before planning outreach.',
    app: 'Hanzo CRM',
    href: crm + '/lists',
    surface: '/v1/base',
    path: base('segments'),
    columns: ['Segment', 'Object', 'Description'],
  },
  {
    id: 'consent',
    title: 'Consent',
    group: 'CRM & Growth',
    description:
      'Review recorded permission in CRM. Missing evidence leaves a lead ineligible for marketing.',
    app: 'Hanzo CRM',
    href: crm,
    surface: '/v1/base',
    path: base('people') + '?fields=id,name,consent',
    columns: ['Person', 'Consent evidence'],
  },
  {
    id: 'suppressions',
    title: 'Suppressions',
    group: 'CRM & Growth',
    description:
      'Apply opt-outs and blocks before importing leads. Commercial suppression applies only to marketing.',
    app: 'Hanzo CRM',
    href: crm,
    surface: '/v1/marketing',
    path: '/v1/marketing/suppressions',
    columns: ['Address', 'Channel', 'Reason'],
  },
  {
    id: 'pipeline',
    title: 'CRM pipeline',
    group: 'CRM & Growth',
    description: 'Review opportunities, stages and upcoming close dates.',
    app: 'Hanzo CRM',
    href: crm + '/deals',
    surface: '/v1/base',
    path: base('opportunities'),
    columns: ['Opportunity', 'Stage', 'Close date'],
  },
  {
    id: 'outreach',
    title: 'Outreach tasks',
    group: 'CRM & Growth',
    description: 'Coordinate follow-up with the people responsible in CRM.',
    app: 'Hanzo CRM',
    href: crm + '/tasks',
    surface: '/v1/base',
    path: base('tasks'),
    columns: ['Task', 'Status', 'Due'],
  },
]

export type RecordRow = Record<string, unknown>
export function records(reply: unknown, path: string): RecordRow[] {
  const field = path.startsWith('/v1/base/') ? 'items' : 'data'
  const rows = reply && typeof reply === 'object' && Reflect.get(reply, field)
  if (!Array.isArray(rows) || !rows.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('The service returned an unreadable collection.')
  }
  return rows
}

function value(field: unknown): string {
  if (field == null || field === '') return '—'
  if (typeof field === 'object') return JSON.stringify(field)
  return String(field)
}

const dollars = (cents: unknown) =>
  typeof cents === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
    : '—'

export function cells(id: string, r: RecordRow): string[] {
  switch (id) {
    case 'accounts':
      return [r.handle, r.provider, r.status].map(value)
    case 'calendar':
      return [
        value(r.content),
        value(r.channel),
        r.scheduleAt ? new Date(Number(r.scheduleAt) * 1000).toLocaleString() : '—',
      ]
    case 'editorial':
      return [r.title || r.name, r.category, r.status].map(value)
    case 'reviews':
      return [r.title || r.name, r.doctype, r.status].map(value)
    case 'publishing':
      return [r.content, r.channel, r.status, r.error || r.externalId].map(value)
    case 'campaigns':
      return [r.name, r.channel, r.status, dollars(r.spend), dollars(r.budget)].map(value)
    case 'segments':
      return [r.name, r.object, r.description].map(value)
    case 'consent': {
      const person =
        r.name && typeof r.name === 'object' ? Object.values(r.name).filter(Boolean).join(' ') : r.name
      const evidence =
        r.consent && typeof r.consent === 'object' && !Object.keys(r.consent).length ? null : r.consent
      return [value(person || r.id), value(evidence || 'Unknown')]
    }
    case 'suppressions':
      return [r.address, r.channel, r.reason].map(value)
    case 'pipeline':
      return [r.name, r.stage, r.close_date].map(value)
    case 'outreach':
      return [r.title, r.status, r.due].map(value)
    default:
      return [r.title, r.project, r.owner, r.status].map(value)
  }
}

export function inView(id: string, r: RecordRow): boolean {
  if (id === 'reviews') return ['draft', 'in_review', 'approved'].includes(String(r.status))
  if (id === 'calendar') return r.status === 'scheduled'
  return true
}
