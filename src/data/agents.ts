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
  { id: 'rev', name: 'Rev', role: 'Revenue Operations', department: 'Sales', avatar: '/agents/rev.png', schedule: '*/15 * * * *', triggers: ['channel', 'webhook', 'watch'], status: 'Synced org grants & prepaid balances' },
  { id: 'lang', name: 'Lang', role: 'Localization & i18n', department: 'Engineering', avatar: '/agents/lang.png', schedule: '0 */2 * * *', triggers: ['git', 'webhook'], status: '36 locales verified across hanzo.ai' },
  { id: 'law', name: 'Law', role: 'General Counsel', department: 'Legal', avatar: '/agents/law.png', schedule: '0 9 * * 1-5', triggers: ['channel', 'webhook'], status: 'MSA & DPA templates ready in Sign' },
  { id: 'mo', name: 'Mo', role: 'Motion Pictures', department: 'Creative', avatar: '/agents/mo.png', schedule: '*/30 * * * *', triggers: ['git', 'webhook'], status: '4K hero reel & loops in #hanzo-video' },
  { id: 'mu', name: 'Mu', role: 'Music & Audio', department: 'Creative', avatar: '/agents/mu.png', schedule: '0 10 * * 1-5', triggers: ['channel', 'webhook'], status: 'Omni Flash voice & sound in Studio' },
  { id: 'data', name: 'Data', role: 'Data & Analytics', department: 'Engineering', avatar: '/agents/data.png', schedule: '*/15 * * * *', triggers: ['git', 'webhook', 'watch'], status: 'GA4 & ClickHouse funnels synced' },
  { id: 'gov', name: 'Gov', role: 'Government Affairs', department: 'Legal', avatar: '/agents/gov.png', schedule: '0 8 * * 1-5', triggers: ['webhook', 'watch'], status: 'Policy & HIP/ZIP regulatory watch' },
  { id: 'ed', name: 'Ed', role: 'Education', department: 'Marketing', avatar: '/agents/ed.png', schedule: '0 9 * * 1-5', triggers: ['git', 'channel', 'webhook'], status: 'Docs & interactive courses live' },
  { id: 'doc', name: 'Doc', role: 'Documentation', department: 'Product', avatar: '/agents/doc.png', schedule: '0 */3 * * *', triggers: ['git', 'channel'], status: 'OpenAPI & SDK reference synced' },
  { id: 'biz', name: 'Biz', role: 'Business Development', department: 'Sales', avatar: '/agents/biz.png', schedule: '*/30 * * * *', triggers: ['channel', 'webhook'], status: 'Partner & co-selling brief posted' },
  { id: 'art', name: 'Art', role: 'Visual Art', department: 'Design', avatar: '/agents/art.png', schedule: '0 10 * * 1-5', triggers: ['channel', 'webhook'], status: '4K hero stills & visual assets ready' },
]

export const LEAD_AGENTS = HANZO_AGENTS.filter((a) => a.lead)
export const BOT_AGENTS = HANZO_AGENTS.filter((a) => !a.lead)

/** Human-readable cadence for primary headers; raw cron stays in Technical Details. */
export const humanSchedule = (cron: string): string => {
  const m = /^\*\/(\d+) \* \* \* \*$/.exec(cron)
  if (m) return `Every ${m[1]}m`
  const h = /^0 \*\/(\d+) \* \* \*$/.exec(cron)
  if (h) return `Every ${h[1]}h`
  const d = /^0 (\d+) \* \* 1-5$/.exec(cron)
  if (d) return `Weekdays ${d[1]}:00`
  return '24/7 Proactive'
}
