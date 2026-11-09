/**
 * Where the data door meets the regions, and the only module that knows both.
 *
 * Each region states the shape it needs — the board a `Source` of issues, the
 * inbox a `Source` of notes — and `src/data` states what the plane holds.
 * Neither imports the other, which is what keeps them independent; something
 * has to introduce them, and this is deliberately the second-smallest file in
 * the tree after `routes.tsx`.
 *
 * The mapping lives here rather than in either side because it is a fact about
 * the PAIR: a platform `IssueStatus.category` becoming the word `progress` is
 * not something the tracker knows or something the model states.
 */
import { useEffect, useMemo } from 'react'

import { Category, Class, Priority as PriorityNum, nameOf, ref, type Component, type Issue as Doc, type Person as Human, type Project, type Status, type Tag } from '~/data/model.ts'
import { see as seeNotice, notices, places } from '~/data/notice.ts'
import { useRead, type Read } from '~/data/query.ts'
import type { Plane } from '~/data/socket.ts'
import { useSpace, type Standing } from '~/data/space.tsx'
import { amend, components, issues, keys, move, open, people, project as readProject, projects, statuses, tags } from '~/data/tracker.ts'
import { create, remove as removeDoc } from '~/data/write.ts'
import { serve, useUnseen } from '~/inbox/feed.ts'
import type { Note, Span } from '~/inbox/note.ts'
import { setNotices, setTodo } from '~/shell'
import type { Standby } from '~/tracker/board/fixture.ts'
import type { Issue, IssuePatch, Person, Priority, Source as Board, Status as Column } from '~/tracker/board/model.ts'

/** A platform category, as the board spells it. */
const COLUMN: Record<string, Column> = {
  [Category.backlog]: 'backlog',
  [Category.todo]: 'todo',
  [Category.doing]: 'progress',
  [Category.done]: 'done',
  [Category.cancelled]: 'done',
}

/** The platform ranks priority 0..4; the board names the four it draws. */
const RANK = [undefined, 'urgent', 'high', 'medium', 'low'] as const

const PRIORITY_CODE: Record<Priority, number> = {
  urgent: PriorityNum.urgent,
  high: PriorityNum.high,
  medium: PriorityNum.medium,
  low: PriorityNum.low,
}

/**
 * Completion, 0..1.
 *
 * Time reported against time estimated, which is the only completion the model
 * actually holds — there is no percentage field, and inventing one from the
 * status would draw a ring that says nothing. An issue with no estimate reads
 * as zero rather than as full, because unknown is nearer to nothing done than
 * to everything done.
 */
const done = (issue: Doc): number => {
  const estimate = issue.estimation ?? 0
  if (estimate <= 0) return 0
  return Math.max(0, Math.min(1, (issue.reportedTime ?? 0) / estimate))
}

/** A platform person, as the board draws one. */
const face = (who: Human): Person => ({ id: who._id, name: nameOf(who), face: who.avatar ?? undefined })

/**
 * Everyone on a card: the assignee first, then the rest of the collaborators.
 *
 * Order is the whole point — the assignee is the one face that must survive
 * being the only one shown.
 */
const crew = (issue: Doc, crowd: Map<string, Human>): Person[] => {
  const ids = [issue.assignee, ...(issue.collaborators ?? [])].filter((id): id is string => !!id)
  const seen = new Set<string>()
  const out: Person[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const who = crowd.get(id)
    if (who) out.push(face(who))
  }
  return out
}

/** What the board reads, gathered once per revision rather than once per card. */
type World = {
  columns: Map<string, Column>
  crowd: Map<string, Human>
  words: Map<string, string[]>
  parts: Map<string, string>
  project: Project | undefined
  projects: Map<string, Project>
}

const card = (issue: Doc, world: World): Issue => ({
  id: issue._id,
  key: ref(world.project ?? world.projects.get(issue.space), issue),
  title: issue.title,
  description: issue.description,
  projectId: issue.space,
  status: world.columns.get(issue.status) ?? 'backlog',
  priority: RANK[issue.priority] ?? undefined,
  labels: world.words.get(issue._id) ?? [],
  done: done(issue),
  people: crew(issue, world.crowd),
  origin: issue.component ? named(world.parts.get(issue.component)) : undefined,
  files: issue.attachments ?? 0,
  replies: issue.comments ?? 0,
})

/** A component the board can name, or nothing at all — never a placeholder
 *  standing where a name was expected. */
const named = (label: string | undefined) => (label ? { name: label } : undefined)

/** Which board column each of a space's statuses belongs to. */
const columnsOf = (rows: Status[]) =>
  new Map(rows.map((c) => [c._id, COLUMN[c.category] ?? 'backlog'] as const))

/**
 * Opening an issue in a project.
 *
 * The identifier is the project's sequence plus one. The platform allocates it
 * inside a conditional apply so two people creating at once cannot both take
 * it; that shape is not reachable through a single transaction, so this is
 * optimistic and the server is the authority. A collision shows up as two cards
 * sharing an identifier — visible, and recoverable, unlike a lost card.
 */
const adder = (plane: Plane, space?: string) => async (to: Column, title: string, patch?: IssuePatch) => {
  const targetSpace = space ?? 'proj-crm'
  const [work, columns, project] = await Promise.all([
    issues(plane, targetSpace),
    statuses(plane, targetSpace),
    readProject(plane, targetSpace),
  ])
  const target = columns.find((c) => (COLUMN[c.category] ?? 'backlog') === to) ?? columns[0]
  if (!target) throw new Error(`this project has no ${to} column`)
  const number = Math.max(project?.sequence ?? 0, ...work.map((i) => i.number)) + 1
  const priority = patch?.priority ? PRIORITY_CODE[patch.priority] : 0
  await open(plane, plane.account ?? '', targetSpace, {
    title,
    status: target._id,
    priority,
    number,
    after: work.find((i) => i.status === target._id),
  })
  if (patch && (patch.description || patch.assigneeId || (patch.labels && patch.labels.length > 0))) {
    const fresh = await issues(plane, targetSpace)
    const created = fresh.find((i) => i.number === number && i.title === title)
    if (created) {
      await amend(plane, plane.account ?? '', created, {
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.assigneeId !== undefined
          ? { assignee: patch.assigneeId, collaborators: patch.assigneeId ? [patch.assigneeId] : [] }
          : {}),
      })
      if (patch.labels && patch.labels.length > 0) {
        for (const label of patch.labels) {
          await plane.write(
            create(targetSpace, plane.account ?? '', Class.tag, {
              attachedTo: created._id,
              attachedToClass: Class.issue,
              collection: 'labels',
              tag: `tag-${label.toLowerCase()}`,
              title: label,
            }),
          )
        }
      }
    }
  }
}

/**
 * The board's source over the space plane.
 *
 * `watch` re-reads on every transaction the plane broadcasts, which is how a
 * card somebody else moved arrives — and how a card THIS browser moved arrives,
 * because the server echoes a write back to the session that made it. One path,
 * so the two cannot disagree.
 */
const board = (plane: Plane, space?: string): Board => ({
  watch(next, fail) {
    let live = true
    const read = () => {
      void Promise.all([
        statuses(plane, space),
        issues(plane, space),
        people(plane),
        tags(plane),
        components(plane),
        projects(plane),
      ])
        .then(async ([columns, work, crowd, marks, parts, allProjects]) => {
          if (!live) return
          const project = space && work.length ? await readProject(plane, space) : undefined
          if (!live) return
          const words = new Map<string, string[]>()
          for (const t of marks as Tag[]) {
            const held = words.get(t.attachedTo)
            if (held) held.push(t.title)
            else words.set(t.attachedTo, [t.title])
          }
          const world: World = {
            columns: columnsOf(columns as Status[]),
            crowd: new Map(crowd.map((p) => [p._id, p])),
            words,
            parts: new Map((parts as Component[]).map((c) => [c._id, c.label])),
            project,
            projects: new Map((allProjects as Project[]).map((p) => [p._id, p])),
          }
          next(work.map((issue) => card(issue, world)))
        })
        .catch((e: unknown) => live && fail(e instanceof Error ? e : new Error(String(e))))
    }
    read()
    const stop = plane.watch(read)
    return () => {
      live = false
      stop()
    }
  },
  add: adder(plane, space),
  async move(id, to, before) {
    const work = await issues(plane, space)
    const held = work.find((i) => i._id === id)
    if (!held) throw new Error('no issue to move')
    const columns = await statuses(plane, held.space)
    const target = columns.find((c) => (COLUMN[c.category] ?? 'backlog') === to)
    if (!target) throw new Error('no column to move into')
    const column = work.filter((i) => i.status === target._id && i._id !== id)
    const at = before ? column.findIndex((i) => i._id === before) : column.length
    const cut = at < 0 ? column.length : at
    await move(plane, plane.account ?? '', held, target._id, {
      before: column[cut - 1],
      after: column[cut],
    })
  },
  async update(id, patch) {
    const work = await issues(plane, space)
    const held = work.find((i) => i._id === id)
    if (!held) return
    const fields: Partial<Doc> = {}
    if (patch.title !== undefined) fields.title = patch.title
    if (patch.description !== undefined) fields.description = patch.description
    if (patch.priority !== undefined) {
      fields.priority = patch.priority ? PRIORITY_CODE[patch.priority] : 0
    }
    if (patch.done !== undefined) {
      const est = held.estimation && held.estimation > 0 ? held.estimation : 100
      fields.estimation = est
      fields.reportedTime = Math.round(Math.max(0, Math.min(1, patch.done)) * est)
    }
    if (patch.assigneeId !== undefined) {
      fields.assignee = patch.assigneeId
      const rest = (held.collaborators ?? []).filter((c) => c !== patch.assigneeId)
      fields.collaborators = patch.assigneeId ? [patch.assigneeId, ...rest] : rest
    }
    if (patch.replies !== undefined) {
      fields.comments = patch.replies
    }
    if (patch.status !== undefined) {
      const cols = await statuses(plane, held.space)
      const target = cols.find((c) => (COLUMN[c.category] ?? 'backlog') === patch.status)
      if (target) fields.status = target._id
    }
    if (Object.keys(fields).length > 0) {
      await amend(plane, plane.account ?? '', held, fields)
    }
    if (patch.labels !== undefined) {
      const existing = (await tags(plane)).filter((t) => t.attachedTo === id)
      for (const old of existing) {
        await plane.write(removeDoc(old, plane.account ?? ''))
      }
      for (const label of patch.labels) {
        await plane.write(
          create(held.space, plane.account ?? '', Class.tag, {
            attachedTo: id,
            attachedToClass: Class.issue,
            collection: 'labels',
            tag: `tag-${label.toLowerCase()}`,
            title: label,
          }),
        )
      }
    }
  },
  async remove(id) {
    const work = await issues(plane, space)
    const held = work.find((i) => i._id === id)
    if (!held) return
    await plane.write(removeDoc(held, plane.account ?? ''))
  },
})

/**
 * The board's backend, or null while no space is open.
 *
 * `project` names one project's board; without it the board is every project
 * this person can see. The connection is already the workspace, so that is the
 * only scope a caller ever states.
 */
export const useBoard = (project?: string): Board | null => {
  const { plane, current } = useSpace()
  return useMemo(
    () => (plane && current ? board(plane, project) : null),
    [plane, current, project],
  )
}

/** The faces a board's head carries: a project's members, or the whole space. */
export const useCrew = (project?: string): Person[] => {
  const { plane } = useSpace()
  const crowd = useRead(keys.people(), () => people(plane!), { enabled: !!plane })
  const all = useRead(keys.projects(), () => projects(plane!), { enabled: !!plane })
  const held = project ? (all.data ?? []).find((p) => p._id === project)?.members : undefined
  const byId = new Map((crowd.data ?? []).map((p) => [p._id, p]))
  const rows = held ? held.map((id) => byId.get(id)) : (crowd.data ?? [])
  return rows.filter((p): p is Human => !!p).map(face)
}

/**
 * What every region reads before a space is open.
 *
 * One mapping, so the board and the inbox beside it can never disagree about
 * which of the three it is — an endless skeleton over a refusal and a refusal
 * over a space still opening are the two ways this goes wrong, and they go
 * wrong in opposite directions.
 */
export const standingIs = (standing: Standing): Standby =>
  standing === 'refused' ? 'refused' : standing === 'homeless' ? 'nowhere' : 'opening'

/** Every project this person is in, in three phases. */
export const useProjects = (): Read<Project[]> => {
  const { plane } = useSpace()
  return useRead(keys.projects(), () => projects(plane!), { enabled: !!plane })
}

/** A project by id, for whoever has to name one. */
export const useProject = (id?: string): Project | undefined => {
  const all = useProjects()
  return id ? (all.data ?? []).find((p) => p._id === id) : undefined
}

/**
 * A notification's sentence.
 *
 * The platform stores a reference plus a type and lets a presenter compose the
 * words; there are no presenters here, so the sentence is the runs the
 * documents carry — who acted, and what the notification says. Two of those
 * runs are ENTITIES and the reference emphasises both: the person, and the
 * thing acted on wherever its name falls in the sentence. Whoever the message
 * addresses by name carries the alert hue instead, which is the one run that
 * means it is about you.
 *
 * Splitting on a name the document itself supplies is why this is mechanical
 * rather than a guess about English.
 */
const MENTION = /(@[\w.-]+)/g

const runs = (text: string, kind: 'strong' | 'mention'): Span[] =>
  text ? [{ text, [kind]: true }] : []

/** One sentence, with the place's name and any mention lifted out of it. */
const sentence = (name: string, body: string, place?: string): Span[] => {
  const spans: Span[] = [{ text: name, strong: true }]
  const parts = place ? body.split(place) : [body]
  parts.forEach((part, i) => {
    if (i > 0) spans.push(...runs(place!, 'strong'))
    for (const run of part.split(MENTION)) {
      if (!run) continue
      if (run.startsWith('@')) spans.push(...runs(run, 'mention'))
      else spans.push({ text: run })
    }
  })
  return spans.map((s, i) => (i === 1 && s.text ? { ...s, text: ` ${s.text}` } : s))
}

const note = (
  row: Awaited<ReturnType<typeof notices>>[number],
  crowd: Map<string, Human>,
  where: Map<string, string>,
): Note => {
  const actor = crowd.get(String(row.modifiedBy ?? ''))
  const name = actor ? nameOf(actor) : 'Somebody'
  const place = where.get(String(row.attachedTo ?? ''))
  return {
    id: row._id,
    kind:
      row.attachedToClass === Class.channel ||
      row.attachedToClass === Class.direct ||
      row.attachedToClass === Class.message
        ? 'chat'
        : 'task',
    actor: { name, face: actor?.avatar ?? undefined },
    line: sentence(name, row.body ?? row.title ?? '', place),
    at: row.modifiedOn,
    place,
    seen: row.isViewed,
  }
}

/**
 * Hand the inbox its backend.
 *
 * The feed keeps one source at module scope, so this is an effect rather than a
 * value — and it re-runs on a space change, because a feed read in one space is
 * not true in another.
 */
export const Serve = () => {
  const { plane, current, standing } = useSpace()
  useEffect(() => {
    // Always serve, even with nothing to serve from. The feed keeps a fixture
    // as its own default so the region can be developed alone, and a live build
    // that left it installed would paint five invented notifications beside a
    // real board — a mock presented as working, which is worse than an empty
    // panel. What it is handed instead says which of the three it is, from the
    // same mapping the board reads.
    if (!plane || !current) {
      const held = standingIs(standing)
      const answer =
        held === 'refused'
          ? () => Promise.reject(new Error('Your workspace is not answering.'))
          : held === 'nowhere'
            ? () => Promise.resolve([])
            : () => new Promise<never>(() => {})
      serve({ list: answer, see: () => Promise.resolve() })
      return
    }
    const space = current.uuid
    serve({
      async list() {
        const [rows, crowd, where] = await Promise.all([
          notices(plane, space),
          people(plane),
          places(plane, space),
        ])
        const byPerson = new Map(crowd.map((p) => [p._id, p]))
        return rows.map((row) => note(row, byPerson, where))
      },
      async see(id: string) {
        const rows = await notices(plane, space)
        const row = rows.find((r) => r._id === id)
        if (row && !row.isViewed) await seeNotice(plane, plane.account ?? '', row)
      },
    })
  }, [plane, current, standing])

  return (
    <>
      <Waiting />
      <Left />
    </>
  )
}

/**
 * The bell's mark.
 *
 * The count has to be right while the panel is CLOSED, so it is read from the
 * feed rather than reported by the panel — a number that only moved while
 * somebody was looking at it is a stale mark exactly when it matters.
 */
const Waiting = () => {
  const waiting = useUnseen()
  useEffect(() => setNotices(waiting), [waiting])
  return null
}

/**
 * The rail's gauge: what share of the work is still to do.
 *
 * A fact about the tracker, painted on a column the tracker does not own, so it
 * is published into the shell's sink rather than imported by the rail. Nothing
 * to count is nothing to say, and the gauge draws an em-dash rather than a
 * confident zero.
 */
const Left = () => {
  const { plane } = useSpace()
  const columns = useRead(keys.statuses(), () => statuses(plane!), { enabled: !!plane })
  const work = useRead(keys.issues(), () => issues(plane!), { enabled: !!plane })
  const where = columnsOf(columns.data ?? [])
  const rows = work.data ?? []
  const left = rows.filter((i) => where.get(i.status) !== 'done').length
  const share = rows.length ? Math.round((left / rows.length) * 100) : null

  useEffect(() => setTodo(share), [share])
  return null
}
