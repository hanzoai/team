/**
 * What the board renders, and the one door it reads through.
 *
 * These types are the seam between this region and `src/data`: the board says
 * what it needs, data says how it is fetched. Nothing here knows a URL, a token
 * or a socket, so the same board renders a fixture, a local store and the
 * transactor without changing a line.
 */

/** The four columns. The order here is the order on screen. */
export const STATUS = ['backlog', 'todo', 'progress', 'done'] as const
export type Status = (typeof STATUS)[number]

export const PRIORITY = ['low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITY)[number]

export interface Person {
  id: string
  name: string
  /** An image. Absent means the initials stand in — never a fabricated face. */
  face?: string
}

/** Where an issue came from: a repository, a tracker, an integration. */
export interface Origin {
  name: string
  mark?: string
}

export interface Issue {
  id: string
  /** The human identifier, `CRM-412`. */
  key: string
  title: string
  description?: string
  projectId?: string
  status: Status
  priority?: Priority
  /** Free tags. Colour comes from `tone()`, never from the tag itself. */
  labels: string[]
  /**
   * Completion, 0..1 — or absent where there is nothing to compute it from.
   * Absent is not zero: an issue with no estimate has unknown progress, and a
   * ring reading 0% on every card states that no work has been done anywhere.
   * The ring and its percentage are drawn only when this is a number.
   */
  done?: number
  origin?: Origin
  people: Person[]
  files: number
  replies: number
  /** A cover image, above the title. */
  cover?: string
}

export interface IssuePatch {
  title?: string
  description?: string
  status?: Status
  priority?: Priority | null
  done?: number
  assigneeId?: string | null
  labels?: string[]
  replies?: number
}

export interface Column {
  status: Status
  name: string
  issues: Issue[]
}

export const NAME: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  progress: 'In progress',
  done: 'Done',
}

/**
 * The board's whole dependency. `watch` pushes every revision — the first one
 * included — and returns its own cancel, so a caller never separately fetches.
 * `move` is the write; it resolves when the change is durable, and the next
 * `watch` revision is what actually redraws. That ordering is why a move made
 * by someone else arrives the same way as a move made here.
 */
export interface Source {
  watch(next: (issues: Issue[]) => void, fail: (e: Error) => void): () => void
  move(id: string, to: Status, before?: string): Promise<void>
  /**
   * Open one in `status`. The new issue arrives through `watch`, like any
   * other.
   */
  add?(status: Status, title: string, patch?: IssuePatch): Promise<void>
  update?(id: string, patch: IssuePatch): Promise<void>
  remove?(id: string): Promise<void>
}
