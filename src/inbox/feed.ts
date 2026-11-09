/**
 * The running feed, and the one seam a backend fills.
 *
 * The inbox region states the shape it needs (`note.ts`) and takes it from a
 * `Source`. Live arrivals push through `arrive` so nothing here polls.
 */
import { held, hold, invalidate, useRead, type Read } from '~/data/query'

import { sample, still } from './fixture.ts'
import { seen, type Note, type Source } from './note.ts'

const CELL = 'inbox'

/**
 * The feed, and today it is fixtures.
 *
 * A default rather than a required call, because a region that renders its
 * failure state until another region is finished tells you nothing about
 * itself. `serve` replaces it the moment a transactor client exists, and the
 * fixtures stay as what the tests and a deterministic capture read.
 */
let source: Source = still(sample())

/**
 * Hand the feed a backend.
 *
 * One call, one direction: `src/data` learns nothing about this region, and
 * this region builds no URL, no token and no socket. Whatever is already held
 * is dropped, because it was read from somewhere else.
 */
export const serve = (next: Source) => {
  source = next
  invalidate(CELL)
}

/** The feed, in three phases. A screen never renders rows from `?? []`. */
export const useNotes = (): Read<Note[]> => useRead<Note[]>(CELL, () => source.list())

/**
 * How many are unread, across every tab.
 *
 * The rail paints a mark on its bell from this number and the shell publishes
 * the sink it goes in (`setNotices`), so neither the rail nor this panel
 * imports the other. It is a hook rather than a report from inside the panel,
 * because the bell has to be right while the panel is CLOSED — and a count
 * that only moved while the panel was open would be a stale mark exactly when
 * somebody is relying on it.
 */
export const useUnseen = (): number => {
  const feed = useNotes()
  return (feed.data ?? []).reduce((n, note) => n + (note.seen ? 0 : 1), 0)
}

/** Reading one clears it. */
export const see = (id: string) => {
  const now = held<Note[]>(CELL)
  const note = now?.find((n) => n.id === id)
  if (!now || !note || note.seen) return
  // Clear first: the dot, the row surface and the tab count are one derived
  // value, so patching what is held moves all three in the same paint. The
  // write follows and puts the old list back if the backend refuses — the row
  // returning is the honest report, and better than a panel that says read
  // while the server says unread.
  hold(CELL, seen(now, id))
  void source.see(id).catch(() => hold(CELL, now))
}

/** Mark every unread notification in the feed as read. */
export const seeAll = () => {
  const now = held<Note[]>(CELL)
  if (!now) return
  const unread = now.filter((n) => !n.seen)
  if (unread.length === 0) return
  hold(
    CELL,
    now.map((n) => (n.seen ? n : { ...n, seen: true })),
  )
  for (const n of unread) {
    void source.see(n.id).catch(() => {})
  }
}

/**
 * A notification that arrived while the panel was open.
 *
 * Newest first, and an id already held REPLACES rather than duplicates: the
 * transactor re-broadcasts a document on every update, and a feed that appended
 * would grow a second copy of a row somebody had just read.
 */
export const arrive = (note: Note) => {
  const now = held<Note[]>(CELL) ?? []
  hold(CELL, [note, ...now.filter((n) => n.id !== note.id)])
}
