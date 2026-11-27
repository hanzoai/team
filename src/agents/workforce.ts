/**
 * Hanzo AI Specialist Workforce & Opt-In Presence Registry.
 *
 * Hydrated exclusively from the live `/v1/agents` and `/v1/bot/members`
 * backends — zero static mock roster entries.
 */
import { useSyncExternalStore } from 'react'

import {
  createCloudAgent,
  deleteCloudAgent,
  listBotMembers,
  listCloudAgents,
  runCloudAgent,
  type BotMemberDto,
  type CloudAgentDto,
  type CreateAgentInput,
} from '../data/agents.ts'

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
  { id: 'research', label: 'Research & Science', roomCode: 'HQ-R2', summary: 'Models, routing & evals' },
  { id: 'design', label: 'Design & Product', roomCode: 'HQ-D3', summary: 'UX, specs & brand media' },
  { id: 'security', label: 'Security & Ops', roomCode: 'HQ-S4', summary: 'Zero-trust gates, IAM/KMS & infra' },
  { id: 'growth', label: 'Growth & GTM', roomCode: 'HQ-G5', summary: 'Pipeline, launches & billing' },
  { id: 'executive', label: 'Executive & Legal', roomCode: 'HQ-X6', summary: 'Operations, treasury & compliance' },
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
  id: string
  userId?: string
  personRef?: string
  handle: string
  name: string
  role: string
  department: DepartmentId
  toolBadge?: AgentToolBadge
  model: string
  status: string
  executionMode?: string
  schedule?: string
  avatar?: string
  emoji?: string
  state: AgentExecutionState
  currentAssignment: string
  progress: number
  activeRuns: number
  tasksToday: number
  costUsd: number
  latestDeliverable?: { title: string; path: string }
  meetingRoom?: string
  trace: readonly AgentToolTrace[]
}

export type HumanAvailability = 'online' | 'focus' | 'in_meeting'

export interface HumanPresencePrefs {
  availability: HumanAvailability
  shareActivity: boolean
  statusNote: string
}

const PRESENCE_KEY = 'hanzo.team.presence.v1'

const DEFAULT_PRESENCE: HumanPresencePrefs = {
  availability: 'online',
  shareActivity: true,
  statusNote: '',
}

function readStoredPresence(): HumanPresencePrefs {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_PRESENCE
    const raw = localStorage.getItem(PRESENCE_KEY)
    if (!raw) return DEFAULT_PRESENCE
    const parsed = JSON.parse(raw) as Partial<HumanPresencePrefs>
    return {
      availability: parsed.availability ?? DEFAULT_PRESENCE.availability,
      shareActivity: parsed.shareActivity ?? DEFAULT_PRESENCE.shareActivity,
      statusNote: parsed.statusNote ?? DEFAULT_PRESENCE.statusNote,
    }
  } catch {
    return DEFAULT_PRESENCE
  }
}

function inferDepartment(name: string, desc = ''): DepartmentId {
  const text = `${name} ${desc}`.toLowerCase()
  if (/(sec|cyber|audit|iam|kms|ops|infra|sre|deploy|opera)/.test(text)) return 'security'
  if (/(sci|algo|research|eval|ml|data|model)/.test(text)) return 'research'
  if (/(des|design|ui|ux|brand|product|media)/.test(text)) return 'design'
  if (/(growth|gtm|sales|marketing|support|billing|crm)/.test(text)) return 'growth'
  if (/(exec|chief|legal|finance|treasury|vi|mana|pm|plan)/.test(text)) return 'executive'
  return 'engineering'
}

export function slugHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'agent'
}

export function mapBackendAgents(
  cloudAgents: readonly CloudAgentDto[],
  botMembers: readonly BotMemberDto[],
): SpecialistAgent[] {
  const byId = new Map<string, SpecialistAgent>()
  const memberById = new Map<string, BotMemberDto>()
  const memberByName = new Map<string, BotMemberDto>()

  for (const bm of botMembers) {
    memberById.set(bm.id, bm)
    memberByName.set(bm.name.trim().toLowerCase(), bm)
  }

  for (const ag of cloudAgents) {
    if (ag.status === 'retired') continue
    const bm = memberById.get(ag.id) ?? memberByName.get(ag.name.trim().toLowerCase())
    const handle = slugHandle(ag.name)
    byId.set(ag.id, {
      id: ag.id,
      userId: bm?.userId,
      personRef: bm?.personRef,
      handle,
      name: ag.name,
      role: ag.description || `${ag.model || 'Agent'} · ${ag.executionMode || 'one-shot'}`,
      department: inferDepartment(ag.name, ag.description),
      model: ag.model || 'enso',
      status: ag.status || 'ready',
      executionMode: ag.executionMode,
      schedule: ag.schedule,
      avatar: ag.avatar,
      emoji: ag.emoji,
      state: 'idle',
      currentAssignment: ag.description || (ag.executionMode === 'long-running' && ag.schedule ? `Scheduled (${ag.schedule})` : 'Ready'),
      progress: 0,
      activeRuns: 0,
      tasksToday: ag.runCount ?? 0,
      costUsd: 0,
      trace: [],
    })
  }

  // Include any active bot members not yet present in cloudAgents list.
  for (const bm of botMembers) {
    if (!bm.active || byId.has(bm.id)) continue
    const handle = slugHandle(bm.name)
    byId.set(bm.id, {
      id: bm.id,
      userId: bm.userId,
      personRef: bm.personRef,
      handle,
      name: bm.name,
      role: 'Workspace Agent',
      department: inferDepartment(bm.name),
      model: 'enso',
      status: 'ready',
      state: 'idle',
      currentAssignment: 'Ready',
      progress: 0,
      activeRuns: 0,
      tasksToday: 0,
      costUsd: 0,
      trace: [],
    })
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}

let agentsState: SpecialistAgent[] = []
let presenceState: HumanPresencePrefs = readStoredPresence()
let loadingState = false
let errorState: string | null = null

type Listener = () => void
const listeners = new Set<Listener>()

function emit(): void {
  for (const fn of listeners) fn()
}

export function subscribeWorkforce(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getWorkforceAgents(): readonly SpecialistAgent[] {
  return agentsState
}

export function getWorkforceStatus(): { loading: boolean; error: string | null } {
  return { loading: loadingState, error: errorState }
}

export function setWorkforceAgents(next: SpecialistAgent[]): void {
  agentsState = next
  emit()
}

export function getAgentByHandle(handle: string): SpecialistAgent | undefined {
  const clean = handle.replace(/^@/, '').trim().toLowerCase()
  return agentsState.find(
    (a) =>
      a.handle.toLowerCase() === clean ||
      a.name.toLowerCase() === clean ||
      a.id === handle ||
      a.userId === handle,
  )
}

export function getHumanPresence(): HumanPresencePrefs {
  return presenceState
}

export function setHumanPresence(patch: Partial<HumanPresencePrefs>): HumanPresencePrefs {
  presenceState = { ...presenceState, ...patch }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRESENCE_KEY, JSON.stringify(presenceState))
    }
  } catch {
    /* ignore */
  }
  emit()
  return presenceState
}

export async function refreshWorkforceFromApi(): Promise<readonly SpecialistAgent[]> {
  loadingState = true
  errorState = null
  emit()
  try {
    const [cloudRes, botRes] = await Promise.allSettled([listCloudAgents(), listBotMembers()])
    const cloudList = cloudRes.status === 'fulfilled' ? cloudRes.value : []
    const botList = botRes.status === 'fulfilled' ? botRes.value : []
    if (cloudRes.status === 'rejected' && botRes.status === 'rejected') {
      const msg = cloudRes.reason instanceof Error ? cloudRes.reason.message : 'Failed to load agents'
      errorState = msg
    }
    agentsState = mapBackendAgents(cloudList, botList)
    return agentsState
  } finally {
    loadingState = false
    emit()
  }
}

export async function createWorkforceAgent(input: CreateAgentInput): Promise<SpecialistAgent> {
  const created = await createCloudAgent(input)
  await refreshWorkforceFromApi().catch(() => undefined)
  const found = agentsState.find((a) => a.id === created.id || a.name === created.name)
  if (found) return found
  const mapped = mapBackendAgents([created], [])[0]!
  agentsState = [...agentsState, mapped]
  emit()
  return mapped
}

export async function runWorkforceAgent(ref: string, input: string): Promise<{ output?: string; error?: string; status: string }> {
  const clean = ref.replace(/^@/, '').trim()
  const target = getAgentByHandle(clean)
  if (target) {
    agentsState = agentsState.map((a) =>
      a.id === target.id
        ? {
            ...a,
            state: 'executing',
            currentAssignment: input.slice(0, 120),
            activeRuns: a.activeRuns + 1,
          }
        : a,
    )
    emit()
  }
  try {
    const run = await runCloudAgent(target?.id ?? clean, input)
    if (target) {
      agentsState = agentsState.map((a) =>
        a.id === target.id
          ? {
              ...a,
              state: 'idle',
              activeRuns: Math.max(0, a.activeRuns - 1),
              tasksToday: a.tasksToday + 1,
              currentAssignment: run.error ? `Error: ${run.error}` : (run.output?.slice(0, 120) || 'Completed run'),
              trace: [
                ...a.trace,
                {
                  id: run.id || `run-${Date.now()}`,
                  tool: `agent.run`,
                  summary: run.error ? run.error : (run.output?.slice(0, 160) || input.slice(0, 120)),
                  durationMs: run.durationMs ?? 0,
                  status: run.error ? 'gated' : 'ok',
                  at: 'just now',
                },
              ],
            }
          : a,
      )
      emit()
    }
    return { output: run.output, error: run.error, status: run.status }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Agent run failed'
    if (target) {
      agentsState = agentsState.map((a) =>
        a.id === target.id
          ? {
              ...a,
              state: 'idle',
              activeRuns: Math.max(0, a.activeRuns - 1),
              currentAssignment: `Error: ${msg}`,
            }
          : a,
      )
      emit()
    }
    throw err
  }
}

export async function deleteWorkforceAgent(ref: string): Promise<void> {
  await deleteCloudAgent(ref)
  agentsState = agentsState.filter((a) => a.id !== ref && a.name !== ref && a.handle !== ref)
  emit()
}

export function assignToAgent(handle: string, taskTitle: string, deliverablePath?: string): SpecialistAgent | null {
  const clean = handle.replace(/^@/, '').trim().toLowerCase()
  const idx = agentsState.findIndex(
    (a) => a.handle.toLowerCase() === clean || a.name.toLowerCase() === clean || a.id === handle,
  )
  if (idx === -1) return null
  const current = agentsState[idx]!
  const updated: SpecialistAgent = {
    ...current,
    state: 'executing',
    currentAssignment: taskTitle,
    progress: 15,
    activeRuns: Math.max(1, current.activeRuns + 1),
    latestDeliverable: deliverablePath ? { title: taskTitle, path: deliverablePath } : current.latestDeliverable,
    trace: [
      ...current.trace,
      {
        id: `trace-${Date.now()}`,
        tool: 'agent.dispatch',
        summary: `Dispatched: "${taskTitle}"`,
        durationMs: 0,
        status: 'running',
        at: 'just now',
      },
    ],
  }
  agentsState = agentsState.map((a, i) => (i === idx ? updated : a))
  emit()
  return updated
}

export function interruptAgent(handle: string): SpecialistAgent | null {
  const clean = handle.replace(/^@/, '').trim().toLowerCase()
  const idx = agentsState.findIndex((a) => a.handle.toLowerCase() === clean || a.id === handle)
  if (idx === -1) return null
  const current = agentsState[idx]!
  const updated: SpecialistAgent = {
    ...current,
    state: 'idle',
    activeRuns: 0,
    currentAssignment: 'Paused by operator',
  }
  agentsState = agentsState.map((a, i) => (i === idx ? updated : a))
  emit()
  return updated
}

export function approveAgentTask(handle: string): SpecialistAgent | null {
  const clean = handle.replace(/^@/, '').trim().toLowerCase()
  const idx = agentsState.findIndex((a) => a.handle.toLowerCase() === clean || a.id === handle)
  if (idx === -1) return null
  const current = agentsState[idx]!
  const updated: SpecialistAgent = {
    ...current,
    state: 'idle',
    progress: 100,
    activeRuns: 0,
    tasksToday: current.tasksToday + 1,
    currentAssignment: 'Approved & completed',
  }
  agentsState = agentsState.map((a, i) => (i === idx ? updated : a))
  emit()
  return updated
}

export function resetWorkforceStore(): void {
  agentsState = []
  presenceState = { ...DEFAULT_PRESENCE }
  loadingState = false
  errorState = null
  emit()
}

export function agentStateLabel(state: AgentExecutionState): string {
  switch (state) {
    case 'executing':
      return 'Executing assigned task'
    case 'awaiting_approval':
      return 'Awaiting approval'
    case 'in_meeting':
      return 'In live meeting'
    case 'idle':
    default:
      return 'Ready'
  }
}

export function useWorkforceAgents(): readonly SpecialistAgent[] {
  return useSyncExternalStore(subscribeWorkforce, getWorkforceAgents, getWorkforceAgents)
}

export function useHumanPresence(): HumanPresencePrefs {
  return useSyncExternalStore(subscribeWorkforce, getHumanPresence, getHumanPresence)
}
