/**
 * Issue conversation source links (#396) and real calendar timeline helpers (#395).
 *
 * Pure, zero-UI, zero-transport module so Node's native test runner tests
 * marker round-trips and due-date week placement directly.
 */

export interface ChatSource {
  roomId: string
  roomName: string
  messageId?: string
}

const SOURCE_START = '<!-- hanzo:chat:v1 '
const SOURCE_END = ' -->'

export function parseChatSource(description: string | undefined): {
  body: string
  source: ChatSource | null
} {
  if (!description) return { body: '', source: null }
  const start = description.lastIndexOf(SOURCE_START)
  if (start < 0) return { body: description, source: null }
  const end = description.indexOf(SOURCE_END, start + SOURCE_START.length)
  if (end < 0) return { body: description, source: null }

  const raw = description.slice(start + SOURCE_START.length, end).trim()
  const body = (description.slice(0, start) + description.slice(end + SOURCE_END.length)).trim()
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const roomId = typeof parsed.roomId === 'string' ? parsed.roomId.trim() : ''
    const roomName = typeof parsed.roomName === 'string' ? parsed.roomName.trim() : ''
    const messageId = typeof parsed.messageId === 'string' && parsed.messageId.trim() ? parsed.messageId.trim() : undefined
    if (!roomId || !roomName) return { body, source: null }
    return { body, source: { roomId, roomName, ...(messageId ? { messageId } : {}) } }
  } catch {
    return { body, source: null }
  }
}

export function formatChatSource(body: string, source: ChatSource | null): string {
  const clean = body.trim()
  if (!source) return clean
  const payload = JSON.stringify(source).replace(/-->/g, '--\\u003e')
  const footer = `${SOURCE_START}${payload}${SOURCE_END}`
  return clean ? `${clean}\n\n${footer}` : footer
}

export function chatSourceHref(source: ChatSource): string {
  const base = `/chat/${encodeURIComponent(source.roomId)}`
  return source.messageId ? `${base}?msg=${encodeURIComponent(source.messageId)}` : base
}

export interface TimelineWeek {
  id: string
  label: string
  sub: string
  startMs: number
  endMs: number
  now: boolean
}

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

const shortDate = (ms: number): string => {
  const d = new Date(ms)
  return `${MONTHS[d.getUTCMonth()]!} ${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Format a due date timestamp as `Nov 27` (or `Nov 27, 2027` if another year). */
export function formatDueDate(ms: number | null | undefined, now = Date.now()): string {
  if (!ms || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  const cur = new Date(now)
  const base = `${MONTHS[d.getUTCMonth()]!} ${d.getUTCDate()}`
  return d.getUTCFullYear() === cur.getUTCFullYear() ? base : `${base}, ${d.getUTCFullYear()}`
}

/** Convert Unix ms timestamp to `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInput(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Canonical overdue predicate (#395): an issue is overdue only when not done
 * and its UTC calendar due date is strictly before today's UTC calendar date.
 */
export function isOverdue(
  dueDate: number | null | undefined,
  status: string,
  now = Date.now(),
): boolean {
  if (!dueDate || !Number.isFinite(dueDate) || status === 'done') return false
  return toDateInput(dueDate) < toDateInput(now)
}

/** Parse `YYYY-MM-DD` from `<input type="date">` into UTC noon Unix ms, or null if empty/invalid. */
export function fromDateInput(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  return Number.isFinite(ms) ? ms : null
}

/** Build `count` real calendar weeks starting at the Monday of `now`'s week (#395). */
export function timelineWeeks(now = Date.now(), count = 6): TimelineWeek[] {
  const d = new Date(now)
  const day = d.getUTCDay()
  const offsetToMon = (day + 6) % 7
  const monStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offsetToMon)
  return Array.from({ length: count }, (_, idx) => {
    const startMs = monStart + idx * WEEK_MS
    const endMs = startMs + WEEK_MS
    return {
      id: `w-${startMs}`,
      label: shortDate(startMs),
      sub: idx === 0 ? 'This week' : idx === 1 ? 'Next week' : `In ${idx}w`,
      startMs,
      endMs,
      now: idx === 0,
    }
  })
}

/** Return the week index containing `dueDate`, or -1 when unscheduled or outside the window. */
export function dueWeekIndex(dueDate: number | null | undefined, weeks: readonly TimelineWeek[]): number {
  if (!dueDate || !Number.isFinite(dueDate) || weeks.length === 0) return -1
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i]!
    if (dueDate >= w.startMs && dueDate < w.endMs) return i
  }
  if (dueDate < weeks[0]!.startMs) return 0
  return -1
}
