/**
 * Executable Checkboxes parser & reactive durable task store.
 *
 * Parses markdown lines of the form:
 *   `- [ ] @dev Implement spatial desk drawer`
 *   `- [x] @qa Verify release build`
 * across Chat messages, Hanzo Spaces deliverables, and Meet transcripts.
 * Execution / delegation always requires explicit user authorization click.
 */
import { useSyncExternalStore } from 'react'

import { assignToAgent } from '../agents/workforce.ts'
import { createHandoff } from '../handoff/handoff.ts'
import { addHandoffRecord } from '../handoff/store.ts'

export type ExecutableTaskState = 'ready' | 'assigned' | 'running' | 'done'

export type TaskOriginKind = 'chat' | 'space' | 'meet' | 'composer'

export interface ParsedExecutableLine {
  checked: boolean
  agentHandle: string
  title: string
  raw: string
}

export interface ExecutableTaskRecord {
  id: string
  agentHandle: string
  title: string
  state: ExecutableTaskState
  sourceKind: TaskOriginKind
  sourceId: string
  sourceLabel: string
  sourcePath: string
  updatedAt: number
}

const EXEC_LINE_RE = /^\s*[-*]\s+\[([ xX])\]\s+@([a-zA-Z0-9_-]+)\s+(.+?)\s*$/

/** Parse a single markdown line into an Executable Task descriptor, or null if ordinary prose. */
export function parseExecutableTaskLine(line: string): ParsedExecutableLine | null {
  const m = EXEC_LINE_RE.exec(line)
  if (!m) return null
  const checked = (m[1] ?? '').toLowerCase() === 'x'
  const agentHandle = (m[2] ?? '').toLowerCase()
  const title = (m[3] ?? '').trim()
  if (!agentHandle || !title) return null
  return { checked, agentHandle, title, raw: line }
}

/** Extract all executable checkbox lines from multi-line markdown content. */
export function extractExecutableTasks(markdown: string): ParsedExecutableLine[] {
  return markdown
    .split('\n')
    .map((line) => parseExecutableTaskLine(line))
    .filter((item): item is ParsedExecutableLine => item !== null)
}

/** Detect an in-progress executable checkbox line inside the Composer to show an inline hint. */
export function detectComposerExecutableHint(text: string): { agentHandle: string; title: string } | null {
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]\s+\[\s?\]\s+@([a-zA-Z0-9_-]+)(?:\s+(.*))?$/.exec(line)
    if (m && m[1]) {
      return { agentHandle: m[1].toLowerCase(), title: (m[2] ?? '').trim() }
    }
  }
  return null
}

/** Deterministic key so the same checkbox line in a message or Space keeps its execution state. */
export function executableTaskKey(sourceKind: TaskOriginKind, sourceId: string, agentHandle: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  return `exec:${sourceKind}:${sourceId}:${agentHandle.toLowerCase()}:${slug}`
}

const STORAGE_KEY = 'hanzo.team.executable-tasks.v1'
type Listener = () => void
const listeners = new Set<Listener>()

function loadRecords(): Map<string, ExecutableTaskRecord> {
  const map = new Map<string, ExecutableTaskRecord>()
  if (typeof window === 'undefined' || !window.localStorage) return map
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return map
    const list = JSON.parse(raw) as ExecutableTaskRecord[]
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && typeof item.id === 'string') map.set(item.id, item)
      }
    }
  } catch {
    // ignore storage errors
  }
  return map
}

let records = loadRecords()
let snapshot: ExecutableTaskRecord[] = [...records.values()].sort((a, b) => b.updatedAt - a.updatedAt)

function emit(): void {
  snapshot = [...records.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // ignore storage quota
    }
  }
  for (const fn of listeners) fn()
}

export function subscribeExecutableTasks(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getExecutableTasks(): readonly ExecutableTaskRecord[] {
  return snapshot
}

export function getExecutableTask(id: string): ExecutableTaskRecord | undefined {
  return records.get(id)
}

/** Authorize & delegate an executable checkbox to `@agent`, wiring Workforce + Approval Handoff store. */
export function delegateExecutableTask(input: {
  sourceKind: TaskOriginKind
  sourceId: string
  sourceLabel: string
  sourcePath: string
  agentHandle: string
  title: string
  handedOffBy?: string
  requireApproval?: boolean
}): ExecutableTaskRecord {
  const handle = input.agentHandle.trim().replace(/^@+/, '').toLowerCase()
  const cleanTitle = input.title.trim()
  const id = executableTaskKey(input.sourceKind, input.sourceId, handle, cleanTitle)
  const now = Date.now()
  const rec: ExecutableTaskRecord = {
    id,
    agentHandle: handle,
    title: cleanTitle,
    state: 'running',
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    sourcePath: input.sourcePath,
    updatedAt: now,
  }
  records.set(id, rec)
  emit()

  assignToAgent(handle, cleanTitle, input.sourcePath)
  const meta = createHandoff({
    owner: { id: `agent-${handle}`, name: handle, kind: 'bot' },
    handedOffBy: input.handedOffBy ?? 'HQ Operator',
    approvalRequired: input.requireApproval ?? true,
    sourceRoomId: input.sourceKind === 'chat' ? input.sourceId : undefined,
    sourceRoomName: input.sourceLabel,
    now,
  })
  addHandoffRecord({
    id: `handoff:${id}`,
    title: cleanTitle,
    body: `Delegated from ${input.sourceLabel} (${input.sourcePath})`,
    status: 'progress',
    meta,
    updatedAt: now,
  })
  return rec
}

export function toggleExecutableTaskDone(input: {
  sourceKind: TaskOriginKind
  sourceId: string
  sourceLabel: string
  sourcePath: string
  agentHandle: string
  title: string
  initialChecked?: boolean
}): ExecutableTaskRecord {
  const handle = input.agentHandle.trim().replace(/^@+/, '').toLowerCase()
  const cleanTitle = input.title.trim()
  const id = executableTaskKey(input.sourceKind, input.sourceId, handle, cleanTitle)
  const prev = records.get(id)
  const currentlyDone = prev ? prev.state === 'done' : Boolean(input.initialChecked)
  const next: ExecutableTaskRecord = {
    id,
    agentHandle: handle,
    title: cleanTitle,
    state: currentlyDone ? 'ready' : 'done',
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    sourcePath: input.sourcePath,
    updatedAt: Date.now(),
  }
  records.set(id, next)
  emit()
  return next
}

export function resetExecutableTasks(): void {
  records = new Map()
  emit()
}

export function useExecutableTasks(): readonly ExecutableTaskRecord[] {
  return useSyncExternalStore(subscribeExecutableTasks, getExecutableTasks, getExecutableTasks)
}
