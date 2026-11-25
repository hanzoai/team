/**
 * Pure projection from platform `Notice` documents to Inbox `Note` rows (#394/#400).
 *
 * Zero React/DOM imports so Node's native test runner verifies actor resolution,
 * chat quotes, and deep-link destinations directly.
 */
import { Class, findPerson, nameOf, type Notice, type Person } from '../data/model.ts'
import type { Note, Span } from './note.ts'

export type Place = {
  label: string
  to: string
  quote?: string
}

const MENTION = /(@[\w.-]+)/g

const runs = (text: string, kind: 'strong' | 'mention'): Span[] =>
  text ? [{ text, [kind]: true }] : []

/** Tokenize a string into plain, entity-strong, and @mention spans. */
export const textSpans = (text: string, place?: string): Span[] => {
  const spans: Span[] = []
  const parts = place ? text.split(place) : [text]
  parts.forEach((part, i) => {
    if (i > 0) spans.push(...runs(place!, 'strong'))
    for (const run of part.split(MENTION)) {
      if (!run) continue
      if (run.startsWith('@')) spans.push(...runs(run, 'mention'))
      else spans.push({ text: run })
    }
  })
  return spans
}

/** One sentence, with the actor leading, and the place's name and mentions lifted out. */
const sentence = (name: string, body: string, place?: string): Span[] => {
  const rest = textSpans(body, place)
  const spaced = rest.map((s, i) => (i === 0 && s.text ? { ...s, text: ` ${s.text}` } : s))
  return [{ text: name, strong: true }, ...spaced]
}

const stripHtml = (raw: string): string =>
  raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isChatClass = (cls: string | undefined): boolean =>
  cls === Class.channel || cls === Class.direct || cls === Class.message || cls === Class.reply

const fallbackRoute = (row: Notice): string | undefined => {
  const target = row.attachedTo?.trim()
  if (!target) return undefined
  if (row.attachedToClass === Class.issue) return `/issues?issue=${encodeURIComponent(target)}`
  if (row.attachedToClass === Class.project) return `/projects/${encodeURIComponent(target)}/issues`
  if (row.attachedToClass === Class.channel || row.attachedToClass === Class.direct) {
    return `/chat/${encodeURIComponent(target)}`
  }
  return undefined
}

export function buildNote(
  row: Notice,
  crowd: readonly Person[],
  where: ReadonlyMap<string, Place>,
): Note {
  const actorRef = String(row.modifiedBy || row.createdBy || '')
  const actor = findPerson(crowd, actorRef)
  const name = (actor ? nameOf(actor) : actorRef ? nameOf({ _id: actorRef }) : '') || 'Teammate'
  const found = row.attachedTo ? where.get(row.attachedTo) : undefined
  const place = found?.label
  const kind: Note['kind'] = isChatClass(row.attachedToClass) ? 'chat' : 'task'

  const title = stripHtml(row.title ?? '')
  const body = stripHtml(row.body ?? '')
  const quoteRaw =
    kind === 'chat'
      ? found?.quote || (body && body !== title ? body : '')
      : ''
  const leadText =
    kind === 'chat'
      ? title || (place ? `sent a message in ${place}` : 'sent a message')
      : body || title || 'updated an item'

  return {
    id: row._id,
    kind,
    actor: { name, face: actor?.avatar ?? undefined },
    line: sentence(name, leadText, place),
    ...(quoteRaw ? { quote: textSpans(quoteRaw) } : {}),
    at: row.modifiedOn,
    place,
    to: found?.to ?? fallbackRoute(row),
    seen: row.isViewed,
  }
}
