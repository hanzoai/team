/**
 * Team Handoff -> Approval -> Deliverable domain logic.
 *
 * Pure, zero-UI, zero-transport module so every ownership handoff (to a person
 * or `@bot`), approval gate (`pending` -> `approved` | `changes_requested`),
 * deliverable record, and `@mention` lookup is tested directly in Node.
 *
 * Metadata persists cleanly inside `tracker:class:Issue.description` via a
 * deterministic footer marker, so handoffs round-trip over the existing
 * transactor plane without requiring a server schema migration.
 */
import type { Issue, IssuePatch, Status } from '../tracker/board/model.ts'

export type ApprovalState = 'none' | 'pending' | 'approved' | 'changes_requested'

export type OwnerKind = 'person' | 'bot'

export interface HandoffOwner {
  id: string
  name: string
  kind: OwnerKind
  face?: string
}

export interface Deliverable {
  summary: string
  artifact?: string
  completedBy: string
  completedAt: number
  verified?: boolean
}

export interface HandoffMeta {
  owner: HandoffOwner
  handedOffBy: string
  handedOffAt: number
  approvalRequired: boolean
  approvalState: ApprovalState
  approvalNote?: string
  approvedBy?: string
  approvedAt?: number
  deliverable?: Deliverable
  sourceRoomId?: string
  sourceRoomName?: string
}

export interface HandoffRecord {
  id: string
  issueId?: string
  issueKey?: string
  title: string
  body: string
  status: Status
  meta: HandoffMeta
  updatedAt: number
}

const MARKER_START = '<!-- hanzo:handoff:v1 '
const MARKER_END = ' -->'

const MANAGED_LABELS = new Set([
  'Handoff',
  'Pending Approval',
  'Approved',
  'Changes Requested',
  'Deliverable',
])

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const VALID_STATES = new Set<ApprovalState>(['none', 'pending', 'approved', 'changes_requested'])

/** Extract structured handoff metadata from an issue description, returning clean prose + meta. */
export function parseHandoff(description: string | undefined): {
  body: string
  handoff: HandoffMeta | null
} {
  if (!description) return { body: '', handoff: null }
  const start = description.lastIndexOf(MARKER_START)
  if (start < 0) return { body: description, handoff: null }
  const end = description.indexOf(MARKER_END, start + MARKER_START.length)
  if (end < 0) return { body: description, handoff: null }

  const rawJson = description.slice(start + MARKER_START.length, end).trim()
  const body = (description.slice(0, start) + description.slice(end + MARKER_END.length)).trim()

  try {
    const parsed: unknown = JSON.parse(rawJson)
    if (!isRecord(parsed) || !isRecord(parsed.owner)) return { body, handoff: null }
    const ownerId = typeof parsed.owner.id === 'string' ? parsed.owner.id : ''
    const ownerName = typeof parsed.owner.name === 'string' ? parsed.owner.name : ''
    if (!ownerId || !ownerName) return { body, handoff: null }
    const kind: OwnerKind = parsed.owner.kind === 'bot' ? 'bot' : 'person'
    const approvalState: ApprovalState =
      typeof parsed.approvalState === 'string' && VALID_STATES.has(parsed.approvalState as ApprovalState)
        ? (parsed.approvalState as ApprovalState)
        : 'none'

    let deliverable: Deliverable | undefined
    if (isRecord(parsed.deliverable) && typeof parsed.deliverable.summary === 'string' && parsed.deliverable.summary.trim()) {
      deliverable = {
        summary: parsed.deliverable.summary.trim(),
        artifact: typeof parsed.deliverable.artifact === 'string' && parsed.deliverable.artifact.trim()
          ? parsed.deliverable.artifact.trim()
          : undefined,
        completedBy: typeof parsed.deliverable.completedBy === 'string' ? parsed.deliverable.completedBy : ownerName,
        completedAt: typeof parsed.deliverable.completedAt === 'number' ? parsed.deliverable.completedAt : Date.now(),
        verified: parsed.deliverable.verified === true,
      }
    }

    const handoff: HandoffMeta = {
      owner: {
        id: ownerId,
        name: ownerName,
        kind,
        ...(typeof parsed.owner.face === 'string' && parsed.owner.face ? { face: parsed.owner.face } : {}),
      },
      handedOffBy: typeof parsed.handedOffBy === 'string' ? parsed.handedOffBy : 'Teammate',
      handedOffAt: typeof parsed.handedOffAt === 'number' ? parsed.handedOffAt : Date.now(),
      approvalRequired: parsed.approvalRequired === true,
      approvalState,
      ...(typeof parsed.approvalNote === 'string' && parsed.approvalNote ? { approvalNote: parsed.approvalNote } : {}),
      ...(typeof parsed.approvedBy === 'string' && parsed.approvedBy ? { approvedBy: parsed.approvedBy } : {}),
      ...(typeof parsed.approvedAt === 'number' ? { approvedAt: parsed.approvedAt } : {}),
      ...(deliverable ? { deliverable } : {}),
      ...(typeof parsed.sourceRoomId === 'string' && parsed.sourceRoomId ? { sourceRoomId: parsed.sourceRoomId } : {}),
      ...(typeof parsed.sourceRoomName === 'string' && parsed.sourceRoomName ? { sourceRoomName: parsed.sourceRoomName } : {}),
    }
    return { body, handoff }
  } catch {
    return { body, handoff: null }
  }
}

/** Serialize clean prose + optional handoff metadata back into `issue.description`. */
export function formatHandoff(body: string, handoff: HandoffMeta | null): string {
  const clean = body.trim()
  if (!handoff) return clean
  // Prevent a literal `-->` inside user text from breaking the HTML comment delimiter.
  const payload = JSON.stringify(handoff).replace(/-->/g, '--\\u003e')
  const footer = `${MARKER_START}${payload}${MARKER_END}`
  return clean ? `${clean}\n\n${footer}` : footer
}

/** Initiate a handoff to a person or `@bot`. */
export function createHandoff(input: {
  owner: HandoffOwner
  handedOffBy: string
  approvalRequired: boolean
  sourceRoomId?: string
  sourceRoomName?: string
  now?: number
}): HandoffMeta {
  return {
    owner: { ...input.owner },
    handedOffBy: input.handedOffBy.trim() || 'Teammate',
    handedOffAt: input.now ?? Date.now(),
    approvalRequired: input.approvalRequired,
    approvalState: input.approvalRequired ? 'pending' : 'none',
    ...(input.sourceRoomId ? { sourceRoomId: input.sourceRoomId } : {}),
    ...(input.sourceRoomName ? { sourceRoomName: input.sourceRoomName } : {}),
  }
}

/** Attach or update the resulting deliverable. Moves to `pending` when approval is required, else `approved`. */
export function submitDeliverable(
  meta: HandoffMeta,
  input: { summary: string; artifact?: string; completedBy?: string; now?: number },
): HandoffMeta {
  const summary = input.summary.trim()
  if (!summary) throw new Error('Deliverable summary is required.')
  const now = input.now ?? Date.now()
  const completedBy = input.completedBy?.trim() || meta.owner.name
  const autoApproved = !meta.approvalRequired
  return {
    ...meta,
    approvalState: autoApproved ? 'approved' : 'pending',
    ...(autoApproved ? { approvedBy: 'Auto-approved', approvedAt: now } : {}),
    deliverable: {
      summary,
      ...(input.artifact?.trim() ? { artifact: input.artifact.trim() } : {}),
      completedBy,
      completedAt: now,
      verified: autoApproved,
    },
  }
}

/** Approve a handed-off work item and verify its deliverable (if present). */
export function approveHandoff(
  meta: HandoffMeta,
  input: { approvedBy: string; note?: string; now?: number },
): HandoffMeta {
  const now = input.now ?? Date.now()
  return {
    ...meta,
    approvalState: 'approved',
    approvedBy: input.approvedBy.trim() || 'Reviewer',
    approvedAt: now,
    ...(input.note?.trim() ? { approvalNote: input.note.trim() } : {}),
    ...(meta.deliverable ? { deliverable: { ...meta.deliverable, verified: true } } : {}),
  }
}

/** Request changes on a handed-off item so the owner or `@bot` revises and resubmits. */
export function requestChanges(
  meta: HandoffMeta,
  input: { reviewedBy: string; note: string; now?: number },
): HandoffMeta {
  const note = input.note.trim()
  return {
    ...meta,
    approvalState: 'changes_requested',
    approvedBy: input.reviewedBy.trim() || 'Reviewer',
    approvedAt: input.now ?? Date.now(),
    approvalNote: note || 'Please revise and resubmit for approval.',
    ...(meta.deliverable ? { deliverable: { ...meta.deliverable, verified: false } } : {}),
  }
}

/** Synchronize tracker labels for handoff state without clobbering user tags. */
export function handoffLabels(
  existing: readonly string[],
  approvalState: ApprovalState,
  hasDeliverable: boolean,
): string[] {
  const kept = existing.filter((l) => !MANAGED_LABELS.has(l))
  const next = [...kept, 'Handoff']
  if (approvalState === 'pending') next.push('Pending Approval')
  else if (approvalState === 'approved') next.push('Approved')
  else if (approvalState === 'changes_requested') next.push('Changes Requested')
  if (hasDeliverable) next.push('Deliverable')
  return next
}

/** Compute the exact `IssuePatch` to persist a handoff transition onto a `tracker:class:Issue`. */
export function issueHandoffPatch(
  issue: Pick<Issue, 'description' | 'labels' | 'status'>,
  meta: HandoffMeta,
  overrideBody?: string,
): IssuePatch {
  const { body: existingBody } = parseHandoff(issue.description)
  const body = overrideBody !== undefined ? overrideBody : existingBody
  const status: Status =
    meta.approvalState === 'approved'
      ? 'done'
      : 'progress'
  const done =
    meta.approvalState === 'approved'
      ? 1
      : meta.deliverable
        ? 0.75
        : meta.approvalState === 'changes_requested'
          ? 0.5
          : 0.25

  return {
    description: formatHandoff(body, meta),
    assigneeId: meta.owner.id,
    status,
    done,
    labels: handoffLabels(issue.labels, meta.approvalState, Boolean(meta.deliverable)),
  }
}

/** Format a Chat message that mentions the owner (`@Name`) so bots & people are notified on the server. */
export function handoffChatMessage(input: {
  title: string
  owner: Pick<HandoffOwner, 'name' | 'kind'>
  brief?: string
  approvalRequired: boolean
  issueKey?: string
}): string {
  const handle = `@${input.owner.name.trim()}`
  const ref = input.issueKey ? `[${input.issueKey}] ` : ''
  const gate = input.approvalRequired ? 'Approval required before completion.' : 'Full access (auto-approve).'
  const lines = [`${handle} Handoff: ${ref}${input.title.trim()}`]
  if (input.brief?.trim()) lines.push(input.brief.trim())
  lines.push(gate)
  return lines.join('\n')
}

/** Human-readable status label for cards, drawers, and the Approval Inbox. */
export function approvalLabel(state: ApprovalState): string {
  switch (state) {
    case 'pending':
      return 'Awaiting approval'
    case 'approved':
      return 'Approved'
    case 'changes_requested':
      return 'Changes requested'
    default:
      return 'In progress'
  }
}

/** Roster entry shape for `@mention` autocomplete in Chat Composer. */
export interface MentionCandidate {
  id: string
  name: string
  bot?: boolean
  gone?: boolean
  avatar?: string
}

/** Detect an active trailing `@query` token in composer text. */
export function activeMentionQuery(text: string): { query: string; start: number } | null {
  const m = /(?:^|[\s(])@([\w.-]*)$/.exec(text)
  if (!m) return null
  const start = text.length - m[1]!.length - 1
  return { query: m[1] ?? '', start }
}

/** Filter active people & bots for `@mention` picker (bots ranked first, then alphabetical). */
export function mentionSuggestions<T extends MentionCandidate>(
  roster: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const q = query.trim().toLowerCase()
  return roster
    .filter((p) => !p.gone && p.name.trim() && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => Number(Boolean(b.bot)) - Number(Boolean(a.bot)) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** Replace the active `@query` suffix with `@Name ` in composer text. */
export function applyMention(text: string, candidateName: string): string {
  const active = activeMentionQuery(text)
  const insert = `@${candidateName.trim()} `
  if (!active) return text ? `${text.trimEnd()} ${insert}` : insert
  return text.slice(0, active.start) + insert
}

/** Convert an Issue with handoff metadata into a `HandoffRecord`, or null if none. */
export function handoffFromIssue(issue: Issue): HandoffRecord | null {
  const { body, handoff } = parseHandoff(issue.description)
  if (!handoff) return null
  return {
    id: `issue:${issue.id}`,
    issueId: issue.id,
    issueKey: issue.key,
    title: issue.title,
    body,
    status: issue.status,
    meta: handoff,
    updatedAt: Math.max(
      handoff.handedOffAt,
      handoff.deliverable?.completedAt ?? 0,
      handoff.approvedAt ?? 0,
    ),
  }
}
