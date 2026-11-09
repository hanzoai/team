/**
 * What a notification IS, and what you can work out from a list of them.
 *
 * Pure, and imports nothing — which is why the algebra below is tested by
 * running it rather than by rendering a panel and looking. `feed.ts` is the
 * running feed and depends on this; nothing here depends on that.
 */

/**
 * One run of the sentence a row paints.
 *
 * A notification is not a string with a name glued to the front. The reference
 * emphasises an entity wherever it falls — the person who acted, the page they
 * acted on, the status they moved an issue to — and colours a mention
 * differently from both. Three kinds paints every row in the capture, and a
 * fourth would be one nobody can point at.
 */
export type Span = {
  text: string
  /** An entity: a person, a project, a page, a status. Primary ink. */
  strong?: boolean
  /** Addressed to you by name. Carries the alert hue, never the accent. */
  mention?: boolean
}

/** Who acted. `face` absent falls back to initials, which is the common case. */
export type Person = { name: string; face?: string }

/** Which tab a notification belongs under. The reference offers exactly two. */
export type Kind = 'task' | 'chat'

export type Note = {
  id: string
  kind: Kind
  actor: Person
  /**
   * The sentence, INCLUDING the actor's name as its first span. The name is the
   * subject of the sentence, so it belongs to the sentence; `actor` exists
   * because a face is not a word. `by()` writes the string once for both.
   */
  line: Span[]
  /** A quoted message on its own line. Chat rows have one; task rows do not. */
  quote?: Span[]
  /** Unix MILLISECONDS — the unit `teamMessage.createdOn` already uses. */
  at: number
  /**
   * Where it happened: a project, or a channel.
   *
   * Optional, because not every notification happens somewhere nameable and a
   * source that cannot name one must be able to say so. A row with no place
   * drops the separator with it rather than painting a bullet after nothing.
   */
  place?: string
  seen: boolean
}

/** The actor's name as the sentence's first span, written once. */
export const by = (actor: Person): Span => ({ text: actor.name, strong: true })

/**
 * Where notes come from, and the whole obligation on a backend.
 *
 *   list()    every notification addressed to the signed-in principal in the
 *             current space, NEWEST FIRST, sorted by `modifiedOn`: `isViewed`
 *             becomes `seen`, `modifiedOn` becomes `at`, and the message's own
 *             text becomes `quote`.
 *   see(id)   one `TxUpdateDoc` setting `isViewed` true. It must be idempotent
 *             — a row already seen is not an error — because the panel clears
 *             optimistically and only then writes.
 */
export type Source = {
  list(): Promise<Note[]>
  see(id: string): Promise<void>
}

/** The tabs, in the order the panel draws them. */
export type Tab = 'all' | Kind

export const TABS: readonly Tab[] = ['all', 'task', 'chat'] as const

/** What is in a tab. `all` is the union and is not a third store. */
export const inTab = (notes: readonly Note[], tab: Tab): Note[] =>
  tab === 'all' ? [...notes] : notes.filter((n) => n.kind === tab)

/**
 * How many unread, by kind.
 *
 * Deliberately not offered for `all`: its count is the sum of the others and
 * says nothing a reader cannot already see, which is why the reference badges
 * Tasks and leaves All bare. Not offering it is how that stays true.
 */
export const unseen = (notes: readonly Note[], kind: Kind): number =>
  notes.reduce((n, note) => n + (note.kind === kind && !note.seen ? 1 : 0), 0)

/** One read, applied. The panel's optimistic clear and a test share it. */
export const seen = (notes: readonly Note[], id: string): Note[] =>
  notes.map((n) => (n.id === id ? { ...n, seen: true } : n))
