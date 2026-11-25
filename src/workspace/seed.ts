/**
 * Deterministic initial state for Hanzo Team v1.1.0 ("Discord × Mattermost" + Hanzo v8.8).
 * Pure data only — zero CSS color literals (enforced by src/theme/theme.test.ts).
 */

export interface OrgGuild {
  id: string
  letter: string
  name: string
  subtitle: string
  agentsCount: number
  humansCount: number
}

export interface RosterMember {
  id: string
  handle: string
  name: string
  shortName: string
  avatar?: string
  bot: boolean
  badge?: string
  activity: string
  presence: 'online' | 'busy' | 'gated' | 'voice'
  speaking?: boolean
}

export interface DeployCardSpec {
  id: string
  version: string
  summary: string
  checks: string
  diffPreview: string
  approvedBy?: string
}

export interface ChatReactionGroup {
  emoji: string
  count: number
  mine: boolean
}

export interface ChatReplyItem {
  id: string
  authorId: string
  at: string
  body: string
}

export interface ChatMessageItem {
  id: string
  roomId: string
  authorId: string
  at: string
  body: string
  pinned?: boolean
  mergedRef?: string
  deployCard?: DeployCardSpec
  reactions: ChatReactionGroup[]
  replies: ChatReplyItem[]
}

export interface WorkspaceChannel {
  id: string
  name: string
  topic: string
  kind: 'channel' | 'dm'
  unread?: number
  sevTag?: string
  dmMemberId?: string
  playbookSteps?: readonly { id: string; label: string; done: boolean }[]
}

export interface VoiceParticipant {
  memberId: string
  speaking?: boolean
  sharingScreen?: boolean
  videoOn?: boolean
}

export interface VoiceRoom {
  id: string
  name: string
  latencyMs: number
  participants: VoiceParticipant[]
}

export interface AttentionItem {
  id: string
  agentHandle: string
  badgeText: string
  avatar?: string
  title: string
  subtitle: string
  targetPath: string
  resolved?: boolean
}

export interface OfficeDeskTile {
  id: string
  floor: 'F4' | 'F3' | 'F2' | 'F1'
  label: string
  occupants: string[]
  toolTag?: 'GitHub' | 'Terminal' | 'Linear' | 'Kai' | 'Science' | 'Spotify'
  activeRing?: 'emerald' | 'warm' | 'subtle'
  statusLine?: string
}

export interface SpaceDeliverable {
  id: string
  title: string
  authorHandle: string
  updatedAt: string
  version: 'v1' | 'v2' | 'v3'
  summary: string
  metrics: readonly { label: string; value: string; delta: string }[]
  markdown: string
}

export interface MemoryNode {
  id: string
  category: 'Runbook' | 'ADR' | 'Session' | 'Policy'
  title: string
  ownerHandle: string
  updatedAt: string
  tags: readonly string[]
  summary: string
}

export const INITIAL_ORGS: readonly OrgGuild[] = [
  { id: 'hanzo', letter: 'H', name: 'Hanzo', subtitle: 'Your organization · 24 agents · 8 humans', agentsCount: 24, humansCount: 8 },
  { id: 'lux', letter: 'L', name: 'Lux', subtitle: 'Lux Network · 14 agents · 6 humans', agentsCount: 14, humansCount: 6 },
  { id: 'zoo', letter: 'Z', name: 'Zoo', subtitle: 'Zoo Labs · 9 agents · 5 humans', agentsCount: 9, humansCount: 5 },
  { id: 'science', letter: 'S', name: 'Science', subtitle: 'Hanzo Science · 11 agents · 4 humans', agentsCount: 11, humansCount: 4 },
]

export const ROSTER_MEMBERS: readonly RosterMember[] = [
  { id: 'vi', handle: 'vi', name: 'Vi', shortName: 'Vi', avatar: '/agents/vi.png', bot: true, badge: 'BOT · @vi', activity: 'Preparing briefing', presence: 'online' },
  { id: 'mana', handle: 'mana', name: 'Mana', shortName: 'Mana', avatar: '/agents/mana.png', bot: true, badge: 'BOT · @mana', activity: 'Planning release', presence: 'online' },
  { id: 'dev', handle: 'dev', name: 'Dev', shortName: 'Dev', avatar: '/agents/dev.png', bot: true, badge: 'BOT · @dev', activity: 'Executing PR-412', presence: 'online', speaking: true },
  { id: 'sci', handle: 'sci', name: 'Sci', shortName: 'Sci', avatar: '/agents/sci.png', bot: true, badge: 'BOT · @sci', activity: 'Experiment running', presence: 'online' },
  { id: 'cyber', handle: 'cyber', name: 'Cyber', shortName: 'Cyber', avatar: '/agents/cyber.png', bot: true, badge: 'BOT · @cyber', activity: 'Available', presence: 'online' },
  { id: 'qa', handle: 'qa', name: 'QA', shortName: 'QA', avatar: '/agents/opera.png', bot: true, badge: 'BOT · @qa', activity: 'Verifying candidate', presence: 'gated' },
  { id: 'des', handle: 'des', name: 'Des', shortName: 'Des', avatar: '/agents/des.png', bot: true, badge: 'BOT · @des', activity: 'Awaiting feedback', presence: 'gated' },
  { id: 'zach', handle: 'zach', name: 'Zach Kelling', shortName: 'Zach K.', avatar: '/agents/zach.jpg', bot: false, badge: 'STAFF', activity: 'Shipping v1.1.0', presence: 'voice' },
  { id: 'alex', handle: 'alex', name: 'Alex Rivera', shortName: 'Alex R.', bot: false, badge: 'STAFF', activity: 'In Eng Pairing', presence: 'voice' },
  { id: 'sara', handle: 'sara', name: 'Sara Chen', shortName: 'Sara C.', avatar: '/agents/antje.jpg', bot: false, badge: 'STAFF', activity: 'Reviewing Zen 6 evals', presence: 'online' },
  { id: 'devon', handle: 'devon', name: 'Devon Park', shortName: 'Devon P.', bot: false, badge: 'STAFF', activity: 'Triaging gateway PRs', presence: 'online' },
]

export const INITIAL_CHANNELS: readonly WorkspaceChannel[] = [
  { id: 'general', name: 'general', topic: 'Company-wide announcements, milestones & daily standups', kind: 'channel' },
  {
    id: 'engineering',
    name: 'engineering',
    topic: 'Core platform, Rust/Go services & Zen 6 rollouts',
    kind: 'channel',
    unread: 1,
    playbookSteps: [
      { id: 'pb-1', label: 'Run unit + typecheck suite (`pnpm test && pnpm build`)', done: true },
      { id: 'pb-2', label: 'Build Linux/macOS Tauri frameless binary (`v1.1.0`)', done: true },
      { id: 'pb-3', label: 'Verify X11 12px RGBA outer corners & sign off deploy', done: false },
    ],
  },
  { id: 'releases', name: 'releases', topic: 'Signed desktop cuts, changelogs & npm/cargo tags', kind: 'channel' },
  {
    id: 'incidents',
    name: 'incidents',
    topic: 'Zero-downtime incident command, paging & postmortems',
    kind: 'channel',
    sevTag: 'SEV-2',
    playbookSteps: [
      { id: 'inc-1', label: 'Isolate upstream WebSocket pool spike in us-west-2', done: true },
      { id: 'inc-2', label: 'Drain stale connections & verify p99 < 18ms', done: true },
      { id: 'inc-3', label: '@cyber publish post-incident runbook to Org Memory', done: false },
    ],
  },
  { id: 'research', name: 'research', topic: 'Zen 6 Ultra, Enso router benchmarks & speculative decoding', kind: 'channel' },
  { id: 'design', name: 'design', topic: 'Zen Obsidian Dark tokens, typography & desktop craft', kind: 'channel' },
  { id: 'revenue', name: 'revenue', topic: 'Enterprise pilots, expansion & investor updates', kind: 'channel' },
  { id: 'dm-vi', name: 'Vi', topic: 'Executive Chief of Staff · Daily briefings & cross-org coordination', kind: 'dm', dmMemberId: 'vi' },
  { id: 'dm-dev', name: 'Dev', topic: 'Full-Stack & Systems Specialist · PR-412 active', kind: 'dm', dmMemberId: 'dev' },
  { id: 'dm-mana', name: 'Mana', topic: 'Product & Release Planner · Hanzo v8.8 roadmap', kind: 'dm', dmMemberId: 'mana' },
  { id: 'dm-cyber', name: 'Cyber', topic: 'Zero-Trust Kai Gates & Dependency Security', kind: 'dm', dmMemberId: 'cyber' },
  { id: 'dm-sci', name: 'Sci', topic: 'ML Research & Zen 6 Evaluation Harness', kind: 'dm', dmMemberId: 'sci' },
  { id: 'dm-qa', name: 'QA', topic: 'Verification, Playwright & X11 Pixel Gates', kind: 'dm', dmMemberId: 'qa' },
  { id: 'dm-des', name: 'Des', topic: 'Design Systems & Monochrome Token Hygiene', kind: 'dm', dmMemberId: 'des' },
  { id: 'dm-alex', name: 'Alex Rivera', topic: 'Principal Systems Engineer · Rust & Tauri', kind: 'dm', dmMemberId: 'alex' },
  { id: 'dm-sara', name: 'Sara Chen', topic: 'Research Lead · Model Routing', kind: 'dm', dmMemberId: 'sara' },
]

export const INITIAL_VOICE_ROOMS: readonly VoiceRoom[] = [
  { id: 'lounge', name: 'Lounge', latencyMs: 16, participants: [{ memberId: 'devon' }] },
  {
    id: 'eng-pairing',
    name: 'Eng Pairing',
    latencyMs: 14,
    participants: [
      { memberId: 'zach' },
      { memberId: 'dev', speaking: true },
      { memberId: 'alex', sharingScreen: true },
    ],
  },
  { id: 'all-hands', name: 'All-Hands Stage', latencyMs: 19, participants: [] },
]

export const INITIAL_MESSAGES: readonly ChatMessageItem[] = [
  {
    id: 'eng-m1',
    roomId: 'engineering',
    authorId: 'alex',
    at: '09:41 AM',
    pinned: true,
    body: [
      'Landed the Linux WebKitGTK RGBA outer-corner compositor fix in `apps/desktop/src-tauri` — zero `WEBKIT_DISABLE_COMPOSITING_MODE` override so hardware alpha clipping stays crisp at `12px` (`24px` on compact login).',
      '```diff',
      '- std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");',
      '+ builder = builder.decorations(false).transparent(true).background_color(Color(0, 0, 0, 0));',
      '+ // #root::after renders 1px var(--team-window-ring) curved inner ring',
      '```',
    ].join('\n'),
    reactions: [
      { emoji: '🔥', count: 5, mine: true },
      { emoji: '✅', count: 4, mine: false },
    ],
    replies: [
      { id: 'r1', authorId: 'zach', at: '09:43 AM', body: 'Tested on `:1` over non-black wallpaper — all four corners clip cleanly with zero square bleed.' },
      { id: 'r2', authorId: 'dev', at: '09:44 AM', body: 'Verified `cargo test` + `cargo clippy` pass with 0 warnings across `hanzo-team-desktop`.' },
      { id: 'r3', authorId: 'qa', at: '09:46 AM', body: 'Added automated geometry & window-controls assertion to the release checklist.' },
    ],
  },
  {
    id: 'eng-m2',
    roomId: 'engineering',
    authorId: 'dev',
    at: '09:48 AM',
    pinned: true,
    mergedRef: '0a350004',
    body: [
      'Completed the cross-platform shell hygiene batch and staged **Hanzo Team `v1.1.0`** release candidate:',
      '- [x] @dev Fix Windows PowerShell -EncodedCommand truncation',
      '- [ ] @cyber Audit OSS @hanzo/ui pixel hygiene',
      '- [ ] @qa Capture 1440x900 live X11 verification screenshots',
    ].join('\n'),
    deployCard: {
      id: 'rc-v110',
      version: 'v1.1.0-rc.1',
      summary: 'Hanzo Team Desktop + Web Bundle (@hanzo/team@1.1.0)',
      checks: '136/136 tests green · tsc 0 errors · Tauri release binary ready',
      diffPreview: '18 files changed (+1,840 / -1,190) · @hanzo/event@0.3.73 · @hanzo/font@1.9.3',
    },
    reactions: [
      { emoji: '🚀', count: 3, mine: true },
      { emoji: '🔥', count: 4, mine: false },
    ],
    replies: [
      { id: 'r4', authorId: 'cyber', at: '09:49 AM', body: 'Supply-chain lockfile verification passed (`@hanzo/event@0.3.73` pinned, zero external telemetry leaks).' },
    ],
  },
  {
    id: 'eng-m3',
    roomId: 'engineering',
    authorId: 'sara',
    at: '09:54 AM',
    body: [
      'Updated the `enso-auto` model router table for inline `@mention` agent turns — sub-40ms TTFT on local `hanzod` socket:',
      '```ts',
      'export const routeTurn = (task: TurnInput) =>',
      '  task.hasDiffOrCode ? "zen6-coder" : task.depth === "deep" ? "zen6-ultra" : "enso-auto"',
      '```',
    ].join('\n'),
    reactions: [{ emoji: '⚡', count: 4, mine: false }],
    replies: [
      { id: 'r5', authorId: 'sci', at: '09:55 AM', body: '98.4% pass@1 across 412 eval tasks with 31% lower token spend vs static routing.' },
      { id: 'r6', authorId: 'zach', at: '09:56 AM', body: 'Ship it in `v1.1.0` default composer config.' },
    ],
  },
  {
    id: 'gen-m1',
    roomId: 'general',
    authorId: 'vi',
    at: '09:00 AM',
    pinned: true,
    body: 'Good morning team — **12 objectives completed** overnight, **6 active runs** in flight, and **Hanzo Team v1.1.0** is in final review in `#engineering`.',
    reactions: [{ emoji: '🔥', count: 7, mine: true }],
    replies: [],
  },
  {
    id: 'inc-m1',
    roomId: 'incidents',
    authorId: 'cyber',
    at: '08:32 AM',
    pinned: true,
    body: [
      '**SEV-2 Mitigated** — Transient WebSocket reconnect storm on `us-west-2` edge pool resolved in 4m 12s. Zero data loss.',
      '- [x] @opera Drain affected edge pod & rebalance active rooms',
      '- [ ] @cyber Publish permanent rate-limit rule to Org Memory',
    ].join('\n'),
    reactions: [{ emoji: '✅', count: 6, mine: true }],
    replies: [
      { id: 'inc-r1', authorId: 'alex', at: '08:39 AM', body: 'Confirmed p99 frame delivery back at 14ms.' },
    ],
  },
  {
    id: 'rel-m1',
    roomId: 'releases',
    authorId: 'mana',
    at: '09:30 AM',
    pinned: true,
    body: '**Release Cut `v1.1.0`** — Discord × Mattermost unified 4-column shell, Roam-style Multi-Floor Virtual Office, and v8.8 Executive Home.',
    reactions: [{ emoji: '🚀', count: 8, mine: true }],
    replies: [],
  },
  {
    id: 'dm-vi-1',
    roomId: 'dm-vi',
    authorId: 'vi',
    at: '09:12 AM',
    body: 'Morning Zach! Your briefing is ready on **Home**: `@dev` has `v1.1.0` ready for sign-off, `@sci` finished 3 Zen 6 router experiments, and the investor follow-up draft is queued.',
    reactions: [],
    replies: [],
  },
  {
    id: 'dm-dev-1',
    roomId: 'dm-dev',
    authorId: 'dev',
    at: '09:45 AM',
    body: 'PR-412 is green (`140/140` unit tests passing, `tsc --noEmit` clean). Ready whenever you hit Approve in `#engineering`.',
    reactions: [],
    replies: [],
  },
]

export const INITIAL_ATTENTION: readonly AttentionItem[] = [
  {
    id: 'att-1',
    agentHandle: 'dev',
    badgeText: 'DEV',
    avatar: '/agents/dev.png',
    title: 'Review release candidate',
    subtitle: 'Implementation ready',
    targetPath: '/chat/engineering',
  },
  {
    id: 'att-2',
    agentHandle: 'sci',
    badgeText: 'SCI',
    avatar: '/agents/sci.png',
    title: 'Research results available',
    subtitle: '3 experiments completed',
    targetPath: '/spaces',
  },
  {
    id: 'att-3',
    agentHandle: 'vi',
    badgeText: 'VI',
    avatar: '/agents/vi.png',
    title: 'Investor follow-up',
    subtitle: 'Draft ready for review',
    targetPath: '/chat/dm-vi',
  },
]

export const OFFICE_DESKS: readonly OfficeDeskTile[] = [
  { id: 'd-zach', floor: 'F3', label: 'Zach K.', occupants: ['zach'], toolTag: 'Terminal', statusLine: 'v1.1.0 Release' },
  { id: 'd-pair', floor: 'F3', label: 'Alex R. · @dev', occupants: ['alex', 'dev'], toolTag: 'GitHub', activeRing: 'emerald', statusLine: 'Pairing · PR-412' },
  { id: 'd-sara', floor: 'F2', label: 'Sara C.', occupants: ['sara'], toolTag: 'Science', statusLine: 'Zen 6 Evals' },
  { id: 'd-sci', floor: 'F2', label: '@sci', occupants: ['sci'], toolTag: 'Science', activeRing: 'warm', statusLine: 'Sweep 64%' },
  { id: 'd-vi', floor: 'F4', label: '@vi', occupants: ['vi'], toolTag: 'Linear', statusLine: 'Exec Briefing' },
  { id: 'd-mana', floor: 'F4', label: '@mana', occupants: ['mana'], toolTag: 'Linear', statusLine: 'v8.8 Roadmap' },
  { id: 'd-cyber', floor: 'F3', label: '@cyber', occupants: ['cyber'], toolTag: 'Kai', activeRing: 'warm', statusLine: 'Zero-Trust Gate' },
  { id: 'd-qa', floor: 'F3', label: '@qa', occupants: ['qa'], toolTag: 'Terminal', activeRing: 'subtle', statusLine: 'X11 Pixel Suite' },
  { id: 'd-des', floor: 'F1', label: '@des', occupants: ['des'], toolTag: 'Spotify', statusLine: 'Zen Tokens' },
  { id: 'd-devon', floor: 'F1', label: 'Devon P.', occupants: ['devon'], toolTag: 'GitHub', statusLine: 'Gateway Triage' },
]

export const INITIAL_SPACES: readonly SpaceDeliverable[] = [
  {
    id: 'release-v1-1-0',
    title: 'Hanzo Team v1.1.0 Release Sign-Off',
    authorHandle: 'dev',
    updatedAt: '4m ago',
    version: 'v3',
    summary: '4-column Discord × Mattermost architecture, W3C Linux RGBA 12px outer corners, Multi-Floor Virtual Office & v8.8 Home.',
    metrics: [
      { label: 'Unit Assertions', value: '140 / 140', delta: '+8 new' },
      { label: 'Max File Length', value: '< 700 LOC', delta: '100% compliant' },
      { label: 'Voice RTC Latency', value: '14 ms', delta: '-6 ms p99' },
    ],
    markdown: [
      '## Verification Gates',
      '- [x] @dev Upgrade @hanzo/event to 0.3.73 and verify @hanzo/font Zen + Zen Mono CSS',
      '- [x] @qa Validate 12px curved frameless Linux corners without WEBKIT_DISABLE_COMPOSITING_MODE',
      '- [ ] @cyber Sign production release manifest & push hanzoai/team + hanzo-inc/team',
    ].join('\n'),
  },
  {
    id: 'zen6-eval-report',
    title: 'Zen 6 Router & Enso Evaluation Report',
    authorHandle: 'sci',
    updatedAt: '12m ago',
    version: 'v2',
    summary: 'Benchmark sweep across 412 coding, reasoning, and tool-use tasks comparing static routing vs dynamic Enso dispatch.',
    metrics: [
      { label: 'Pass@1 Accuracy', value: '98.4%', delta: '+2.9%' },
      { label: 'Median TTFT', value: '38 ms', delta: '-19 ms' },
      { label: 'Token Cost / Task', value: '$0.041', delta: '-31%' },
    ],
    markdown: [
      '## Follow-Up Actions',
      '- [x] @sci Export pass@1 latency curves for #research',
      '- [ ] @dev Enable enso-auto default in Power Composer',
    ].join('\n'),
  },
]

export const INITIAL_MEMORY: readonly MemoryNode[] = [
  {
    id: 'mem-1',
    category: 'ADR',
    title: 'ADR-042: Linux WebKitGTK RGBA Curved Frameless Windows',
    ownerHandle: 'dev',
    updatedAt: 'Today · 09:42 AM',
    tags: ['tauri', 'linux', 'webkitgtk', 'chrome'],
    summary: 'Never set WEBKIT_DISABLE_COMPOSITING_MODE=1 (forces opaque X11 backing). Use WEBKIT_DISABLE_DMABUF_RENDERER=1 + transparent html/body + #root border-radius 12px + ::after 1px inner ring.',
  },
  {
    id: 'mem-2',
    category: 'Runbook',
    title: 'SEV-2 Playbook: Transactor WebSocket Reconnect Storm',
    ownerHandle: 'cyber',
    updatedAt: 'Today · 08:45 AM',
    tags: ['sre', 'websocket', 'us-west-2'],
    summary: 'Drain unbalanced edge pod with 15s jittered backoff, verify active huddles remain pinned on SFU relay, confirm p99 < 20ms.',
  },
  {
    id: 'mem-3',
    category: 'Policy',
    title: 'Kai Zero-Trust Outbound MCP Gate Policy',
    ownerHandle: 'cyber',
    updatedAt: 'Yesterday',
    tags: ['security', 'kai', 'mcp'],
    summary: 'All external webhook mutations and production tag pushes require explicit 1-click human authorization in #engineering or Inbox.',
  },
  {
    id: 'mem-4',
    category: 'Session',
    title: 'Cross-Agent Context: v8.8 Intelligent Workplace Unification',
    ownerHandle: 'mana',
    updatedAt: 'Yesterday',
    tags: ['v8.8', 'design', 'workforce'],
    summary: 'Shared context across @vi, @mana, @dev, and @des aligning Home briefing, Discord guild/voice rail, Mattermost Thread RHS, and Roam Virtual HQ.',
  },
]
