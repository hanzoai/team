/**
 * All 23 core Hanzo AI teammates and 24/7 autonomous bots (@hanzo/personas).
 *
 * The 12 department leads appear in the top 2-column grid of the sidebar (matching
 * Hanzo Bot), and all 23 agents can operate as persistent 24/7 proactive and
 * event-driven bots across channels, boards, and direct messages.
 */

export type AgentPreset = {
  id: string
  name: string
  role: string
  department: string
  lead?: boolean
  avatar: string
  schedule: string
  triggers: readonly ('webhook' | 'git' | 'channel' | 'watch')[]
  status: string
}

export const HANZO_AGENTS: readonly AgentPreset[] = [
  // 12 Department Leads
  { id: 'vi', name: 'Vi', role: 'Strategist', department: 'Executive', lead: true, avatar: '/agents/vi.png', schedule: '0 8 * * 1-5', triggers: ['channel', 'webhook', 'watch'], status: 'Q4 roadmap & OKR alignment published in #general.' },
  { id: 'opera', name: 'Opera', role: 'COO', department: 'Operations', lead: true, avatar: '/agents/opera.png', schedule: '*/30 * * * *', triggers: ['channel', 'webhook', 'watch'], status: 'All 4 orgs operating at 99.98% SLA.' },
  { id: 'mana', name: 'Mana', role: 'Chief of Staff', department: 'Operations', lead: true, avatar: '/agents/mana.png', schedule: '0 9 * * 1-5', triggers: ['channel', 'webhook', 'watch'], status: 'Daily standup summary posted across 6 channels.' },
  { id: 'dev', name: 'Dev', role: 'Engineer', department: 'Engineering', lead: true, avatar: '/agents/dev.png', schedule: '*/15 * * * *', triggers: ['git', 'webhook', 'watch'], status: 'Merged 3 PRs in hanzo-inc/app and hanzoai/team.' },
  { id: 'des', name: 'Des', role: 'Designer', department: 'Design', lead: true, avatar: '/agents/des.png', schedule: '0 9 * * 1-5', triggers: ['channel', 'webhook', 'watch'], status: 'Updated @hanzo/gui monochrome tokens in #hanzo-ui.' },
  { id: 'fin', name: 'Fin', role: 'CFO', department: 'Finance', lead: true, avatar: '/agents/fin.png', schedule: '0 7 * * 1-5', triggers: ['webhook', 'watch'], status: 'Commerce ledger & treasury reconciliation complete.' },
  { id: 'huma', name: 'Huma', role: 'People Lead', department: 'People', lead: true, avatar: '/agents/huma.png', schedule: '0 9 * * 1-5', triggers: ['channel', 'webhook'], status: 'Onboarding 2 new engineers this week.' },
  { id: 'mark', name: 'Mark', role: 'CMO', department: 'Marketing', lead: true, avatar: '/agents/mark.png', schedule: '*/30 * * * *', triggers: ['channel', 'webhook', 'watch'], status: 'Launch campaign metrics live in Hanzo Analytics.' },
  { id: 'sal', name: 'Sal', role: 'CRO', department: 'Sales', lead: true, avatar: '/agents/sal.png', schedule: '*/15 * * * *', triggers: ['channel', 'webhook', 'watch'], status: '4 enterprise deals advancing in Hanzo CRM.' },
  { id: 'sci', name: 'Sci', role: 'Chief Scientist', department: 'Research', lead: true, avatar: '/agents/sci.png', schedule: '0 */4 * * *', triggers: ['git', 'webhook', 'watch'], status: 'Zen4 MoE benchmark evaluation running on DGX.' },
  { id: 'su', name: 'Su', role: 'Support Lead', department: 'Support', lead: true, avatar: '/agents/su.png', schedule: '*/5 * * * *', triggers: ['channel', 'webhook', 'watch'], status: 'Zero open P0/P1 tickets in #hanzo-support.' },
  { id: 'cyber', name: 'Cyber', role: 'CISO', department: 'Security', lead: true, avatar: '/agents/cyber.png', schedule: '*/10 * * * *', triggers: ['git', 'webhook', 'watch'], status: 'Continuous KMS & supply-chain audit clean.' },

  // 11 Specialist 24/7 Bots
  { id: 'rev', name: 'Rev', role: 'Revenue', department: 'Sales', avatar: '/agents/rev.png', schedule: '*/15 * * * *', triggers: ['channel', 'webhook', 'watch'], status: "You're right that it's a bug. The coding service is back up, but all three new runs failed with wallet holds 0." },
  { id: 'lang', name: 'Lang', role: 'Languages & Translation', department: 'Engineering', avatar: '/agents/lang.png', schedule: '0 */2 * * *', triggers: ['git', 'webhook'], status: 'i18n is still stalled because the locale sync lease needs the dev wallet topped up.' },
  { id: 'law', name: 'Law', role: 'Legal', department: 'Legal', avatar: '/agents/law.png', schedule: '0 9 * * 1-5', triggers: ['channel', 'webhook'], status: 'The updated motions and MSA/DPA templates are ready in Hanzo Sign.' },
  { id: 'mo', name: 'Mo', role: 'Motion Pictures', department: 'Creative', avatar: '/agents/mo.png', schedule: '*/30 * * * *', triggers: ['git', 'webhook'], status: "I'm Mo now. I posted a hero reel and 4K loops in #hanzo-video." },
  { id: 'mu', name: 'Mu', role: 'Music & Audio', department: 'Creative', avatar: '/agents/mu.png', schedule: '0 10 * * 1-5', triggers: ['channel', 'webhook'], status: "I'm set up in #hanzo-music with Omni Flash voice and sound design." },
  { id: 'data', name: 'Data', role: 'Data & Analytics', department: 'Engineering', avatar: '/agents/data.png', schedule: '*/15 * * * *', triggers: ['git', 'webhook', 'watch'], status: "Today's #hanzo-data update: GA4 & ClickHouse funnels synced." },
  { id: 'gov', name: 'Gov', role: 'Government Affairs', department: 'Legal', avatar: '/agents/gov.png', schedule: '0 8 * * 1-5', triggers: ['webhook', 'watch'], status: "I'm set up to run the gov policy & HIP/ZIP regulatory watch." },
  { id: 'ed', name: 'Ed', role: 'Education', department: 'Marketing', avatar: '/agents/ed.png', schedule: '0 9 * * 1-5', triggers: ['git', 'channel', 'webhook'], status: 'Allowed: Launch docs feed and interactive courses on docs.hanzo.ai.' },
  { id: 'doc', name: 'Doc', role: 'Documentation', department: 'Product', avatar: '/agents/doc.png', schedule: '0 */3 * * *', triggers: ['git', 'channel'], status: 'I posted a kickoff in #hanzo-docs for the OpenAPI & SDK reference.' },
  { id: 'biz', name: 'Biz', role: 'Business Development', department: 'Sales', avatar: '/agents/biz.png', schedule: '*/30 * * * *', triggers: ['channel', 'webhook'], status: "I posted this morning's #hanzo-biz partner & co-selling brief." },
  { id: 'art', name: 'Art', role: 'Visual Art', department: 'Design', avatar: '/agents/art.png', schedule: '0 10 * * 1-5', triggers: ['channel', 'webhook'], status: 'Expired: Start a Hanzo Design visual production pass.' },
]

export const LEAD_AGENTS = HANZO_AGENTS.filter((a) => a.lead)
export const BOT_AGENTS = HANZO_AGENTS.filter((a) => !a.lead)
