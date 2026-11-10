import type { RecordRow } from './catalog.ts'

const day = new Date()
day.setHours(10, 0, 0, 0)
const tomorrow = day.getTime() / 1000 + 86400
const posts = [
  {
    id: 'post-1',
    content: 'Hanzo Cloud release notes',
    channel: 'linkedin',
    status: 'scheduled',
    scheduleAt: tomorrow,
  },
  {
    id: 'post-2',
    content: 'Inside the developer preview',
    channel: 'x',
    status: 'scheduled',
    scheduleAt: tomorrow + 7200,
  },
  { id: 'post-3', content: 'Introducing the Hanzo research blog', channel: 'linkedin', status: 'published' },
]
export const examples: Record<string, RecordRow[]> = {
  calendar: posts,
  publishing: posts,
  accounts: [
    { provider: 'linkedin', handle: 'Hanzo AI', status: 'connected' },
    { provider: 'x', handle: '@hanzoai', status: 'connected' },
  ],
  editorial: [
    { title: 'A closer look at Hanzo Cloud', category: 'blog', status: 'Draft' },
    { title: 'Developer preview opens', category: 'news', status: 'Published' },
    { title: 'Hanzo announces its research program', category: 'press', status: 'Draft' },
  ],
  reviews: [
    {
      name: 'release',
      title: 'Cloud release announcement',
      doctype: 'content.SocialPost',
      status: 'in_review',
    },
    { name: 'preview', title: 'Developer preview', doctype: 'content.Campaign', status: 'draft' },
  ],
  campaigns: [{ name: 'Developer preview', channel: 'email', status: 'active', spend: 1240, budget: 3000 }],
  segments: [
    { name: 'Developer preview signups', object: 'people', description: 'Inbound preview requests' },
  ],
  consent: [{ name: 'Example subscriber', consent: { purpose: 'newsletter', source: 'Signup form' } }],
  suppressions: [{ address: 'unsubscribed@example.org', channel: 'email', reason: 'unsubscribe' }],
  pipeline: [{ name: 'Developer preview follow-up', stage: 'Discovery' }],
  outreach: [{ title: 'Follow up on the preview request', status: 'Open', due: day.toLocaleDateString() }],
}
