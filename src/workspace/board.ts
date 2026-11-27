/**
 * Local scratch Tracker Board (`Source`) used ONLY when explicitly running in
 * unauthenticated local desktop scratch mode (`guest === true`).
 *
 * Starts strictly empty — zero seeded demo issues and zero fake roster entries.
 * Authenticated sessions use the live transactor `<Space>` plane (`cloudBoard`)
 * or explicit `standby('opening' | 'refused' | 'nowhere')` states.
 */
import type { Issue, IssuePatch, Person, Source, Status } from '../tracker/board/model.ts'

let localIssues: Issue[] = []
let seq = 1
const watchers = new Set<(rows: Issue[]) => void>()

function broadcast() {
  const copy = [...localIssues]
  for (const fn of watchers) fn(copy)
}

export function resetLocalBoard(): void {
  localIssues = []
  seq = 1
  broadcast()
}

export const localBoardSource: Source = {
  watch(next) {
    watchers.add(next)
    next([...localIssues])
    return () => {
      watchers.delete(next)
    }
  },
  async add(to: Status, title: string, patch?: IssuePatch) {
    const num = seq++
    const created: Issue = {
      id: `local-${num}`,
      key: `LOCAL-${num}`,
      title: title.trim() || `Untitled LOCAL-${num}`,
      description: patch?.description,
      projectId: patch?.project ?? 'local',
      status: to,
      priority: patch?.priority ?? 'medium',
      labels: patch?.labels ?? [],
      done: to === 'done' ? 1 : 0,
      people: [],
      files: 0,
      replies: 0,
    }
    localIssues = [...localIssues, created]
    broadcast()
  },
  async move(id: string, to: Status, before?: string) {
    const target = localIssues.find((i) => i.id === id)
    if (!target) return
    const updated: Issue = { ...target, status: to, done: to === 'done' ? 1 : target.done }
    const without = localIssues.filter((i) => i.id !== id)
    if (!before) {
      localIssues = [...without, updated]
    } else {
      const idx = without.findIndex((i) => i.id === before)
      localIssues =
        idx < 0
          ? [...without, updated]
          : [...without.slice(0, idx), updated, ...without.slice(idx)]
    }
    broadcast()
  },
  async update(id: string, patch: IssuePatch) {
    localIssues = localIssues.map((iss) => {
      if (iss.id !== id) return iss
      return {
        ...iss,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority ?? undefined } : {}),
        ...(patch.labels !== undefined ? { labels: patch.labels } : {}),
        ...(patch.done !== undefined ? { done: patch.done } : {}),
        ...(patch.replies !== undefined ? { replies: patch.replies } : {}),
      }
    })
    broadcast()
  },
  async remove(id: string) {
    localIssues = localIssues.filter((i) => i.id !== id)
    broadcast()
  },
}

export function getLocalCrew(): Person[] {
  return []
}
