/**
 * What a conversation is made of, and how it is read and written.
 *
 * Everything here goes through the space's plane — one socket, `src/data`.
 */
import { Class as ModelClass, Tx, nameOf } from '~/data/model.ts'
import type { Plane, Wire } from '~/data/socket.ts'
import { lines, markup } from './text.ts'

export const Class = {
  channel: ModelClass.channel,
  direct: ModelClass.direct,
  message: ModelClass.message,
  reply: ModelClass.reply,
  reaction: ModelClass.reaction,
  person: ModelClass.person,
} as const

const TX_CREATE = Tx.create
const TX_REMOVE = Tx.remove

/** A place people talk. A channel has a name; a direct message has members. */
export type Room = {
  id: string
  kind: 'channel' | 'direct'
  name: string
  topic?: string
  private?: boolean
  archived?: boolean
  members: string[]
  /** External organizations connected to this channel via Hanzo Connect. */
  connectedOrgs?: string[]
}

/**
 * What a room is called. A direct message carries no name of its own on the
 * server, so it is the people in it.
 */
export const titled = (room: Pick<Room, 'name' | 'members'>, roster: readonly Person[]): string =>
  room.name ||
  room.members
    .map((m) => roster.find((p) => p.id === m)?.name)
    .filter((n): n is string => Boolean(n))
    .join(', ')

/** One thing somebody said. */
export type Message = {
  id: string
  room: string
  author: string
  /** The paragraphs, already reduced from the stored markup. */
  lines: string[]
  at: number
  /** How many replies hang off it. The thread itself is a separate read. */
  replies: number
  pinned?: boolean
}

/** One person's reaction to one message. */
export type Reaction = { id: string; message: string; emoji: string; by: string }

/** What to call somebody, and what to draw for them. */
export type Person = { id: string; name: string; avatar?: string; bot?: boolean }

type Doc = Record<string, unknown>

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

// ── reads ────────────────────────────────────────────────────────────────────

/**
 * Every room in the space, channels and direct messages together.
 *
 * Two classes, one list, because a person reading a sidebar is looking for a
 * conversation and does not care which class it is. They are asked for
 * separately because the platform stores them separately, and merged here so
 * nothing above this has to know that.
 */
export const rooms = async (plane: Plane): Promise<Room[]> => {
  const [channels, directs] = await Promise.all([
    plane.find<Doc>(Class.channel),
    plane.find<Doc>(Class.direct),
  ])
  return [
    ...channels.map((d) => room(d, 'channel')),
    ...directs.map((d) => room(d, 'direct')),
  ].filter((r) => !r.archived)
}

const extractConnectedOrgs = (d: Doc): string[] | undefined => {
  const orgs = new Set<string>()
  if (Array.isArray(d.bindings)) {
    for (const b of d.bindings) {
      if (typeof b === 'string' && b.startsWith('connect:')) {
        orgs.add(b.slice('connect:'.length))
      }
    }
  }
  const topic = str(d.topic) || str(d.description)
  for (const m of topic.matchAll(/connect:([a-z0-9_-]+)/gi)) {
    if (m[1]) orgs.add(m[1].toLowerCase())
  }
  const name = str(d.name)
  const cross = name.match(/^[a-z0-9]+-x-([a-z0-9_-]+)$/i)
  if (cross?.[1]) orgs.add(cross[1].toLowerCase())
  return orgs.size > 0 ? [...orgs] : undefined
}

const room = (d: Doc, kind: Room['kind']): Room => ({
  id: str(d._id),
  kind,
  name: str(d.name),
  topic: str(d.topic) || undefined,
  private: d.private === true,
  archived: d.archived === true,
  members: Array.isArray(d.members) ? d.members.filter((m): m is string => typeof m === 'string') : [],
  connectedOrgs: extractConnectedOrgs(d),
})

/**
 * One room's messages, oldest first — the order a conversation is read in.
 *
 * Sorted here rather than trusted from the wire: the store answers in whatever
 * order it walks, and two messages can share a millisecond, so the id breaks
 * the tie and a second read cannot reshuffle what a reader is looking at.
 */
export const messages = async (plane: Plane, room: string): Promise<Message[]> => {
  const docs = await plane.find<Doc>(Class.message, { attachedTo: room })
  return docs.map((d) => message(d, room)).sort(order)
}

const order = (a: Message, b: Message) => a.at - b.at || (a.id < b.id ? -1 : 1)

const message = (d: Doc, room: string): Message => ({
  id: str(d._id),
  room,
  author: str(d.createdBy) || str(d.modifiedBy),
  lines: lines(str(d.message)),
  at: num(d.createdOn) || num(d.modifiedOn),
  replies: num(d.replies),
  pinned: d.isPinned === true,
})

/** The replies hanging off one message, oldest first. */
export const replies = async (plane: Plane, message: string): Promise<Message[]> => {
  const docs = await plane.find<Doc>(Class.reply, { attachedTo: message })
  return docs.map((d) => ({ ...messageOf(d), room: message })).sort(order)
}

const messageOf = (d: Doc): Message => message(d, str(d.attachedTo))

/**
 * Every reaction on a room's messages, in one read.
 *
 * One query for the room rather than one per message: a room of two hundred
 * messages would otherwise open two hundred round trips on a socket that
 * answers them in order.
 */
export const reactions = async (plane: Plane, ids: string[]): Promise<Reaction[]> => {
  if (ids.length === 0) return []
  const docs = await plane.find<Doc>(Class.reaction, { attachedTo: { $in: ids } })
  return docs.map((d) => ({
    id: str(d._id),
    message: str(d.attachedTo),
    emoji: str(d.emoji),
    by: str(d.createBy) || str(d.createdBy),
  }))
}

/**
 * A name as it is SAID. The server stores `Last,First` (`personName` in
 * apps/team/projections.go; a one-token bot is `,name`).
 */
export const spoken = (stored: string): string => nameOf({ name: stored }).replace(/\s+/g, ' ')

/** The Employee mixin's position, wherever the store put the mixin. */
const positionOf = (d: Doc): string => {
  const mixin = d['contact:mixin:Employee']
  return str(d.position) || (mixin && typeof mixin === 'object' ? str((mixin as Doc).position) : '')
}

/** The roster, so a message can be drawn with a name instead of a uuid. */
export const people = async (plane: Plane): Promise<Person[]> => {
  const docs = await plane.find<Doc>(Class.person)
  return docs.map((d) => ({
    id: str(d.personUuid) || str(d._id),
    name: spoken(str(d.name)),
    avatar: str(d.avatar) || undefined,
    // The server projects an agent member with the position `Agent` (cloud apps/team projections.go).
    bot: positionOf(d) === 'Agent' || undefined,
  }))
}

// ── writes ───────────────────────────────────────────────────────────────────

/**
 * Say something in a room.
 *
 * The change is NOT applied locally. The transactor broadcasts every applied
 * transaction to every session on the space, this one included, so the write's
 * own effect arrives the same way somebody else's does — one path, and no
 * optimistic copy to disagree with the server the first time a write is
 * refused.
 */
export const say = (plane: Plane, room: Room, text: string, roster: readonly Person[] = []): Promise<void> =>
  plane.write(
    attached(id(), Class.message, room.id, room.id, classOf(room), 'messages', by(plane), {
      message: markup(text, roster),
    }),
  )

/** Reply to a message. A thread is a room whose parent is a message. */
export const reply = (
  plane: Plane,
  room: Room,
  message: Message,
  text: string,
  roster: readonly Person[] = [],
): Promise<void> =>
  plane.write(
    attached(id(), Class.reply, room.id, message.id, Class.message, 'replies', by(plane), {
      message: markup(text, roster),
      objectId: room.id,
      objectClass: classOf(room),
    }),
  )

/** React to a message. */
export const react = (plane: Plane, room: Room, message: Message, emoji: string): Promise<void> =>
  plane.write(
    attached(id(), Class.reaction, room.id, message.id, Class.message, 'reactions', by(plane), {
      emoji,
    }),
  )

/** Take a reaction back. */
export const unreact = (plane: Plane, room: Room, reaction: Reaction): Promise<void> =>
  plane.write({
    _class: TX_REMOVE,
    objectId: reaction.id,
    objectClass: Class.reaction,
    objectSpace: room.id,
    modifiedBy: by(plane),
    modifiedOn: Date.now(),
  })

/**
 * Create a Hanzo Connect shared channel between the current org and one or more
 * partner organizations.
 */
export const createConnectChannel = async (
  plane: Plane,
  name: string,
  partnerOrgs: string[],
  topic?: string,
): Promise<string> => {
  const cleanName = name.trim().replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const orgTags = partnerOrgs.map((o) => o.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '')).filter(Boolean)
  const roomId = `connect-${cleanName}-${id().slice(0, 8)}`
  const now = Date.now()
  const author = by(plane)
  const bindings = orgTags.map((o) => `connect:${o}`)
  const fullTopic = [topic?.trim(), ...bindings].filter(Boolean).join(' · ')

  await plane.write({
    _class: TX_CREATE,
    objectId: roomId,
    objectClass: Class.channel,
    objectSpace: 'core:space:Space',
    modifiedBy: author,
    modifiedOn: now,
    createdBy: author,
    createdOn: now,
    attributes: {
      name: cleanName,
      topic: fullTopic,
      description: fullTopic,
      private: false,
      archived: false,
      members: author ? [author] : [],
      owners: author ? [author] : [],
      life: 'standing',
      bindings,
    },
  })
  return roomId
}

const classOf = (r: Room): string => (r.kind === 'direct' ? Class.direct : Class.channel)

/**
 * Who a transaction is FROM.
 *
 * The transactor takes `modifiedBy` verbatim rather than deriving it from the
 * session, so the author is the client's to state — and `plane.account` is the
 * only thing that knows it, being the entry the socket opened with.
 */
const by = (plane: Plane): string => plane.account ?? ''

/**
 * A create transaction for a document that hangs off another.
 *
 * The shape is the server's own (`apps/team/projections.go`, `attachedCreateTx`)
 * and the field names are checked against it by `chat.test.ts`, because a
 * transaction with a misspelt field is applied rather than refused — it just
 * stores nothing under the name the reader looks for.
 */
const attached = (
  objectId: string,
  objectClass: string,
  objectSpace: string,
  attachedTo: string,
  attachedToClass: string,
  collection: string,
  modifiedBy: string,
  attributes: Record<string, unknown>,
): Wire => {
  const now = Date.now()
  return {
    _class: TX_CREATE,
    objectId,
    objectClass,
    objectSpace,
    modifiedBy,
    modifiedOn: now,
    createdBy: modifiedBy,
    createdOn: now,
    attributes,
    attachedTo,
    attachedToClass,
    collection,
  }
}

/** 16 random bytes as hex — the id shape the server mints for a message. */
const id = (): string =>
  [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

/**
 * Whether a broadcast touches a room, so a screen re-reads only when it must.
 *
 * The transactor pushes every transaction in the space; a channel with no
 * traffic should not re-read because a card moved on the board.
 */
export const touches = (txes: Wire[], room: string): boolean =>
  txes.some((t) => {
    const cls = str(t.objectClass)
    if (cls !== Class.message && cls !== Class.reaction && cls !== Class.reply) return false
    return str(t.objectSpace) === room || str(t.attachedTo) === room || cls !== Class.message
  })
