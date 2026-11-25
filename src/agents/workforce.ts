/**
 * Hanzo AI Specialist Workforce & Opt-In Presence Registry.
 *
 * Provides deterministic, event-driven state for all specialist AI desks across
 * the 6 Virtual HQ departments, plus opt-in human presence (zero surveillance).
 */
import { useSyncExternalStore } from 'react'

export type DepartmentId =
  | 'engineering'
  | 'research'
  | 'design'
  | 'security'
  | 'growth'
  | 'executive'

export interface DepartmentSpec {
  id: DepartmentId
  label: string
  roomCode: string
  summary: string
}

export const DEPARTMENTS: readonly DepartmentSpec[] = [
  { id: 'engineering', label: 'Engineering', roomCode: 'HQ-E1', summary: 'Runtime, systems, storage, QA & docs' },
  { id: 'research', label: 'Research & Science', roomCode: 'HQ-R2', summary: 'Zen 6 models, routing & evals' },
  { id: 'design', label: 'Design & Product', roomCode: 'HQ-D3', summary: 'Zen desktop UX, specs & brand media' },
  { id: 'security', label: 'Security & Ops', roomCode: 'HQ-S4', summary: 'Zero-trust Kai gates, IAM/KMS & infra' },
  { id: 'growth', label: 'Growth & GTM', roomCode: 'HQ-G5', summary: 'Enterprise pipeline, launches & billing' },
  { id: 'executive', label: 'Executive & Legal', roomCode: 'HQ-X6', summary: 'Chief of staff, treasury & compliance' },
] as const

export type AgentExecutionState = 'idle' | 'executing' | 'awaiting_approval' | 'in_meeting'

export interface AgentToolTrace {
  id: string
  tool: string
  summary: string
  durationMs: number
  status: 'ok' | 'gated' | 'running'
  at: string
}

export type AgentToolBadge = 'GitHub' | 'Terminal' | 'Linear' | 'Docs' | 'Science' | 'Kai'

export interface SpecialistAgent {
  handle: string
  name: string
  role: string
  department: DepartmentId
  toolBadge?: AgentToolBadge
  model: 'zen6-coder' | 'zen6-ultra' | 'enso-auto'
  state: AgentExecutionState
  currentAssignment: string
  progress: number
  activeRuns: number
  tasksToday: number
  costUsd: number
  latestDeliverable: { title: string; path: string }
  meetingRoom?: string
  trace: readonly AgentToolTrace[]
}

export type HumanAvailability = 'online' | 'focus' | 'in_meeting'

export interface HumanPresencePrefs {
  availability: HumanAvailability
  shareActivity: boolean
  statusNote: string
}

const INITIAL_AGENTS: readonly SpecialistAgent[] = [
  {
    handle: 'dev',
    name: 'Hanzo Dev',
    role: 'Full-Stack & Systems Engineer',
    department: 'engineering',
    model: 'zen6-coder',
    state: 'executing',
    currentAssignment: 'Ship Virtual HQ Spatial Floor Plan & Executable Checkboxes',
    progress: 78,
    activeRuns: 2,
    tasksToday: 14,
    costUsd: 1.42,
    latestDeliverable: { title: 'Virtual HQ Spec & Implementation', path: '/spaces/eng-virtual-hq' },
    trace: [
      { id: 't1', tool: 'mcp.git.diff', summary: 'Inspected 12 modified modules in @hanzo/team', durationMs: 140, status: 'ok', at: '2m ago' },
      { id: 't2', tool: 'mcp.test.run', summary: '130/130 unit assertions passing (0 regressions)', durationMs: 560, status: 'ok', at: '1m ago' },
      { id: 't3', tool: 'mcp.spaces.publish', summary: 'Streaming diff to Space v3', durationMs: 90, status: 'running', at: 'now' },
    ],
  },
  {
    handle: 'core',
    name: 'Hanzo Core',
    role: 'Runtime & Distributed Systems',
    department: 'engineering',
    model: 'zen6-coder',
    state: 'idle',
    currentAssignment: 'Standby · Event-driven on github.pull_request.opened',
    progress: 100,
    activeRuns: 0,
    tasksToday: 7,
    costUsd: 0.64,
    latestDeliverable: { title: 'Transactor Socket Pool Benchmark', path: '/spaces/zen6-eval-report' },
    trace: [
      { id: 'c1', tool: 'mcp.cargo.check', summary: 'Verified zero warnings on Tauri Linux build', durationMs: 420, status: 'ok', at: '18m ago' },
    ],
  },
  {
    handle: 'db',
    name: 'Hanzo DB',
    role: 'SQL, Vector & Migration Specialist',
    department: 'engineering',
    model: 'zen6-coder',
    state: 'idle',
    currentAssignment: 'Standby · Event-driven on schema migrations',
    progress: 100,
    activeRuns: 0,
    tasksToday: 5,
    costUsd: 0.38,
    latestDeliverable: { title: 'Zero-Downtime Index Audit', path: '/issues' },
    trace: [
      { id: 'd1', tool: 'mcp.postgres.explain', summary: 'Validated index scan < 1.8ms p99', durationMs: 85, status: 'ok', at: '41m ago' },
    ],
  },
  {
    handle: 'qa',
    name: 'Hanzo QA',
    role: 'Verification, E2E & Regression',
    department: 'engineering',
    model: 'zen6-coder',
    state: 'awaiting_approval',
    currentAssignment: 'Approve v1.1.0 Release Gate & X11 Desktop Verification',
    progress: 92,
    activeRuns: 1,
    tasksToday: 19,
    costUsd: 0.91,
    latestDeliverable: { title: 'v1.1.0 Release Sign-Off Checklist', path: '/spaces/release-v1-1-0' },
    trace: [
      { id: 'q1', tool: 'mcp.playwright.verify', summary: 'Verified Dark + Light theme token contrast', durationMs: 810, status: 'ok', at: '6m ago' },
      { id: 'q2', tool: 'kai.policy.gate', summary: 'Awaiting human sign-off on production tag v1.1.0', durationMs: 12, status: 'gated', at: '4m ago' },
    ],
  },
  {
    handle: 'doc',
    name: 'Hanzo Doc',
    role: 'Technical Documentation & Runbooks',
    department: 'engineering',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Syncing Space deliverables to Org Memory',
    progress: 100,
    activeRuns: 0,
    tasksToday: 6,
    costUsd: 0.22,
    latestDeliverable: { title: 'Org Memory Runbook Index', path: '/memory' },
    trace: [
      { id: 'doc1', tool: 'mcp.memory.index', summary: 'Indexed 5 procedural runbooks', durationMs: 110, status: 'ok', at: '32m ago' },
    ],
  },
  {
    handle: 'sci',
    name: 'Hanzo Sci',
    role: 'ML Research & Evaluation',
    department: 'research',
    model: 'zen6-ultra',
    state: 'executing',
    currentAssignment: 'Zen 6 Router Throughput & Accuracy Benchmark Sweep',
    progress: 64,
    activeRuns: 1,
    tasksToday: 9,
    costUsd: 2.15,
    latestDeliverable: { title: 'Zen 6 Router & Enso Evaluation Report', path: '/spaces/zen6-eval-report' },
    trace: [
      { id: 's1', tool: 'mcp.eval.harness', summary: '98.4% pass@1 across 412 regression suites', durationMs: 1240, status: 'ok', at: '3m ago' },
      { id: 's2', tool: 'mcp.spaces.chart', summary: 'Updating latency vs throughput comparison table', durationMs: 195, status: 'running', at: 'now' },
    ],
  },
  {
    handle: 'algo',
    name: 'Hanzo Algo',
    role: 'Routing, Inference & Scheduling',
    department: 'research',
    model: 'zen6-ultra',
    state: 'idle',
    currentAssignment: 'Standby · Event-driven on science.experiment.completed',
    progress: 100,
    activeRuns: 0,
    tasksToday: 4,
    costUsd: 0.57,
    latestDeliverable: { title: 'Speculative Decoding Prefix Cache', path: '/spaces/zen6-eval-report' },
    trace: [
      { id: 'a1', tool: 'mcp.bench.latency', summary: 'Measured p95 TTFT 38ms on local node', durationMs: 310, status: 'ok', at: '1h ago' },
    ],
  },
  {
    handle: 'data',
    name: 'Hanzo Data',
    role: 'Telemetry, Analytics & Pipelines',
    department: 'research',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Aggregating daily org token & ROI telemetry',
    progress: 100,
    activeRuns: 0,
    tasksToday: 8,
    costUsd: 0.44,
    latestDeliverable: { title: 'HQ Operational SLO & Cost Dashboard', path: '/spaces/ops-slo-dashboard' },
    trace: [
      { id: 'da1', tool: 'mcp.clickhouse.query', summary: 'Computed 7-day Autopilot ROI savings', durationMs: 145, status: 'ok', at: '24m ago' },
    ],
  },
  {
    handle: 'des',
    name: 'Hanzo Design',
    role: 'Zen Unified Desktop UX & Tokens',
    department: 'design',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Enforcing Zen monochrome surface hierarchy',
    progress: 100,
    activeRuns: 0,
    tasksToday: 6,
    costUsd: 0.35,
    latestDeliverable: { title: 'Virtual HQ Spec & Implementation', path: '/spaces/eng-virtual-hq' },
    trace: [
      { id: 'de1', tool: 'mcp.tokens.audit', summary: 'Verified 0 literal hex overrides outside tokens.css', durationMs: 68, status: 'ok', at: '15m ago' },
    ],
  },
  {
    handle: 'mana',
    name: 'Hanzo Mana',
    role: 'Product Coordination & Specs',
    department: 'design',
    model: 'enso-auto',
    state: 'in_meeting',
    currentAssignment: 'Facilitating Product Sync · Live action extraction',
    progress: 50,
    activeRuns: 1,
    tasksToday: 11,
    costUsd: 0.52,
    meetingRoom: 'product-sync',
    latestDeliverable: { title: 'Q4 Virtual HQ Roadmap & Triage', path: '/meet/product-sync' },
    trace: [
      { id: 'm1', tool: 'koe.transcribe.stream', summary: 'Capturing speaker-attributed decisions in Product Sync', durationMs: 55, status: 'running', at: 'now' },
    ],
  },
  {
    handle: 'art',
    name: 'Hanzo Art',
    role: 'Visual Assets & Product Diagrams',
    department: 'design',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Ready for architectural diagrams & assets',
    progress: 100,
    activeRuns: 0,
    tasksToday: 3,
    costUsd: 0.19,
    latestDeliverable: { title: 'Obsidian Glass Squircle Asset Audit', path: '/spaces/eng-virtual-hq' },
    trace: [],
  },
  {
    handle: 'cyber',
    name: 'Hanzo Cyber',
    role: 'Zero-Trust Kai Gates & SecOps',
    department: 'security',
    model: 'zen6-ultra',
    state: 'awaiting_approval',
    currentAssignment: 'Approve Kai Outbound Webhook Policy for Commerce MCP',
    progress: 85,
    activeRuns: 1,
    tasksToday: 12,
    costUsd: 0.79,
    latestDeliverable: { title: 'Kai Zero-Trust MCP Policy Gate', path: '/autopilot' },
    trace: [
      { id: 'cy1', tool: 'kai.policy.inspect', summary: 'Flagged external webhook scope on commerce.invoice.overdue', durationMs: 42, status: 'gated', at: '9m ago' },
    ],
  },
  {
    handle: 'sec',
    name: 'Hanzo Sec',
    role: 'IAM, KMS & Dependency Audits',
    department: 'security',
    model: 'zen6-coder',
    state: 'idle',
    currentAssignment: 'Standby · Event-driven on security.incident.detected',
    progress: 100,
    activeRuns: 0,
    tasksToday: 5,
    costUsd: 0.31,
    latestDeliverable: { title: 'KMS Secret Rotation Verification', path: '/memory' },
    trace: [],
  },
  {
    handle: 'opera',
    name: 'Hanzo Opera',
    role: 'Cloud Kubernetes, Edge & SRE',
    department: 'security',
    model: 'zen6-coder',
    state: 'executing',
    currentAssignment: 'Verifying hanzo.team CDN edge rollout & 99.98% SLO',
    progress: 71,
    activeRuns: 1,
    tasksToday: 10,
    costUsd: 0.68,
    latestDeliverable: { title: 'HQ Operational SLO & Cost Dashboard', path: '/spaces/ops-slo-dashboard' },
    trace: [
      { id: 'op1', tool: 'mcp.k8s.rollout', summary: 'Checked multi-region health probes (0 errors)', durationMs: 220, status: 'ok', at: '2m ago' },
    ],
  },
  {
    handle: 'mark',
    name: 'Hanzo Mark',
    role: 'Product Launches & Release Notes',
    department: 'growth',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Drafted v1.1.0 Command Center launch changelog',
    progress: 100,
    activeRuns: 0,
    tasksToday: 4,
    costUsd: 0.28,
    latestDeliverable: { title: 'v1.1.0 Release Sign-Off Checklist', path: '/spaces/release-v1-1-0' },
    trace: [],
  },
  {
    handle: 'sal',
    name: 'Hanzo Sales',
    role: 'Enterprise Accounts & CRM Sync',
    department: 'growth',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Synced 8 enterprise accounts in CRM',
    progress: 100,
    activeRuns: 0,
    tasksToday: 7,
    costUsd: 0.33,
    latestDeliverable: { title: 'Enterprise Pipeline CRM', path: '/crm' },
    trace: [],
  },
  {
    handle: 'rev',
    name: 'Hanzo Rev',
    role: 'Billing, Subscriptions & Invoices',
    department: 'growth',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Event-driven on commerce.invoice.overdue',
    progress: 100,
    activeRuns: 0,
    tasksToday: 5,
    costUsd: 0.25,
    latestDeliverable: { title: 'Autopilot Invoice Reconciliation Pilot', path: '/autopilot' },
    trace: [],
  },
  {
    handle: 'vi',
    name: 'Hanzo Vi',
    role: 'Executive Chief of Staff',
    department: 'executive',
    model: 'zen6-ultra',
    state: 'in_meeting',
    currentAssignment: 'Synthesizing daily org briefing & attention priorities',
    progress: 60,
    activeRuns: 1,
    tasksToday: 13,
    costUsd: 0.88,
    meetingRoom: 'product-sync',
    latestDeliverable: { title: 'Daily Executive HQ Briefing', path: '/inbox' },
    trace: [
      { id: 'v1', tool: 'mcp.org.digest', summary: 'Compiled 2 pending approvals & 3 active agent runs', durationMs: 95, status: 'ok', at: '5m ago' },
    ],
  },
  {
    handle: 'fin',
    name: 'Hanzo Fin',
    role: 'Treasury, Compute Budgets & ROI',
    department: 'executive',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Enforcing monthly MCP subscription caps',
    progress: 100,
    activeRuns: 0,
    tasksToday: 4,
    costUsd: 0.18,
    latestDeliverable: { title: 'HQ Operational SLO & Cost Dashboard', path: '/spaces/ops-slo-dashboard' },
    trace: [],
  },
  {
    handle: 'law',
    name: 'Hanzo Law',
    role: 'Contracts, DPA & Privacy Policy',
    department: 'executive',
    toolBadge: 'Docs',
    model: 'zen6-ultra',
    state: 'idle',
    currentAssignment: 'Standby · Verified consent-gated Meet recording policy',
    progress: 100,
    activeRuns: 0,
    tasksToday: 2,
    costUsd: 0.21,
    latestDeliverable: { title: 'Zero-Surveillance Presence Policy', path: '/memory' },
    trace: [],
  },
  {
    handle: 'huma',
    name: 'Hanzo Huma',
    role: 'People, Talent & Onboarding',
    department: 'executive',
    toolBadge: 'Docs',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Onboarding playbooks & org directory synced',
    progress: 100,
    activeRuns: 0,
    tasksToday: 3,
    costUsd: 0.14,
    latestDeliverable: { title: 'Hybrid Human + AI Onboarding Guide', path: '/memory' },
    trace: [],
  },
  {
    handle: 'com',
    name: 'Hanzo Com',
    role: 'Internal & External Communications',
    department: 'growth',
    toolBadge: 'Docs',
    model: 'enso-auto',
    state: 'idle',
    currentAssignment: 'Standby · Executive weekly update drafted',
    progress: 100,
    activeRuns: 0,
    tasksToday: 5,
    costUsd: 0.19,
    latestDeliverable: { title: 'Weekly Organization Digest', path: '/inbox' },
    trace: [],
  },
  {
    handle: 'su',
    name: 'Hanzo Support',
    role: 'Customer Escalations & Triage',
    department: 'growth',
    toolBadge: 'Linear',
    model: 'enso-auto',
    state: 'executing',
    currentAssignment: 'Triaging enterprise SLA tickets & routing repros to @qa',
    progress: 82,
    activeRuns: 1,
    tasksToday: 16,
    costUsd: 0.47,
    latestDeliverable: { title: 'Enterprise Support SLA Report', path: '/issues' },
    trace: [],
  },
  {
    handle: 'biz',
    name: 'Hanzo Biz',
    role: 'Corporate Strategy & Partnerships',
    department: 'executive',
    toolBadge: 'Docs',
    model: 'zen6-ultra',
    state: 'idle',
    currentAssignment: 'Standby · Q4 ecosystem partnership brief',
    progress: 100,
    activeRuns: 0,
    tasksToday: 3,
    costUsd: 0.26,
    latestDeliverable: { title: 'Strategic Partner Pipeline', path: '/crm' },
    trace: [],
  },
]

const AGENTS_KEY = 'hanzo.team.workforce.v1'
const PRESENCE_KEY = 'hanzo.team.presence.v1'

type Listener = () => void
const listeners = new Set<Listener>()

function loadAgents(): SpecialistAgent[] {
  if (typeof window === 'undefined' || !window.localStorage) return [...INITIAL_AGENTS]
  try {
    const raw = window.localStorage.getItem(AGENTS_KEY)
    if (!raw) return [...INITIAL_AGENTS]
    const parsed = JSON.parse(raw) as SpecialistAgent[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [...INITIAL_AGENTS]
    const byHandle = new Map(parsed.map((a) => [a.handle, a]))
    return INITIAL_AGENTS.map((seed) => byHandle.get(seed.handle) ?? seed)
  } catch {
    return [...INITIAL_AGENTS]
  }
}

function loadPresence(): HumanPresencePrefs {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { availability: 'online', shareActivity: true, statusNote: 'Building in HQ' }
  }
  try {
    const raw = window.localStorage.getItem(PRESENCE_KEY)
    if (!raw) return { availability: 'online', shareActivity: true, statusNote: 'Building in HQ' }
    const p = JSON.parse(raw) as Partial<HumanPresencePrefs>
    return {
      availability: p.availability === 'focus' || p.availability === 'in_meeting' ? p.availability : 'online',
      shareActivity: p.shareActivity !== false,
      statusNote: typeof p.statusNote === 'string' ? p.statusNote : 'Building in HQ',
    }
  } catch {
    return { availability: 'online', shareActivity: true, statusNote: 'Building in HQ' }
  }
}

let agentsState: SpecialistAgent[] = loadAgents()
let presenceState: HumanPresencePrefs = loadPresence()

function notify(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(AGENTS_KEY, JSON.stringify(agentsState))
      window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(presenceState))
    } catch {
      // ignore storage quota errors
    }
  }
  for (const fn of listeners) fn()
}

export function subscribeWorkforce(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWorkforceAgents(): readonly SpecialistAgent[] {
  return agentsState
}

export function getAgentByHandle(handle: string): SpecialistAgent | undefined {
  const clean = handle.trim().replace(/^@+/, '').toLowerCase()
  return agentsState.find((a) => a.handle === clean)
}

export function getHumanPresence(): HumanPresencePrefs {
  return presenceState
}

export function setHumanPresence(patch: Partial<HumanPresencePrefs>): HumanPresencePrefs {
  presenceState = { ...presenceState, ...patch }
  notify()
  return presenceState
}

export function assignToAgent(handle: string, taskTitle: string, deliverablePath?: string): SpecialistAgent | null {
  const clean = handle.trim().replace(/^@+/, '').toLowerCase()
  const cleanTitle = taskTitle.trim()
  if (!clean || !cleanTitle) return null
  let updated: SpecialistAgent | null = null
  agentsState = agentsState.map((agent) => {
    if (agent.handle !== clean) return agent
    const traceEntry: AgentToolTrace = {
      id: `tr-${Date.now()}`,
      tool: 'mcp.work.accept',
      summary: `Accepted assignment: ${cleanTitle}`,
      durationMs: 28,
      status: 'running',
      at: 'just now',
    }
    updated = {
      ...agent,
      state: 'executing',
      currentAssignment: cleanTitle,
      progress: 18,
      activeRuns: Math.max(1, agent.activeRuns + 1),
      tasksToday: agent.tasksToday + 1,
      costUsd: Number((agent.costUsd + 0.06).toFixed(2)),
      latestDeliverable: deliverablePath
        ? { title: cleanTitle, path: deliverablePath }
        : agent.latestDeliverable,
      trace: [traceEntry, ...agent.trace].slice(0, 8),
    }
    return updated
  })
  if (updated) notify()
  return updated
}

export function interruptAgent(handle: string): SpecialistAgent | null {
  const clean = handle.trim().replace(/^@+/, '').toLowerCase()
  let updated: SpecialistAgent | null = null
  agentsState = agentsState.map((agent) => {
    if (agent.handle !== clean) return agent
    updated = {
      ...agent,
      state: 'idle',
      currentAssignment: `Paused · Event-driven standby`,
      activeRuns: 0,
      progress: 100,
      trace: [
        {
          id: `tr-${Date.now()}`,
          tool: 'kai.run.interrupt',
          summary: 'Execution paused by human operator; returned to zero-polling standby',
          durationMs: 11,
          status: 'ok' as const,
          at: 'just now',
        },
        ...agent.trace,
      ].slice(0, 8),
    }
    return updated
  })
  if (updated) notify()
  return updated
}

export function approveAgentTask(handle: string): SpecialistAgent | null {
  const clean = handle.trim().replace(/^@+/, '').toLowerCase()
  let updated: SpecialistAgent | null = null
  agentsState = agentsState.map((agent) => {
    if (agent.handle !== clean) return agent
    updated = {
      ...agent,
      state: 'idle',
      progress: 100,
      activeRuns: 0,
      currentAssignment: `Completed · ${agent.currentAssignment.replace(/^Approve\s+/i, '')}`,
      trace: [
        {
          id: `tr-${Date.now()}`,
          tool: 'kai.policy.approved',
          summary: 'Approved by human reviewer · Deliverable verified',
          durationMs: 15,
          status: 'ok' as const,
          at: 'just now',
        },
        ...agent.trace,
      ].slice(0, 8),
    }
    return updated
  })
  if (updated) notify()
  return updated
}

export function resetWorkforceStore(): void {
  agentsState = [...INITIAL_AGENTS]
  presenceState = { availability: 'online', shareActivity: true, statusNote: 'Building in HQ' }
  notify()
}

export function agentStateLabel(state: AgentExecutionState): string {
  switch (state) {
    case 'executing':
      return 'Executing assigned task'
    case 'awaiting_approval':
      return 'Awaiting approval'
    case 'in_meeting':
      return 'In live meeting'
    default:
      return 'Idle · Event-driven'
  }
}

export function useWorkforceAgents(): readonly SpecialistAgent[] {
  return useSyncExternalStore(subscribeWorkforce, getWorkforceAgents, getWorkforceAgents)
}

export function useHumanPresence(): HumanPresencePrefs {
  return useSyncExternalStore(subscribeWorkforce, getHumanPresence, getHumanPresence)
}
