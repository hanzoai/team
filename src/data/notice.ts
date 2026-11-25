/**
 * The inbox, over the space plane.
 *
 * The feed is generated server-side — `notify.go` projects mentions, direct
 * messages, comments and assignee changes into the platform's notification
 * objects, each carrying its own read flag — so this is a read of documents and
 * not a second feed built here out of activity. Reading one is a transaction
 * like any other, which is why it reaches this browser's other tabs and this
 * person's other devices without anything polling.
 */
import { Class, findPerson, key, nameOf, type Channel, type Issue, type Message, type Notice, type Person, type Project } from './model.ts'
import type { Plane } from './socket.ts'
import { update } from './write.ts'

export type Place = {
  label: string
  to: string
  quote?: string
}

export const notices = async (plane: Plane, space: string) => {
  const scoped = await plane.find<Notice>(Class.notice, { space })
  const rows = scoped.length > 0 ? scoped : await plane.find<Notice>(Class.notice)
  return rows.sort((a, b) => b.modifiedOn - a.modifiedOn)
}

export const keys = { notices: (space: string) => key(Class.notice, space) }

/** Strip basic HTML/ProseMirror tags to plain text for inbox message quotes. */
const plain = (raw: string): string =>
  raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Where each notification happened, by the id it is attached to, along with its
 * destination route and optional message quote (#394/#400).
 */
export const placeIndex = async (
  plane: Plane,
  space: string,
  crowd: readonly Person[] = [],
  rows: readonly Notice[] = [],
): Promise<Map<string, Place>> => {
  const messageIds = [...new Set(
    rows
      .filter((r) => r.attachedToClass === Class.message && r.attachedTo)
      .map((r) => r.attachedTo!),
  )]
  const replyIds = [...new Set(
    rows
      .filter((r) => r.attachedToClass === Class.reply && r.attachedTo)
      .map((r) => r.attachedTo!),
  )]

  const [scopedChannels, directs, work, projects, messages, replies] = await Promise.all([
    plane.find<Channel>(Class.channel, { space }),
    plane.find<Channel>(Class.direct),
    plane.find<Issue>(Class.issue),
    plane.find<Project>(Class.project),
    messageIds.length > 0 ? plane.find<Message>(Class.message, { _id: { $in: messageIds } }) : Promise.resolve([]),
    replyIds.length > 0 ? plane.find<Message>(Class.reply, { _id: { $in: replyIds } }) : Promise.resolve([]),
  ])
  const channels = scopedChannels.length > 0 ? scopedChannels : await plane.find<Channel>(Class.channel)
  const index = new Map<string, Place>()

  for (const p of projects) {
    index.set(p._id, { label: p.name, to: `/projects/${encodeURIComponent(p._id)}/issues` })
  }
  for (const c of channels) {
    index.set(c._id, { label: `#${c.name}`, to: `/chat/${encodeURIComponent(c._id)}` })
  }
  for (const d of directs) {
    const memberNames = (d.members ?? [])
      .map((m) => findPerson(crowd, m))
      .filter((p): p is Person => Boolean(p))
      .map((p) => nameOf(p))
      .filter(Boolean)
    const label = d.name?.trim() || (memberNames.length > 0 ? memberNames.join(', ') : 'Direct message')
    index.set(d._id, { label, to: `/chat/${encodeURIComponent(d._id)}` })
  }
  for (const i of work) {
    const project = index.get(i.space)?.label ?? 'Issues'
    index.set(i._id, { label: project, to: `/issues?issue=${encodeURIComponent(i._id)}` })
  }
  for (const m of messages) {
    const roomId = m.attachedTo || m.space
    const roomPlace = roomId ? index.get(roomId) : undefined
    const quote = plain(m.message ?? '')
    index.set(m._id, {
      label: roomPlace?.label ?? 'Chat',
      to: roomId ? `/chat/${encodeURIComponent(roomId)}?msg=${encodeURIComponent(m._id)}` : '/chat',
      ...(quote ? { quote } : {}),
    })
  }
  for (const r of replies) {
    const roomId = r.space
    const roomPlace = roomId ? index.get(roomId) : undefined
    const quote = plain(r.message ?? '')
    const msgTarget = r.attachedTo || r._id
    index.set(r._id, {
      label: roomPlace?.label ?? 'Chat',
      to: roomId ? `/chat/${encodeURIComponent(roomId)}?msg=${encodeURIComponent(msgTarget)}` : '/chat',
      ...(quote ? { quote } : {}),
    })
  }
  return index
}

export const places = async (plane: Plane, space: string): Promise<Map<string, string>> => {
  const index = await placeIndex(plane, space)
  return new Map([...index.entries()].map(([k, v]) => [k, v.label]))
}

/** Reading one. The flag is the platform's own, so every surface agrees. */
export const see = (plane: Plane, by: string, notice: Notice) =>
  plane.write(update(notice, by, { isViewed: true }))
