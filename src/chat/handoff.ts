/**
 * Structured task handoffs, owner assignment, approval inbox state, and
 * completed deliverable results across Hanzo Team channels (#61-#72).
 *
 * Pure TypeScript state + storage helpers (zero literal colours; theme.ts owns
 * all tokens).
 */

export type HandoffStatus = 'waiting_approval' | 'completed' | 'changes_requested'

export interface TaskHandoff {
  id: string
  title: string
  deliverable: string
  ownerHandle: string
  ownerRole: string
  assignedBy: string
  sourceRoomId: string
  sourceRoomName: string
  approvalReason: string
  approveEffect: string
  status: HandoffStatus
  resultSummary: string | null
  resultArtifact: string | null
  createdAt: number
  resolvedAt: number | null
  resolvedBy: string | null
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const HANDOFF_STORAGE_KEY = 'hanzo.team.handoffs.v1'

export const HANDOFF_ASSIGNEES = [
  { handle: '@hanzo-dev', role: 'Zen 6 Coding Agent (zen6-coder)' },
  { handle: '@release-bot', role: 'Release & Canary Bot (zen6)' },
  { handle: 'Ada Lovelace', role: 'Principal Systems Engineer' },
  { handle: 'Grace Hopper', role: 'Compiler & Runtime Lead' },
] as const

export const SEEDED_HANDOFFS: readonly TaskHandoff[] = [
  {
    id: 'ho-zen6-canary',
    title: 'Roll out Zen 6 router endpoints & verify p95 latency',
    deliverable: 'PR-512 diff + canary smoke verification report',
    ownerHandle: '@hanzo-dev',
    ownerRole: 'Zen 6 Coding Agent (zen6-coder)',
    assignedBy: 'Ada Lovelace',
    sourceRoomId: 'c-engineering',
    sourceRoomName: 'engineering',
    approvalReason:
      'Shifting 10% production gateway traffic to zen6-coder requires human sign-off in #approvals.',
    approveEffect:
      'Approving executes the canary rollout via @hanzo-dev, runs the 24-check smoke suite, and publishes the verified report to #engineering and #approvals.',
    status: 'waiting_approval',
    resultSummary: null,
    resultArtifact: null,
    createdAt: 1_763_540_000_000,
    resolvedAt: null,
    resolvedBy: null,
  },
] as const

type Listener = () => void
const listeners = new Set<Listener>()
let memoryFallback: TaskHandoff[] | null = null

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // fallback to in-memory
  }
  return null
}

function notify() {
  for (const fn of listeners) fn()
}

export function subscribeHandoffs(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function readHandoffs(storage: StorageLike | null = defaultStorage()): TaskHandoff[] {
  if (storage) {
    try {
      const raw = storage.getItem(HANDOFF_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as TaskHandoff[]
        }
      }
    } catch {
      // fall through to seed
    }
  }
  if (memoryFallback) return [...memoryFallback]
  return SEEDED_HANDOFFS.map((item) => ({ ...item }))
}

function writeHandoffs(next: TaskHandoff[], storage: StorageLike | null = defaultStorage()): void {
  memoryFallback = [...next]
  if (storage) {
    try {
      storage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore quota errors
    }
  }
  notify()
}

export interface CreateTaskHandoffInput {
  title: string
  deliverable: string
  assigneeHandle?: string
  assignedBy?: string
  sourceRoomId: string
  sourceRoomName: string
  requireApproval?: boolean
  approvalReason?: string
  approveEffect?: string
  now?: number
}

export function createTaskHandoff(
  input: CreateTaskHandoffInput,
  storage: StorageLike | null = defaultStorage(),
): TaskHandoff {
  const cleanTitle = input.title.trim()
  if (!cleanTitle) {
    throw new Error('Task title is required for handoff')
  }
  const handle = (input.assigneeHandle ?? '@hanzo-dev').trim() || '@hanzo-dev'
  const preset = HANDOFF_ASSIGNEES.find((a) => a.handle === handle)
  const ownerRole = preset?.role ?? 'Workspace Member'
  const cleanDeliverable =
    input.deliverable.trim() || `Verified patch & test report from ${handle}`
  const roomName = input.sourceRoomName.replace(/^#+/, '') || 'engineering'
  const requireApproval = input.requireApproval !== false
  const timestamp = input.now ?? Date.now()
  const handoffId = `ho-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  const created: TaskHandoff = {
    id: handoffId,
    title: cleanTitle,
    deliverable: cleanDeliverable,
    ownerHandle: handle,
    ownerRole,
    assignedBy: input.assignedBy?.trim() || 'Team Member',
    sourceRoomId: input.sourceRoomId,
    sourceRoomName: roomName,
    approvalReason:
      input.approvalReason?.trim() ||
      `${handle} prepared the execution plan from #${roomName} and requires human approval before writing production changes.`,
    approveEffect:
      input.approveEffect?.trim() ||
      `Approving authorizes ${handle} to execute "${cleanTitle}" and publish "${cleanDeliverable}" back to #${roomName}.`,
    status: requireApproval ? 'waiting_approval' : 'completed',
    resultSummary: requireApproval
      ? null
      : `${handle} completed "${cleanTitle}" and delivered ${cleanDeliverable}.`,
    resultArtifact: requireApproval
      ? null
      : `commit ${(timestamp % 0xfffffff).toString(16).padStart(7, '0')} · all checks green`,
    createdAt: timestamp,
    resolvedAt: requireApproval ? null : timestamp,
    resolvedBy: requireApproval ? null : (input.assignedBy?.trim() || 'Auto-approved'),
  }

  const current = readHandoffs(storage)
  writeHandoffs([created, ...current], storage)
  return created
}

export function approveTaskHandoff(
  handoffId: string,
  approvedBy = 'Workspace Reviewer',
  storage: StorageLike | null = defaultStorage(),
  now: number = Date.now(),
): TaskHandoff | null {
  const current = readHandoffs(storage)
  let updatedItem: TaskHandoff | null = null

  const next = current.map((item) => {
    if (item.id !== handoffId) return item
    updatedItem = {
      ...item,
      status: 'completed',
      resolvedAt: now,
      resolvedBy: approvedBy,
      resultSummary: `${item.ownerHandle} completed "${item.title}" after approval by ${approvedBy}. Deliverable ready: ${item.deliverable}.`,
      resultArtifact: `Delivered by ${item.ownerHandle} · linked to #${item.sourceRoomName} · checks passed (100%)`,
    }
    return updatedItem
  })

  if (!updatedItem) return null
  writeHandoffs(next, storage)
  return updatedItem
}

export function requestChangesOnHandoff(
  handoffId: string,
  reviewer = 'Workspace Reviewer',
  note = 'Please add rollback verification steps before re-submitting.',
  storage: StorageLike | null = defaultStorage(),
  now: number = Date.now(),
): TaskHandoff | null {
  const current = readHandoffs(storage)
  let updatedItem: TaskHandoff | null = null

  const next = current.map((item) => {
    if (item.id !== handoffId) return item
    updatedItem = {
      ...item,
      status: 'changes_requested',
      resolvedAt: now,
      resolvedBy: reviewer,
      resultSummary: `Changes requested by ${reviewer}: ${note}`,
      resultArtifact: null,
    }
    return updatedItem
  })

  if (!updatedItem) return null
  writeHandoffs(next, storage)
  return updatedItem
}

export function handoffsForRoom(handoffs: readonly TaskHandoff[], roomId: string): TaskHandoff[] {
  if (roomId === 'c-approvals') {
    return [...handoffs].sort((a, b) => {
      if (a.status === 'waiting_approval' && b.status !== 'waiting_approval') return -1
      if (a.status !== 'waiting_approval' && b.status === 'waiting_approval') return 1
      return b.createdAt - a.createdAt
    })
  }
  return handoffs.filter((h) => h.sourceRoomId === roomId)
}
