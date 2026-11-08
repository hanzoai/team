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
import { Class, key, type Channel, type Issue, type Notice, type Project } from './model.ts'
import type { Plane } from './socket.ts'
import { update } from './write.ts'

export const notices = async (plane: Plane, space: string) => {
  const scoped = await plane.find<Notice>(Class.notice, { space })
  const rows = scoped.length > 0 ? scoped : await plane.find<Notice>(Class.notice)
  return rows.sort((a, b) => b.modifiedOn - a.modifiedOn)
}

export const keys = { notices: (space: string) => key(Class.notice, space) }

/**
 * Where each notification happened, by the id it is attached to.
 *
 * The platform stores a reference and lets a presenter name the place. There
 * are no presenters here, so the three kinds this product paints are resolved
 * directly: a message names its channel, an issue names its project, and a
 * project names itself. Anything else has no place, which a row is built to
 * say — it drops the separator with it rather than painting a bullet after
 * nothing.
 */
export const places = async (plane: Plane, space: string): Promise<Map<string, string>> => {
  const [scopedChannels, work, projects] = await Promise.all([
    plane.find<Channel>(Class.channel, { space }),
    plane.find<Issue>(Class.issue),
    plane.find<Project>(Class.project),
  ])
  const channels = scopedChannels.length > 0 ? scopedChannels : await plane.find<Channel>(Class.channel)
  const named = new Map<string, string>()
  for (const p of projects) named.set(p._id, p.name)
  for (const c of channels) named.set(c._id, `#${c.name}`)
  for (const i of work) {
    const project = named.get(i.space)
    if (project) named.set(i._id, project)
  }
  return named
}

/** Reading one. The flag is the platform's own, so every surface agrees. */
export const see = (plane: Plane, by: string, notice: Notice) =>
  plane.write(update(notice, by, { isViewed: true }))
