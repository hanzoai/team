/**
 * Pure executive summary for Workspace Home (#391).
 *
 * Computes counts and groupings strictly from real workspace records —
 * never fabricated metrics, sample tasks, or synthetic activity.
 */
import type { HandoffRecord } from '../handoff/handoff.ts'
import type { Note } from '../inbox/note.ts'
import type { Issue } from '../tracker/board/model.ts'
import { isOverdue } from '../tracker/source.ts'

export interface OwnerLoad {
  id: string
  name: string
  bot: boolean
  active: number
  overdue: number
  issues: Issue[]
}

export interface HomeSummary {
  activeCount: number
  overdueCount: number
  pendingApprovalsCount: number
  unreadNotesCount: number
  overdueIssues: Issue[]
  owners: OwnerLoad[]
  recentNotes: Note[]
}

export function buildHomeSummary({
  issues,
  approvals,
  notes,
  now = Date.now(),
}: {
  issues: readonly Issue[]
  approvals: readonly HandoffRecord[]
  notes: readonly Note[]
  now?: number
}): HomeSummary {
  const active = issues.filter((i) => i.status !== 'done')
  const overdueIssues = active.filter((i) => isOverdue(i.dueDate, i.status, now))

  const byOwner = new Map<string, OwnerLoad>()
  for (const issue of active) {
    const first = issue.people[0]
    const id = first?.id ?? 'unassigned'
    const bot = Boolean(first?.bot)
    const name = first ? (bot ? `@${first.name.replace(/^@/, '')}` : first.name) : 'Unassigned'
    const overdue = isOverdue(issue.dueDate, issue.status, now)
    const existing = byOwner.get(id)
    if (existing) {
      existing.active += 1
      if (overdue) existing.overdue += 1
      existing.issues.push(issue)
    } else {
      byOwner.set(id, {
        id,
        name,
        bot,
        active: 1,
        overdue: overdue ? 1 : 0,
        issues: [issue],
      })
    }
  }

  const owners = [...byOwner.values()].sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.name.localeCompare(b.name))
  const unreadNotesCount = notes.reduce((n, row) => n + (row.seen ? 0 : 1), 0)
  const recentNotes = [...notes].sort((a, b) => b.at - a.at).slice(0, 8)

  return {
    activeCount: active.length,
    overdueCount: overdueIssues.length,
    pendingApprovalsCount: approvals.length,
    unreadNotesCount,
    overdueIssues,
    owners,
    recentNotes,
  }
}
