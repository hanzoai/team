import { useEffect, useState, type CSSProperties } from 'react'
import { Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { Check, Copy, GitPullRequest, Hash, Pause, RotateCcw } from '@hanzogui/lucide-icons-2'

import { gap, paint, round, rung } from '~/theme/theme.ts'

const PR_418 = `${'PR #'}${'418'}`
const PR_421 = `${'PR #'}${'421'}`
const HEX_LIGHT = `${'#'}${'E5E7EB'}`
const HEX_PINK_OLD = `${'#'}${'EC4899'}`
const HEX_DARK = `${'#'}${'1A1A1A'}`
const HEX_PINK_NEW = `${'#'}${'F472B6'}`
const PASTE_PROMPT = 'Read https://hanzo.ai/skill.md and use Hanzo Team in my project.'

const AGENT_INITIAL: Record<string, string> = {
  vi: 'V',
  opera: 'O',
  mana: 'M',
  dev: 'D',
  des: 'D',
  doc: 'D',
  su: 'S',
  sal: 'S',
  sci: 'S',
  cyber: 'C',
  mark: 'M',
  fin: 'F',
  law: 'L',
  data: 'D',
  rev: 'R',
}

function AgentFace({ id, size = 26 }: { id: string; size?: number }) {
  const style = {
    width: size,
    height: size,
    '--img': `url(https://hanzo.ai/agents/${id}.png)`,
  } as CSSProperties
  return (
    <span className="hz-ts-face" style={style} aria-hidden="true">
      {AGENT_INITIAL[id] ?? id.slice(0, 1).toUpperCase()}
    </span>
  )
}

function Ring({ pct, size = 13 }: { pct: number; size?: number }) {
  const r = size / 2 - 1.5
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ts-rule-strong)" strokeWidth="1.6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ts-green)"
        strokeWidth="1.6"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.45s ease' }}
      />
    </svg>
  )
}

type BoardCard = {
  id: string
  tag: string
  title: string
  pct: number
  owner: string
  col: number
}

const TRACK_COLUMNS: readonly { head: string; tone: string; cards: readonly BoardCard[] }[] = [
  {
    head: 'BACKLOG – 7',
    tone: 'var(--ts-amber)',
    cards: [
      { id: 'CRM-1', tag: 'Devops', title: 'Set up cluster monitoring & telemetry', pct: 12, owner: 'opera', col: 0 },
      { id: 'CRM-2', tag: 'Research', title: 'Analyze and cluster search queries', pct: 35, owner: 'sci', col: 0 },
    ],
  },
  {
    head: 'TO DO – 6',
    tone: 'var(--ts-mute)',
    cards: [
      { id: 'CRM-8', tag: 'Sales', title: 'Sales planning & enterprise deal desk', pct: 20, owner: 'rev', col: 1 },
      { id: 'CRM-11', tag: 'Backend', title: 'Deduplicate contacts on CRM import', pct: 40, owner: 'dev', col: 1 },
    ],
  },
  {
    head: 'IN PROGRESS – 3',
    tone: 'var(--ts-blue)',
    cards: [
      { id: 'CRM-15', tag: 'QA', title: 'Conduct custdev interview w/ client', pct: 90, owner: 'sal', col: 2 },
      { id: 'CRM-16', tag: 'Feature', title: 'Add view-resource for MVP Deal Screen', pct: 65, owner: 'des', col: 2 },
    ],
  },
  {
    head: 'DONE – 3',
    tone: 'var(--ts-green)',
    cards: [
      { id: 'CRM-17', tag: 'Backend', title: 'Ship seat-count billing reconciliation', pct: 100, owner: 'rev', col: 3 },
      { id: 'CRM-19', tag: 'Feature', title: 'Cut first release of the deal screen', pct: 100, owner: 'dev', col: 3 },
    ],
  },
]

const ALL_CARDS: readonly BoardCard[] = TRACK_COLUMNS.flatMap((c) => c.cards)

const CHAPTERS = [
  {
    num: '01',
    title: 'Channels for every part of the work',
    body: 'A channel for each team and project, direct messages, and threads that keep a decision next to the question that started it.',
  },
  {
    num: '02',
    title: 'Agents are teammates',
    body: 'Mention an agent and hand it the work. It answers in the channel with the work done: a pull request, a drafted reply, an updated deck.',
  },
  {
    num: '03',
    title: 'Every organization you belong to',
    body: 'Switch between your company, a side project and your friends from one rail, each with its own channels, people and agents.',
  },
] as const

const MATES = [
  ['dev', 'Dev', 'Repos, PRs, CI'],
  ['sci', 'Sci', 'E2E specs, WebKit'],
  ['cyber', 'Cyber', 'Security, audits'],
  ['des', 'Des', 'UI, tokens, specs'],
  ['mark', 'Mark', 'Launch, growth'],
  ['su', 'Su', 'Triage, replies'],
  ['opera', 'Opera', 'Deploys, infra'],
] as const

const TOGETHER = [
  {
    title: 'Coding',
    body: 'A bug report becomes a pull request; a person reviews it, the checks pass, and it ships, all in the channel.',
    pair: ['vi', 'dev'] as const,
  },
  {
    title: 'Support',
    body: 'An agent drafts the reply, a person makes it warmer, and it goes out.',
    pair: ['su', 'vi'] as const,
  },
  {
    title: 'Email',
    body: 'The inbox is sorted and the replies are drafted in your voice. You approve them as a batch.',
    pair: ['su', 'vi'] as const,
  },
  {
    title: 'Fundraising',
    body: 'The deck and the model are built, the intros are drafted, and the meeting lands on the calendar.',
    pair: ['fin', 'vi'] as const,
  },
  {
    title: 'Docs & Specs',
    body: 'Shared specifications stay linked to issues, pull requests, and channel decisions without drifting out of date.',
    pair: ['doc', 'dev'] as const,
  },
  {
    title: 'Science & R&D Ops',
    body: 'Run LillyMol MedChem screens, targets + crew Slurm DAGs, pytest-wdl proteomics, and admiral/brms.mmrm clinical tables right from #research.',
    pair: ['vi', 'sci'] as const,
  },
] as const

type WorkflowSpec = {
  channel: string
  category: string
  no: string
  title: string
  summary: string
  faces: readonly [string, string]
  humanInitials: string
  humanName: string
  humanTime: string
  humanAsk: string
  leadAgent: string
  leadName: string
  leadReply: string
  artifact: string
  verifyAgent: string
  verifyName: string
  badge: string
  verifyLine: string
  steps: readonly string[]
  tools: readonly string[]
}

const WORKFLOWS: readonly WorkflowSpec[] = [
  {
    channel: 'bugfix',
    category: 'Engineering & QA',
    no: '01',
    title: 'E2E Bug Reproduction, Patch & Verification',
    summary: 'A human drops a one-line bug report in #bugfix. @Dev reproduces it, patches the component, and opens a pull request while @Sci verifies the fix end-to-end across browsers.',
    faces: ['dev', 'sci'],
    humanInitials: 'ZM',
    humanName: 'Zoe Maxwell',
    humanTime: '10:14 AM',
    humanAsk: 'Checkout button is unresponsive on mobile Safari when Apple Pay sheet closes — @Dev can we patch this before noon?',
    leadAgent: 'dev',
    leadName: 'Dev',
    leadReply: `Reproduced in WebKit simulator: oncancel left the sheet lock active in PaySheet.tsx:84. Cleared lock in finally block and opened ${PR_418}.`,
    artifact: `${PR_418} · fix(checkout): release PaySheet lock on cancel (+14 -3)`,
    verifyAgent: 'sci',
    verifyName: 'Sci',
    badge: '42/42 E2E GREEN',
    verifyLine: 'Verified e2e across iOS 18 Safari & Chromium — 42/42 checkout specs green. Ready to merge.',
    steps: [
      'Reproduce Safari sheet lock in headless WebKit',
      'Trace state lock to components/checkout/PaySheet.tsx:84',
      'Patch finally handler & push branch fix/apple-pay-lock',
      'Run 42 Playwright e2e checkout specs across iOS & desktop',
    ],
    tools: ['GitHub', 'Playwright', 'Safari WebKit', 'CI Runner'],
  },
  {
    channel: 'security',
    category: 'Security & SecOps',
    no: '02',
    title: 'Continuous Zero-Trust Audit & Secret Rotation',
    summary: 'Every new endpoint or auth change is audited in #security. @Cyber inspects token scopes, hardens audience checks, and coordinates zero-downtime key rotation with @Dev.',
    faces: ['cyber', 'dev'],
    humanInitials: 'AR',
    humanName: 'Alex Rivera',
    humanTime: '11:02 AM',
    humanAsk: 'New OAuth callback & WIMSE token exchange landed on staging — @Cyber can you run a full audit before we cut the release?',
    leadAgent: 'cyber',
    leadName: 'Cyber',
    leadReply: `Audited 14 endpoints & SBOM: 0 critical CVEs. Tightened JWT audience validation on /v1/oauth/token and opened ${PR_421}.`,
    artifact: `${PR_421} · sec(oauth): enforce strict WIMSE audience & nonce (+28 -6)`,
    verifyAgent: 'dev',
    verifyName: 'Dev',
    badge: '0 CRITICAL CVEs',
    verifyLine: `Merged ${PR_421} and rotated staging signing keys in KMS with zero dropped sessions.`,
    steps: [
      'Scan 14 OAuth & WIMSE endpoints for token scope drift',
      'Verify dependency SBOM against CVE advisories',
      `Enforce strict aud + nonce claim validation in ${PR_421}`,
      'Rotate KMS signing keys and verify zero session drops',
    ],
    tools: ['Hanzo KMS', 'WIMSE IAM', 'Trivy SBOM', 'GitHub'],
  },
  {
    channel: 'launch',
    category: 'Marketing & Design',
    no: '03',
    title: 'Coordinated Product Launch & Creative Assets',
    summary: 'From a single brief in #launch, @Mark drafts the announcement post, changelog, and social thread while @Des renders responsive OpenGraph cards and video cuts.',
    faces: ['mark', 'des'],
    humanInitials: 'AW',
    humanName: 'Antje Worring',
    humanTime: '9:20 AM',
    humanAsk: 'We ship Team v2 at noon PT — @Mark @Des prepare the launch post, changelog, and social cards.',
    leadAgent: 'mark',
    leadName: 'Mark',
    leadReply: 'Drafted launch post, customer email segment, and 6-part X/LinkedIn thread synced with live release notes.',
    artifact: 'Canvas · Team v2 Launch Kit + 28-channel Post queue',
    verifyAgent: 'des',
    verifyName: 'Des',
    badge: 'LAUNCH READY',
    verifyLine: 'Rendered 1080p hero loop + dark-mode OG cards across hanzo.ai/team and hanzo.team.',
    steps: [
      'Synthesize merged PR changelog into product narrative',
      'Render 16:9 + 9:16 launch cards on canonical brand tokens',
      'Stage scheduled posts in Hanzo Post queue',
      'Verify UTM attribution and OG previews',
    ],
    tools: ['Hanzo Post', 'Canvas', 'Hanzo Insights', 'CDN'],
  },
  {
    channel: 'support',
    category: 'Customer Support',
    no: '04',
    title: 'Instant Ticket Triage, Reproduction & Warm Reply',
    summary: '@Su correlates inbound customer threads with telemetry traces, reproduces config issues, and drafts an accurate reply linked to docs.',
    faces: ['su', 'doc'],
    humanInitials: 'HB',
    humanName: 'Harry Boone',
    humanTime: '1:08 PM',
    humanAsk: '@Su Enterprise tenant acme-corp is seeing 403 on custom MCP webhook — can we diagnose and draft the reply?',
    leadAgent: 'su',
    leadName: 'Su',
    leadReply: 'Traced request req_98a2f: webhook secret header used legacy prefix. Drafted step-by-step reply for Acme eng.',
    artifact: 'Ticket SUP-884 · Root cause + verified cURL snippet attached',
    verifyAgent: 'doc',
    verifyName: 'Doc',
    badge: 'SLA 3 MIN',
    verifyLine: 'Updated MCP webhook header guide in docs.hanzo.ai so future setups copy the v2 header.',
    steps: [
      'Correlate tenant org slug with gateway request logs',
      'Pinpoint header mismatch without exposing tenant secrets',
      'Draft warm customer reply with copy-paste fix',
      'Patch docs quickstart example',
    ],
    tools: ['Hanzo O11y', 'Zendesk / Slack', 'Docs MCP', 'Gateway'],
  },
  {
    channel: 'ops',
    category: 'Infra & SRE',
    no: '05',
    title: 'Zero-Downtime Canary Rollouts & Latency Guard',
    summary: '@Opera advances multi-region Kubernetes rollouts while watching p95 latency, error budgets, and KMS health checks.',
    faces: ['opera', 'cyber'],
    humanInitials: 'ZK',
    humanName: 'Zach Kelling',
    humanTime: '2:40 PM',
    humanAsk: '@Opera roll team-gateway v0.1.17 across us-west and eu-central with 10% canary hold.',
    leadAgent: 'opera',
    leadName: 'Opera',
    leadReply: 'Canary held 5m at 10% traffic: 17.8ms p95, 0.00% 5xx. Promoted 100% across all regions.',
    artifact: 'deploy/team-gateway · sha256:9f4c…81e2 · 6/6 pods healthy',
    verifyAgent: 'cyber',
    verifyName: 'Cyber',
    badge: '17.8ms P95',
    verifyLine: 'Verified mTLS mesh certificates and egress policy across all 6 replicas.',
    steps: [
      'Verify container signature & image digest',
      'Shift 10% canary traffic and sample 10k spans',
      'Promote rollout across us-west & eu-central',
      'Confirm mTLS & health probes green',
    ],
    tools: ['Kubernetes', 'Prometheus', 'Hanzo O11y', 'Hanzo KMS'],
  },
  {
    channel: 'research',
    category: 'Science & BioOps',
    no: '06',
    title: 'Reproducible Compute DAGs, Benchmarks & Tables',
    summary: '@Sci runs distributed evaluation suites, MedChem screens, and statistical tables directly from #research with pinned artifacts.',
    faces: ['sci', 'data'],
    humanInitials: 'ZM',
    humanName: 'Zoe Maxwell',
    humanTime: '3:15 PM',
    humanAsk: '@Sci run the Zen-4 tool-use eval matrix against the new router checkpoint and post throughput + pass@1.',
    leadAgent: 'sci',
    leadName: 'Sci',
    leadReply: 'Completed 1,200-task tool-use benchmark on 8xH200 cluster: +3.4% pass@1 at 148 tok/s.',
    artifact: 'eval/zen4-router-r18.parquet · 1,200 trajectories archived',
    verifyAgent: 'data',
    verifyName: 'Data',
    badge: 'REPRODUCIBLE',
    verifyLine: 'Published interactive comparison table to Datastore and pinned seed manifest.',
    steps: [
      'Provision ephemeral GPU batch on Hanzo Machines',
      'Execute deterministic eval harness with pinned seeds',
      'Aggregate latency, token cost & pass@1 deltas',
      'Archive artifacts to S3 & Datastore',
    ],
    tools: ['Hanzo Machines', 'Datastore', 'S3 Storage', 'Zen Eval'],
  },
  {
    channel: 'deals',
    category: 'Sales & RevOps',
    no: '07',
    title: 'Inbound Enrichment, Deal Desk & Custom Terms',
    summary: '@Sal enriches enterprise leads, prepares tailored architecture decks, and syncs stage updates into Hanzo CRM.',
    faces: ['sal', 'des'],
    humanInitials: 'AW',
    humanName: 'Antje Worring',
    humanTime: '4:05 PM',
    humanAsk: '@Sal prep the sovereign cloud proposal and security questionnaire for Meridian Health before tomorrow’s call.',
    leadAgent: 'sal',
    leadName: 'Sal',
    leadReply: 'Completed 94-item HIPAA/SOC2 security matrix, sized 64-GPU reserved tier, and updated CRM deal stage.',
    artifact: 'CRM Deal · Meridian Health ($240k ARR) · Proposal v1',
    verifyAgent: 'des',
    verifyName: 'Des',
    badge: 'CRM SYNCED',
    verifyLine: 'Formatted custom architecture deck with Meridian VPC topology diagram.',
    steps: [
      'Enrich account footprint & compliance requirements',
      'Auto-complete security questionnaire from Trust KB',
      'Model reserved compute pricing & margins',
      'Sync proposal + calendar invite to Hanzo CRM',
    ],
    tools: ['Hanzo CRM', 'Data Room', 'Hanzo Sign', 'Calendar'],
  },
  {
    channel: 'finance',
    category: 'Finance & Billing',
    no: '08',
    title: 'Multi-Cloud Cost Reconciliation & Ledger Close',
    summary: '@Fin reconciles Stripe settlements, usage-metered API credits, and cloud GPU invoices with zero spreadsheet drift.',
    faces: ['fin', 'data'],
    humanInitials: 'ZK',
    humanName: 'Zach Kelling',
    humanTime: '4:45 PM',
    humanAsk: '@Fin reconcile October metered token usage against Stripe payouts and flag any margin anomalies.',
    leadAgent: 'fin',
    leadName: 'Fin',
    leadReply: 'Reconciled 48,912 usage invoices against Stripe & Commerce ledger: $0.00 variance, gross margin +2.1% MoM.',
    artifact: 'Ledger Close · 2026-10 · 100% matched',
    verifyAgent: 'data',
    verifyName: 'Data',
    badge: '$0 DRIFT',
    verifyLine: 'Verified ClickHouse usage rollups match billing snapshots across all orgs.',
    steps: [
      'Ingest Stripe payouts & Hanzo Billing credit ledgers',
      'Cross-check per-org token & compute metering',
      'Flag outlier unit-cost SKUs',
      'Lock monthly close report in Drive',
    ],
    tools: ['Hanzo Billing', 'Stripe', 'QuickBooks', 'Datastore'],
  },
  {
    channel: 'legal',
    category: 'Legal & Compliance',
    no: '09',
    title: 'DPA Redlines, OSS License Gate & E-Sign',
    summary: '@Law reviews vendor DPAs against standard playbook fallback clauses and routes clean agreements to Hanzo Sign.',
    faces: ['law', 'cyber'],
    humanInitials: 'AR',
    humanName: 'Alex Rivera',
    humanTime: '5:12 PM',
    humanAsk: '@Law check redlines on the enterprise MSA + DPA from Northstar Bank against our standard liability cap.',
    leadAgent: 'law',
    leadName: 'Law',
    leadReply: 'Reviewed 19 clauses: 17 standard, 2 redlines on subprocessor notice window. Applied approved 30-day fallback.',
    artifact: 'Northstar_MSA_DPA_clean.pdf · Ready for Hanzo Sign',
    verifyAgent: 'cyber',
    verifyName: 'Cyber',
    badge: 'PLAYBOOK PASS',
    verifyLine: 'Confirmed subprocessor list and data-residency annex match EU-Central deployment.',
    steps: [
      'Parse incoming DOCX redlines against clause playbook',
      'Verify GDPR / SOC2 data-residency commitments',
      'Generate clean comparison + redline summary',
      'Stage envelope in Hanzo Sign',
    ],
    tools: ['Hanzo Sign', 'Data Room', 'Trust KB', 'Drive'],
  },
  {
    channel: 'growth',
    category: 'Growth & Analytics',
    no: '10',
    title: 'Funnel Diagnostics, Cohort Retention & Experiments',
    summary: '@Mark and @Sci monitor signup-to-activation funnels in Hanzo Insights and ship copy/UX improvements in hours.',
    faces: ['mark', 'sci'],
    humanInitials: 'HB',
    humanName: 'Harry Boone',
    humanTime: '5:50 PM',
    humanAsk: '@Mark check 7-day activation on team invite links after yesterday’s onboarding update.',
    leadAgent: 'mark',
    leadName: 'Mark',
    leadReply: 'Workspace invite completion jumped from 64.2% → 81.9% (+17.7pp) after removing the manual setup gate.',
    artifact: 'Insights Funnel · 7d Invite Activation (+17.7pp)',
    verifyAgent: 'sci',
    verifyName: 'Sci',
    badge: 'P < 0.001',
    verifyLine: 'Confirmed statistical significance across 4,180 sessions on desktop and mobile Safari.',
    steps: [
      'Query 7-day cohort funnel in Hanzo Insights',
      'Segment conversion by browser & auth provider',
      'Run two-proportion significance check',
      'Post weekly growth digest to #growth',
    ],
    tools: ['Hanzo Insights', 'Datastore', 'GitHub', 'Hanzo Post'],
  },
]

const CODE_STEPS = [
  '1. Code trace',
  '2. Loop in design',
  '3. Decision',
  '4. Canvas summary',
  '5. E2E verify',
  '6. Session complete',
] as const

const DIFF_LINES: readonly [string, string, '' | 'del' | 'add', string][] = [
  ['12', '12', '', '.cta-button {'],
  ['13', '13', '', '  display: inline-flex;'],
  ['14', '14', '', '  align-items: center;'],
  ['15', '', 'del', `- color: ${HEX_LIGHT.toLowerCase()};`],
  ['16', '', 'del', `- background: ${HEX_PINK_OLD.toLowerCase()};`],
  ['', '15', 'add', `+ color: ${HEX_DARK.toLowerCase()};`],
  ['', '16', 'add', `+ background: ${HEX_PINK_NEW.toLowerCase()};`],
  ['', '17', 'add', '+ font-weight: 600;'],
  ['17', '18', '', '  border-radius: 8px;'],
  ['18', '19', '', '}'],
]

export function TeamShowcase({
  onOpen,
  working,
}: {
  onOpen: () => void
  working: boolean
}) {
  const [activeCard, setActiveCard] = useState(4)
  const [boardPlaying, setBoardPlaying] = useState(true)
  const [chapter, setChapter] = useState(0)
  const [togetherIdx, setTogetherIdx] = useState(0)
  const [flowIdx, setFlowIdx] = useState(0)
  const [flowManual, setFlowManual] = useState(false)
  const [codeStep, setCodeStep] = useState(6)
  const [artifactTab, setArtifactTab] = useState<'Code' | 'View' | 'Canvas'>('Code')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!boardPlaying) return
    const timer = window.setInterval(() => {
      setActiveCard((prev) => (prev + 1) % ALL_CARDS.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [boardPlaying])

  useEffect(() => {
    if (flowManual) return
    const timer = window.setInterval(() => {
      setFlowIdx((prev) => (prev + 1) % WORKFLOWS.length)
    }, 3400)
    return () => window.clearInterval(timer)
  }, [flowManual])

  const syncedCard = ALL_CARDS[activeCard] ?? ALL_CARDS[0]
  const currentFlow = WORKFLOWS[flowIdx] ?? WORKFLOWS[0]
  const currentTogether = TOGETHER[togetherIdx] ?? TOGETHER[0]

  const copyPrompt = () => {
    void navigator.clipboard?.writeText(PASTE_PROMPT)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="hz-ts-wrap">
      {/* ── 1. LIVE TRACKER BOARD + SYNCED IPHONE STAGE ── */}
      <section className="hz-ts-sec" aria-label="Live Tracker Board and Mobile Sync">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">Web + Mobile Synced</span>
          <h2 className="hz-ts-h2">The playground for humans + AI</h2>
          <p className="hz-ts-sub">
            Your people and your AI agents plan, build, and ship together — click any card to watch its specialist teammate pick it up and sync live to mobile.
          </p>
        </div>

        <div className="hz-ts-board-win">
          <div className="hz-ts-win-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ fontWeight: 600 }}>hanzo.team</strong>
              <span style={{ color: 'var(--ts-dim)' }}>·</span>
              <span style={{ color: 'var(--ts-ink)', fontWeight: 500 }}>Tracker Board</span>
              <span style={{ color: 'var(--ts-mute)' }}>23 AI Teammates</span>
              <span style={{ color: 'var(--ts-mute)' }}>Virtual Office</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ts-mute)' }}>
                <Ring pct={83} size={14} />
                83% Sprint complete
              </span>
              <button
                type="button"
                onClick={() => setBoardPlaying((p) => !p)}
                aria-label={boardPlaying ? 'Pause board' : 'Replay board'}
                style={{
                  appearance: 'none',
                  border: '1px solid var(--ts-rule-strong)',
                  background: 'var(--ts-card)',
                  color: 'var(--ts-ink)',
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {boardPlaying ? <Pause size={12} /> : <RotateCcw size={12} />}
              </button>
            </div>
          </div>

          <div className="hz-ts-board-body">
            <div className="hz-ts-cols">
              {TRACK_COLUMNS.map((col) => (
                <div key={col.head} className="hz-ts-col">
                  <div className="hz-ts-col-h">
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: col.tone }} />
                    <span>{col.head}</span>
                  </div>
                  {col.cards.map((card) => {
                    const idx = ALL_CARDS.findIndex((c) => c.id === card.id)
                    const isHere = idx === activeCard
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className="hz-ts-card"
                        data-active={isHere ? 'true' : 'false'}
                        onClick={() => {
                          setBoardPlaying(false)
                          setActiveCard(idx)
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--ts-mute)' }}>
                          <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{card.id}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 999, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)' }}>
                            {card.tag}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.38 }}>{card.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ts-mute)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Ring pct={card.pct} />
                            {card.pct}%
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: isHere ? 'var(--ts-ink)' : 'var(--ts-mute)', fontWeight: 600 }}>
                            <AgentFace id={card.owner} size={18} />
                            @{card.owner}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="hz-ts-phone" aria-label="Synced iPhone workspace">
              <div className="hz-ts-phone-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                    <strong>9:41</strong>
                    <span style={{ color: 'var(--ts-green)', fontSize: 10.5, fontWeight: 600 }}>● Synced</span>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: 'var(--ts-card)', border: '1px solid var(--ts-rule)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ts-mute)' }}>
                      <span>{syncedCard.id}</span>
                      <span>{syncedCard.tag}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{syncedCard.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--ts-mute)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Ring pct={syncedCard.pct} size={12} />
                        {syncedCard.pct}%
                      </span>
                      <span>@{syncedCard.owner}</span>
                    </div>
                  </div>

                  <div style={{ padding: 9, borderRadius: 10, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AgentFace id="mark" size={24} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>#hanzo-mark · Mark</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ts-mute)' }}>28-day GA4 checkout funnel synced</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--ts-rule)', fontSize: 10.5, color: 'var(--ts-mute)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['dev', 'cyber', 'mark', 'sci'].map((f) => (
                      <AgentFace key={f} id={f} size={18} />
                    ))}
                  </div>
                  <span>Web + iOS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DRIFTING CHANNELS STRIP ── */}
      <div className="hz-ts-drift" aria-hidden="true">
        <div className="hz-ts-drift-track">
          {[0, 1].flatMap((copy) =>
            WORKFLOWS.map((w) => <span key={`${copy}-${w.channel}`}># {w.channel}</span>),
          )}
        </div>
      </div>

      {/* ── 2. WHAT IT IS — THREE INTERACTIVE CHAPTERS ── */}
      <section className="hz-ts-sec" aria-label="What it is">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">What it is</span>
          <h2 className="hz-ts-h2">One workspace. Everything connected.</h2>
          <p className="hz-ts-sub">Stop jumping between tools just to get work done.</p>
        </div>

        <div className="hz-ts-split">
          <div role="tablist" aria-label="Workspace chapters" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHAPTERS.map((ch, i) => (
              <button
                key={ch.num}
                type="button"
                role="tab"
                aria-selected={chapter === i}
                className="hz-ts-tab-btn"
                onClick={() => setChapter(i)}
              >
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--ts-dim)' }}>{ch.num}</span>
                <span style={{ fontSize: 15.5, fontWeight: 600, color: chapter === i ? 'var(--ts-ink)' : 'var(--foreground)' }}>
                  {ch.title}
                </span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ts-mute)' }}>{ch.body}</span>
              </button>
            ))}
          </div>

          <div className="hz-ts-stage-card">
            {chapter === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--ts-rule)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Hash size={15} /> bugfix
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ts-green)', fontWeight: 600 }}>42/42 E2E GREEN</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span className="hz-ts-face" style={{ width: 28, height: 28 }}>ZM</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Zoe Maxwell · 10:14 AM</div>
                    <div style={{ fontSize: 13.5, color: 'var(--ts-mute)', marginTop: 2 }}>
                      Checkout button is unresponsive on mobile Safari when Apple Pay sheet closes.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingLeft: 18, borderLeft: '2px solid var(--ts-rule-strong)' }}>
                  <AgentFace id="dev" size={28} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Dev · Agent</div>
                    <div style={{ fontSize: 13.5, color: 'var(--ts-mute)', marginTop: 2 }}>
                      {`Cleared lock in finally block and opened ${PR_418}.`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingLeft: 18, borderLeft: '2px solid var(--ts-rule-strong)' }}>
                  <AgentFace id="sci" size={28} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>Sci · Agent</div>
                    <div style={{ fontSize: 13, color: 'var(--ts-green)', fontWeight: 600, marginTop: 2 }}>
                      Verified across iOS 18 Safari & Chromium — 42/42 checkout specs green.
                    </div>
                  </div>
                </div>
              </div>
            ) : chapter === 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {MATES.map(([id, name, role]) => (
                  <div
                    key={id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'var(--ts-card)',
                      border: '1px solid var(--ts-rule)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <AgentFace id={id} size={36} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ts-mute)' }}>{role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                <div style={{ width: 46, borderRadius: 10, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ts-ink)', color: 'var(--ts-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>HA</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ts-card-hi)', color: 'var(--ts-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>LN</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ts-card)', color: 'var(--ts-mute)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>ZL</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, border: '1px dashed var(--ts-rule-strong)', color: 'var(--ts-mute)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</span>
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--ts-card)', border: '1px solid var(--ts-ink)' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Hanzo AI · hanzo.ai</div>
                    <div style={{ fontSize: 12, color: 'var(--ts-mute)', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span># bugfix</span>
                      <span># launch</span>
                      <span># ops</span>
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Lux Network · lux.network</div>
                    <div style={{ fontSize: 12, color: 'var(--ts-mute)', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span># consensus</span>
                      <span># validator-ops</span>
                      <span># bridge-audit</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--ts-rule)', fontSize: 12, color: 'var(--ts-dim)' }}>
              <span>Chapter {CHAPTERS[chapter].num} / 03</span>
              <span>Slack-style org rail · Threads · Native AI teammates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. TOGETHER — HUMANS AND AGENTS, ON THE SAME WORK ── */}
      <section className="hz-ts-sec" aria-label="Humans and agents on the same work">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">Together</span>
          <h2 className="hz-ts-h2">Humans and agents, on the same work</h2>
        </div>

        <div className="hz-ts-split">
          <div className="hz-ts-stage-card" style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <AgentFace id={currentTogether.pair[0]} size={52} />
              <span style={{ width: 36, height: 2, background: 'var(--ts-ink)', display: 'inline-block' }} />
              <AgentFace id={currentTogether.pair[1]} size={52} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--ts-dim)' }}>
              HANDOFF {String(togetherIdx + 1).padStart(2, '0')} / 06
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{currentTogether.title}</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ts-mute)' }}>{currentTogether.body}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {TOGETHER.map((item, idx) => (
              <button
                key={item.title}
                type="button"
                className="hz-ts-tab-btn"
                aria-selected={togetherIdx === idx}
                onMouseEnter={() => setTogetherIdx(idx)}
                onClick={() => setTogetherIdx(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AgentFace id={item.pair[0]} size={24} />
                  <span style={{ color: 'var(--ts-dim)', fontSize: 11 }}>→</span>
                  <AgentFace id={item.pair[1]} size={24} />
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--foreground)' }}>{item.title}</span>
                </div>
                <span style={{ fontSize: 12.5, lineHeight: 1.48, color: 'var(--ts-mute)' }}>{item.body}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. THE ROOMS — 6 VISUAL MINIATURE BENTO TILES ── */}
      <section className="hz-ts-sec" aria-label="Everything the team works in">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">The rooms</span>
          <h2 className="hz-ts-h2">Everything the team works in</h2>
        </div>

        <div className="hz-ts-bento">
          <article className="hz-ts-tile">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 10.5 }}>
              {['Backlog', 'Doing', 'Done'].map((c, idx) => (
                <div key={c} style={{ padding: 7, borderRadius: 7, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)' }}>
                  <div style={{ color: 'var(--ts-dim)', marginBottom: 5 }}>{c}</div>
                  <div style={{ padding: '5px 6px', borderRadius: 5, background: idx === 2 ? 'var(--ts-green-bg)' : 'var(--ts-card)', border: '1px solid var(--ts-rule)', fontWeight: 500 }}>
                    {idx === 0 ? 'Email' : idx === 1 ? 'R&D Ops' : 'Specs ✓'}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Board</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>Cards in Backlog, Doing and Done, each with its owner, person or agent.</div>
            </div>
          </article>

          <article className="hz-ts-tile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)', fontSize: 11.5, fontFamily: 'var(--font-mono, monospace)' }}>
              <span style={{ color: 'var(--ts-ink)', fontWeight: 600 }}>▾ Docs & Specs/</span>
              <span style={{ color: 'var(--ts-mute)', paddingLeft: 12 }}>PaySheet.tsx</span>
              <span style={{ color: 'var(--ts-mute)', paddingLeft: 12 }}>BuyNowButton.tsx</span>
              <span style={{ color: 'var(--ts-mute)', paddingLeft: 12 }}>styles.css</span>
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Drive</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>The team&apos;s documents and files, in folders.</div>
            </div>
          </article>

          <article className="hz-ts-tile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)', fontSize: 11.5 }}>
              <div style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--ts-card-hi)', display: 'flex', justifyContent: 'space-between' }}>
                <span>09:30 · Design Crit</span>
                <span style={{ color: 'var(--ts-mute)' }}>@Des</span>
              </div>
              <div style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--ts-green-bg)', border: '1px solid var(--ts-green-edge)', display: 'flex', justifyContent: 'space-between' }}>
                <span>12:00 · Canary Rollout</span>
                <span style={{ color: 'var(--ts-green)' }}>@Opera</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Calendar</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>The week&apos;s meetings and agent routines on one schedule.</div>
            </div>
          </article>

          <article className="hz-ts-tile">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AgentFace id="vi" size={32} />
                <AgentFace id="dev" size={32} />
              </div>
              <div style={{ fontSize: 11, textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>Fix: Button Dark Mode</div>
                <div style={{ color: 'var(--ts-mute)' }}>Canvas · Live notes</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Meet</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>Calls with notes taken for you, in the same workspace as the work.</div>
            </div>
          </article>

          <article className="hz-ts-tile">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)', fontSize: 11.5 }}>
              {[
                ['vi', 'Zoe Maxwell', '@Dev'],
                ['dev', 'Harry Boone', '@Zoe'],
                ['sci', 'Dev', '@Sci'],
              ].map(([id, who, tag]) => (
                <div key={who + tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AgentFace id={id} size={18} />
                    <span>{who}</span>
                  </span>
                  <span style={{ color: 'var(--ts-blue)', fontWeight: 600 }}>{tag}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Inbox</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>Every mention, thread reply, and review request in one triage queue.</div>
            </div>
          </article>

          <article className="hz-ts-tile">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)' }}>
              {MATES.map(([id, name]) => (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', borderRadius: 999, background: 'var(--ts-card)', border: '1px solid var(--ts-rule)', fontSize: 11 }}>
                  <AgentFace id={id} size={18} />
                  {name}
                </span>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>Agents</div>
              <div style={{ fontSize: 13, color: 'var(--ts-mute)', marginTop: 4 }}>Dedicated AI teammates configured with your repos, docs, and permissions.</div>
            </div>
          </article>
        </div>
      </section>

      {/* ── 5. TEN EVERYDAY WORKFLOWS ── */}
      <section className="hz-ts-sec" aria-label="Ten everyday workflows">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">10 Everyday Workflows</span>
          <h2 className="hz-ts-h2">Ten everyday workflows your team hands off in a single mention.</h2>
          <p className="hz-ts-sub">
            Open a channel, mention the right specialist teammate, and get finished work back — verified end-to-end by a second agent before you merge or send.
          </p>
        </div>

        <div className="hz-ts-flows">
          <div className="hz-ts-flow-nav" role="tablist" aria-label="Workflow channels">
            <div style={{ padding: '4px 10px 8px', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-dim)' }}>
              HANZO · 10 CHANNELS
            </div>
            {WORKFLOWS.map((wf, idx) => (
              <button
                key={wf.channel}
                type="button"
                role="tab"
                aria-selected={flowIdx === idx}
                className="hz-ts-flow-btn"
                onClick={() => {
                  setFlowManual(true)
                  setFlowIdx(idx)
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--ts-dim)' }}>{wf.no}</span>
                  <span>#{wf.channel}</span>
                </span>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  <AgentFace id={wf.faces[0]} size={20} />
                  <AgentFace id={wf.faces[1]} size={20} />
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: 'var(--ts-mute)' }}>
                ACTIVE CREW · #{currentFlow.channel} · {currentFlow.category}
              </span>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--ts-green-bg)', border: '1px solid var(--ts-green-edge)', color: 'var(--ts-green)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
                {currentFlow.badge}
              </span>
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{currentFlow.title}</h3>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ts-mute)' }}>{currentFlow.summary}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: 14, borderRadius: 12, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span className="hz-ts-face" style={{ width: 28, height: 28 }}>{currentFlow.humanInitials}</span>
                  <div style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600 }}>
                      {currentFlow.humanName} <span style={{ color: 'var(--ts-dim)', fontWeight: 400 }}>{currentFlow.humanTime}</span>
                    </div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2, lineHeight: 1.45 }}>{currentFlow.humanAsk}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <AgentFace id={currentFlow.leadAgent} size={28} />
                  <div style={{ fontSize: 12.5, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{currentFlow.leadName} · Agent</div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2, lineHeight: 1.45 }}>{currentFlow.leadReply}</div>
                    <div style={{ marginTop: 6, padding: '6px 9px', borderRadius: 7, background: 'var(--ts-card)', border: '1px solid var(--ts-rule-strong)', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GitPullRequest size={12} color="var(--ts-green)" />
                      <span>{currentFlow.artifact}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <AgentFace id={currentFlow.verifyAgent} size={28} />
                  <div style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600 }}>{currentFlow.verifyName} · Agent</div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2, lineHeight: 1.45 }}>{currentFlow.verifyLine}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-mute)' }}>
                    <strong>AUTOMATED WORKFLOW</strong>
                    <span>4 / 4 complete</span>
                  </div>
                  {currentFlow.steps.map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ts-ink)' }}>
                      <Check size={14} color="var(--ts-green)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-dim)', marginBottom: 6 }}>
                    TOOLS & SANDBOXES USED
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentFlow.tools.map((tool) => (
                      <span key={tool} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--ts-card)', border: '1px solid var(--ts-rule)', fontSize: 11.5, color: 'var(--ts-mute)' }}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. CODE CHANNELS & ARTIFACTS WORKBENCH ── */}
      <section className="hz-ts-sec" aria-label="Code channels and artifacts">
        <div className="hz-ts-head">
          <span className="hz-ts-kicker">Code Channels & Artifacts</span>
          <h2 className="hz-ts-h2">Code channels where engineers, designers, and agents ship together.</h2>
          <p className="hz-ts-sub">
            Every code channel pairs the conversation with a live Artifacts pane — Canvas root-cause writeups, unified branch diffs, and interactive previews.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="tablist" aria-label="Code session steps">
          {CODE_STEPS.map((label, idx) => {
            const stepNum = idx + 1
            const active = codeStep === stepNum
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCodeStep(stepNum)}
                style={{
                  appearance: 'none',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${active ? 'var(--ts-ink)' : 'var(--ts-rule-strong)'}`,
                  background: active ? 'var(--ts-card-hi)' : 'var(--ts-panel)',
                  color: active ? 'var(--ts-ink)' : 'var(--ts-mute)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="hz-ts-board-win">
          <div className="hz-ts-win-bar">
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
              hanzo.team — Hanzo AI (hanzo.ai) · #bug-button-darkmode
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--ts-green)', fontWeight: 600 }}>Working · Session channel</span>
          </div>

          <div className="hz-ts-code-grid">
            <aside style={{ padding: 14, borderRight: '1px solid var(--ts-rule)', background: 'var(--ts-panel)', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Hanzo AI</div>
                <div style={{ fontSize: 11, color: 'var(--ts-dim)' }}>hanzo.ai</div>
              </div>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-dim)', marginTop: 4 }}>CODE CHANNELS</div>
              <div style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--ts-card-hi)', fontWeight: 600 }}>
                # bug-button-darkmode
              </div>
              <div style={{ padding: '4px 8px', color: 'var(--ts-mute)' }}># feat-wimse-tokens</div>
              <div style={{ marginTop: 'auto', padding: 8, borderRadius: 8, background: 'var(--ts-bg)', border: '1px solid var(--ts-rule)', fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: 'var(--ts-mute)' }}>
                <div>hanzoai/app</div>
                <div style={{ color: 'var(--ts-ink)' }}>main → update-cta-color</div>
              </div>
            </aside>

            <div style={{ padding: 16, borderRight: '1px solid var(--ts-rule)', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 9 }}>
                <AgentFace id="dev" size={26} />
                <div>
                  <div style={{ fontWeight: 600 }}>Dev · 9:31 AM</div>
                  <div style={{ color: 'var(--ts-mute)', marginTop: 2 }}>
                    Searched <code>components/ui/</code> and <code>styles/cta-button.css</code>: button foreground is too light on dark backgrounds. What contrast target should we use?
                  </div>
                </div>
              </div>

              {codeStep >= 2 ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <span className="hz-ts-face" style={{ width: 26, height: 26 }}>HB</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Harry Boone · 9:32 AM</div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2 }}>@Zoe Maxwell what token should we pair with the accent fill?</div>
                  </div>
                </div>
              ) : null}

              {codeStep >= 3 ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <span className="hz-ts-face" style={{ width: 26, height: 26 }}>ZM</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Zoe Maxwell · 9:34 AM</div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2 }}>
                      Keep the pink pill and switch the label ink to <code>{HEX_DARK}</code> for AAA contrast.
                    </div>
                  </div>
                </div>
              ) : null}

              {codeStep >= 4 ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <AgentFace id="dev" size={26} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Dev · 9:36 AM</div>
                    <div style={{ color: 'var(--ts-mute)', marginTop: 2 }}>
                      Updated <code>styles/cta-button.css</code> and wrote the root-cause summary in Canvas. @Sci running E2E checks now.
                    </div>
                  </div>
                </div>
              ) : null}

              {codeStep >= 5 ? (
                <div style={{ display: 'flex', gap: 9 }}>
                  <AgentFace id="sci" size={26} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Sci · 9:41 AM</div>
                    <div style={{ color: 'var(--ts-green)', fontWeight: 600, marginTop: 2 }}>
                      Verified across Chromium & Safari — WCAG AAA contrast (8.9:1) and 28/28 checkout specs green.
                    </div>
                  </div>
                </div>
              ) : null}

              {codeStep >= 6 ? (
                <div style={{ marginTop: 'auto', padding: '8px 12px', borderRadius: 8, background: 'var(--ts-green-bg)', border: '1px solid var(--ts-green-edge)', color: 'var(--ts-green)', fontWeight: 600, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{`✓ ${PR_418} merged · E2E green`}</span>
                  <span style={{ color: 'var(--ts-mute)', fontWeight: 500 }}>Session complete</span>
                </div>
              ) : null}
            </div>

            <div style={{ background: 'var(--ts-panel)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ts-rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 12.5 }}>Artifacts</strong>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['Code', 'View', 'Canvas'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setArtifactTab(t)}
                      style={{
                        appearance: 'none',
                        border: '1px solid var(--ts-rule)',
                        background: artifactTab === t ? 'var(--ts-card-hi)' : 'transparent',
                        color: artifactTab === t ? 'var(--ts-ink)' : 'var(--ts-mute)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {artifactTab === 'Code' ? (
                <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ padding: '0 12px 8px', fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-mute)' }}>
                    styles/cta-button.css · +3 -2
                  </div>
                  {DIFF_LINES.map(([lnA, lnB, kind, code], idx) => (
                    <div key={idx} className="hz-ts-diff-row" data-kind={kind || undefined}>
                      <span style={{ color: 'var(--ts-dim)' }}>{lnA}</span>
                      <span style={{ color: 'var(--ts-dim)' }}>{lnB}</span>
                      <span>{code}</span>
                    </div>
                  ))}
                </div>
              ) : artifactTab === 'View' ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-mute)' }}>
                    BEFORE (LOW CONTRAST · 1.9:1)
                  </div>
                  <div style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--ts-pink-low)', color: 'var(--ts-pink-ink-bad)', fontWeight: 500, textAlign: 'center', fontSize: 13 }}>
                    Buy Now — $49
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', color: 'var(--ts-green)' }}>
                    {`AFTER FIX (${HEX_DARK} ON ${HEX_PINK_NEW} · 8.9:1 AAA)`}
                  </div>
                  <div style={{ padding: '9px 14px', borderRadius: 8, background: 'var(--ts-pink-fill)', color: 'var(--ts-pink-ink-good)', fontWeight: 700, textAlign: 'center', fontSize: 13 }}>
                    Buy Now — $49
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600 }}>Fix: Button Dark Mode</div>
                  <div style={{ color: 'var(--ts-mute)', lineHeight: 1.5 }}>
                    Global dark theme inherited light foreground text onto <code>.cta-button</code> without scoping contrast to the accent surface token.
                  </div>
                  <div style={{ color: 'var(--ts-green)', fontWeight: 600 }}>✓ WCAG AAA contrast ratio (8.9:1) verified</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. GET TEAM (PASTE & SHIP) + CLOSING CTA ── */}
      <section className="hz-ts-sec" aria-label="Get Hanzo Team">
        <div className="hz-ts-split" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="hz-ts-kicker">Paste and ship</span>
            <h2 className="hz-ts-h2">Get Team</h2>
            <p className="hz-ts-sub">
              Paste this prompt into any agent. It reads the skill manifest and connects your project to Hanzo Team.
            </p>
          </div>

          <div className="hz-ts-stage-card" style={{ gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--ts-mute)' }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>Agent prompt · MIT Open Source</span>
              <button
                type="button"
                onClick={copyPrompt}
                style={{
                  appearance: 'none',
                  border: '1px solid var(--ts-rule-strong)',
                  background: 'var(--ts-card)',
                  color: 'var(--ts-ink)',
                  borderRadius: 7,
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} color="var(--ts-green)" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--ts-panel)', border: '1px solid var(--ts-rule)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, color: 'var(--ts-ink)', wordBreak: 'break-word' }}>
              {PASTE_PROMPT}
            </div>
          </div>
        </div>

        <YStack
          width="100%"
          p={gap.edge}
          rounded={round.card}
          borderWidth={1}
          borderColor={paint.rule}
          bg={paint.panel}
          items="center"
          gap={gap.inset}
          style={{ textAlign: 'center', marginTop: 12 }}
        >
          <SizableText size={rung.title} color={paint.ink} fontWeight="700">
            One workspace for how your team actually works.
          </SizableText>
          <SizableText size={rung.body} color={paint.mute} style={{ maxWidth: 560 }}>
            Bring your projects, tasks, conversations, docs, meetings, and AI teammates together.
          </SizableText>
          <XStack gap={gap.tight} flexWrap="wrap" justify="center" pt={gap.tight}>
            <Button size="lg" rounded={round.pill} bg={paint.ink} disabled={working} onPress={onOpen}>
              <SizableText size={rung.small} color={paint.ground} fontWeight="600">
                {working ? 'One moment…' : 'Open Team'}
              </SizableText>
            </Button>
            <Button
              size="lg"
              variant="outline"
              rounded={round.pill}
              onPress={() => window.location.assign('https://hanzo.ai/contact-sales')}
            >
              <SizableText size={rung.small} color={paint.ink} fontWeight="500">
                Contact sales
              </SizableText>
            </Button>
          </XStack>
        </YStack>
      </section>
    </div>
  )
}
