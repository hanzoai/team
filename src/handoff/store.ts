/**
 * Reactive workspace store for Team Handoffs & Approvals.
 *
 * Bridges three surfaces cleanly without circular imports:
 *   - Tracker (`IssueDrawer` / `Board` / `Serve`): pushes live issues containing
 *     structured handoff metadata + registers the live `Source` so approving an
 *     issue from the Approval Inbox persists directly via `source.update(...)`.
 *   - Chat (`Composer` / `Chat` / `Run`): creates handoffs to teammates or `@bot`
 *     (and also opens a tracker issue when a project is selected) so ownership
 *     and approval state are immediately visible in the room and Approval Inbox.
 *   - Approval Inbox (`Inbox`): displays pending approvals, lets reviewers
 *     Approve or Request changes, record deliverables, and see the resulting
 *     deliverable.
 */
import { useSyncExternalStore } from 'react'

import type { Issue, IssuePatch, Source } from '../tracker/board/model.ts'
import {
  approveHandoff,
  handoffFromIssue,
  issueHandoffPatch,
  requestChanges,
  submitDeliverable,
  type HandoffMeta,
  type HandoffRecord,
} from './handoff.ts'

type Listener = () => void

const listeners = new Set<Listener>()
let activeSpace = 'default'
let issueRecords = new Map<string, HandoffRecord>()
let localRecords = new Map<string, HandoffRecord>()
let issueById = new Map<string, Issue>()
let boardUpdater: ((id: string, patch: IssuePatch) => Promise<void>) | null = null
let snapshot: HandoffRecord[] = []

const STORAGE_PREFIX = 'hanzo.team.handoffs.v1:'

function storageKey(space: string): string {
  return `${STORAGE_PREFIX}${space || 'default'}`
}

function readLocal(space: string): Map<string, HandoffRecord> {
  const out = new Map<string, HandoffRecord>()
  if (typeof window === 'undefined' || !window.localStorage) return out
  try {
    const raw = window.localStorage.getItem(storageKey(space))
    if (!raw) return out
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return out
    for (const item of parsed) {
      if (item && typeof item === 'object' && typeof (item as HandoffRecord).id === 'string') {
        const rec = item as HandoffRecord
        if (rec.meta?.owner?.id && rec.meta?.owner?.name) out.set(rec.id, rec)
      }
    }
  } catch {
    // Ignore corrupt local cache
  }
  return out
}

function writeLocal(space: string, records: Map<string, HandoffRecord>): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(storageKey(space), JSON.stringify([...records.values()]))
  } catch {
    // Ignore storage quota errors
  }
}

function rebuild(): void {
  const merged = new Map<string, HandoffRecord>()
  for (const [k, v] of localRecords) merged.set(k, v)
  // Live board issues win for any matching issueId.
  for (const [k, v] of issueRecords) {
    merged.set(k, v)
  }
  snapshot = [...merged.values()].sort((a, b) => {
    const aPending = a.meta.approvalState === 'pending' ? 1 : 0
    const bPending = b.meta.approvalState === 'pending' ? 1 : 0
    if (aPending !== bPending) return bPending - aPending
    return b.updatedAt - a.updatedAt
  })
  for (const fn of listeners) fn()
}

export function subscribeHandoffs(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getHandoffs(): HandoffRecord[] {
  return snapshot
}

/** Switch active workspace scope (loads cached chat-originated handoffs for that space). */
export function setHandoffSpace(space: string): void {
  const next = space || 'default'
  if (next === activeSpace && (localRecords.size > 0 || issueRecords.size > 0)) return
  activeSpace = next
  issueRecords = new Map()
  issueById = new Map()
  boardUpdater = null
  localRecords = readLocal(activeSpace)
  rebuild()
}

/** Reset store state (primarily for deterministic unit tests). */
export function resetHandoffStore(space = 'default'): void {
  activeSpace = space
  issueRecords = new Map()
  localRecords = new Map()
  issueById = new Map()
  boardUpdater = null
  snapshot = []
  for (const fn of listeners) fn()
}

/** Sync live tracker issues into the handoff store and register the board's `update` writer. */
export function syncBoardHandoffs(issues: readonly Issue[], source?: Pick<Source, 'update'> | null): void {
  issueById = new Map(issues.map((i) => [i.id, i]))
  if (source?.update) {
    boardUpdater = (id, patch) => source.update!(id, patch)
  }
  const next = new Map<string, HandoffRecord>()
  for (const issue of issues) {
    const rec = handoffFromIssue(issue)
    if (rec) next.set(rec.id, rec)
  }
  issueRecords = next
  // Drop any local shadow whose title+owner has now materialized as a real board issue.
  let pruned = false
  for (const [localId, localRec] of localRecords) {
    if (localRec.issueId && next.has(`issue:${localRec.issueId}`)) {
      localRecords.delete(localId)
      pruned = true
    } else {
      const matched = [...next.values()].find(
        (r) => r.title === localRec.title && r.meta.owner.id === localRec.meta.owner.id,
      )
      if (matched) {
        localRecords.delete(localId)
        pruned = true
      }
    }
  }
  if (pruned) writeLocal(activeSpace, localRecords)
  rebuild()
}

/** Record a newly created handoff (e.g. from Chat) immediately so Inbox & room header update. */
export function addHandoffRecord(record: HandoffRecord): void {
  localRecords.set(record.id, record)
  writeLocal(activeSpace, localRecords)
  rebuild()
}

async function applyTransition(
  id: string,
  mutate: (meta: HandoffMeta) => HandoffMeta,
): Promise<HandoffRecord | null> {
  const existing = issueRecords.get(id) ?? localRecords.get(id)
  if (!existing) return null
  const nextMeta = mutate(existing.meta)
  const nextStatus = nextMeta.approvalState === 'approved' ? 'done' : 'progress'
  const updated: HandoffRecord = {
    ...existing,
    status: nextStatus,
    meta: nextMeta,
    updatedAt: Math.max(
      existing.updatedAt,
      nextMeta.handedOffAt,
      nextMeta.deliverable?.completedAt ?? 0,
      nextMeta.approvedAt ?? 0,
    ),
  }

  if (existing.issueId) {
    issueRecords.set(id, updated)
    rebuild()
    const issue = issueById.get(existing.issueId)
    if (issue && boardUpdater) {
      const patch = issueHandoffPatch(issue, nextMeta)
      await boardUpdater(issue.id, patch)
    }
    return updated
  }

  localRecords.set(id, updated)
  writeLocal(activeSpace, localRecords)
  rebuild()
  return updated
}

/** Attach/submit a deliverable on a handoff record (persists to Tracker issue if linked). */
export function submitHandoffDeliverable(
  id: string,
  input: { summary: string; artifact?: string; completedBy?: string; now?: number },
): Promise<HandoffRecord | null> {
  return applyTransition(id, (meta) => submitDeliverable(meta, input))
}

/** Approve a pending handoff from the Approval Inbox or Issue Drawer. */
export function approveHandoffRecord(
  id: string,
  input: { approvedBy: string; note?: string; now?: number },
): Promise<HandoffRecord | null> {
  return applyTransition(id, (meta) => approveHandoff(meta, input))
}

/** Request changes on a pending handoff from the Approval Inbox or Issue Drawer. */
export function requestHandoffChanges(
  id: string,
  input: { reviewedBy: string; note: string; now?: number },
): Promise<HandoffRecord | null> {
  return applyTransition(id, (meta) => requestChanges(meta, input))
}

/** React hook returning every handoff in the active space (pending approvals first). */
export function useHandoffs(): HandoffRecord[] {
  return useSyncExternalStore(subscribeHandoffs, getHandoffs, getHandoffs)
}

/** React hook returning only handoffs currently awaiting approval. */
export function usePendingApprovals(): HandoffRecord[] {
  const all = useHandoffs()
  return all.filter((h) => h.meta.approvalState === 'pending')
}

/** React hook returning handoffs linked to a specific Chat room. */
export function useRoomHandoffs(roomId: string | null | undefined): HandoffRecord[] {
  const all = useHandoffs()
  if (!roomId) return []
  return all.filter((h) => h.meta.sourceRoomId === roomId)
}
