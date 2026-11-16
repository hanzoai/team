/**
 * The tracker, over the space plane.
 *
 * There is no REST for any of this. Projects, statuses, issues, people and
 * their transactions all ride the transactor socket, so every function here
 * takes a `Plane` and nothing here knows a URL. That is also why the tracker
 * cannot be read at all until a space is open: a screen asking for issues with
 * no plane is not empty, it is unanswered, and saying the first would be a lie
 * a board then paints as a space with no work in it.
 */
import { Category, Class, key, type Component, type Issue, type Person, type Project, type Status, type Tag } from './model.ts'
import type { Plane } from './socket.ts'
import { between, create, mint, unless, update } from './write.ts'

/** The order the four categories stand in on a board. Left to right. */
export const ORDER = [Category.backlog, Category.todo, Category.doing, Category.done] as const

export const projects = (plane: Plane) => plane.find<Project>(Class.project)

export const project = (plane: Plane, id: string) => plane.one<Project>(Class.project, { _id: id })

/**
 * The columns a new project's board starts with: one status per category, in
 * board order.
 *
 * A board's columns are the project's OWN statuses (`statuses` reads them by
 * the project's id). The platform's model ships five statuses too, but they sit
 * in the model's space under the model's categories, which no board here reads,
 * so a project opened without these has a board with nowhere to put a card.
 */
export const COLUMNS = [
  { name: 'Backlog', category: Category.backlog },
  { name: 'Todo', category: Category.todo },
  { name: 'In Progress', category: Category.doing },
  { name: 'Done', category: Category.done },
] as const

/** A project's key, which prefixes its issues (`ENG-42`): a letter, then up to four letters or digits. */
export const KEY = /^[A-Z][A-Z0-9]{0,4}$/

/**
 * The key a name suggests: the initials of its words, or the first three
 * letters of a single word. A word is a run starting with a letter, so the key
 * always does too. '' when the name has no such word, and the person types one.
 */
export const keyOf = (name: string): string => {
  const words = name.toUpperCase().match(/[A-Z][A-Z0-9]*/g) ?? []
  if (words.length === 0) return ''
  return (words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join('')).slice(0, 5)
}

/**
 * Open a project, with the columns its board needs, as one conditional write.
 *
 * The condition is the key: when a project in the space already holds it, the
 * server refuses the whole write, so two people taking one key at once cannot
 * both have it, and a project never lands without its columns.
 *
 * The person who opens it is its first member, under the id the server checks
 * membership by: the bare account, not the `hanzo:` spelling a transaction's
 * author carries.
 *
 * Resolves to the new project's id, or null when the key was taken.
 */
export const start = async (
  plane: Plane,
  by: string,
  fields: { name: string; identifier: string; description?: string },
): Promise<string | null> => {
  if (!by) throw new Error('nobody is signed in to this space')
  if (!KEY.test(fields.identifier)) throw new Error(`"${fields.identifier}" is not a project key`)
  const id = mint()
  const columns = COLUMNS.map((c) =>
    create(id, by, Class.status, {
      name: c.name,
      category: c.category,
      ofAttribute: 'tracker:attribute:IssueStatus',
      rank: between(),
    }),
  )
  const opened = create(
    'core:space:Space',
    by,
    Class.project,
    {
      name: fields.name,
      description: fields.description ?? '',
      identifier: fields.identifier,
      sequence: 0,
      defaultIssueStatus: columns[0].objectId,
      members: [by.replace(/^hanzo:/, '')],
      private: false,
      archived: false,
    },
    id,
  )
  const held = await plane.apply(
    unless(by, [{ _class: Class.project, query: { identifier: fields.identifier } }], [opened, ...columns]),
  )
  return held ? id : null
}

/**
 * A project's workflow states, in board order.
 *
 * The platform stores an order WITHIN a category and says nothing about the
 * categories themselves, so the outer order is stated here — it is the same on
 * every board and is not a per-space fact.
 */
export const statuses = async (plane: Plane, space?: string) => {
  const rows = await plane.find<Status>(Class.status, space ? { space } : {})
  const rank = new Map<string, number>(ORDER.map((c, i) => [c, i]))
  return rows.sort(
    (a, b) =>
      (rank.get(a.category) ?? ORDER.length) - (rank.get(b.category) ?? ORDER.length) ||
      (a.rank ?? '').localeCompare(b.rank ?? ''),
  )
}

/**
 * The issues on a board.
 *
 * `space` is the PROJECT, which is what the platform means by the word — a
 * connection is already a workspace and a query never says so. Omitting it is
 * the All-issues board: every project this person can see, in one set.
 */
export const issues = async (plane: Plane, space?: string) => {
  const rows = await plane.find<Issue>(Class.issue, space ? { space } : {})
  return rows.sort((a, b) => (a.rank ?? '').localeCompare(b.rank ?? '') || a.number - b.number)
}

export const people = (plane: Plane) => plane.find<Person>(Class.person)

/** Every tag attached to anything on the board. One read for the whole board:
 *  a read per card is one round trip per card. */
export const tags = (plane: Plane) => plane.find<Tag>(Class.tag)

/** The components a project is divided into. A card names the one it is in. */
export const components = (plane: Plane) => plane.find<Component>(Class.component)

/** The keys these reads are held under. The class comes first; see `key`. */
export const keys = {
  projects: () => key(Class.project),
  statuses: (space?: string) => key(Class.status, space),
  issues: (space?: string) => key(Class.issue, space),
  people: () => key(Class.person),
  tags: () => key(Class.tag),
  components: () => key(Class.component),
}

/**
 * Move an issue: a new column, and a rank between the two cards it landed
 * between.
 *
 * One transaction, and the change reaches this screen the same way it reaches
 * everybody else's — on the broadcast. There is no local patch, because a local
 * patch and a broadcast are two implementations of one fact and they disagree
 * the first time a write is refused.
 */
export const move = (
  plane: Plane,
  by: string,
  issue: Issue,
  status: string,
  neighbours: { before?: Issue; after?: Issue } = {},
) =>
  plane.write(
    update(issue, by, {
      status,
      rank: between(neighbours.before?.rank, neighbours.after?.rank),
    }),
  )

/** Anything else about an issue: a title, an assignee, a priority, an estimate. */
export const amend = (plane: Plane, by: string, issue: Issue, fields: Partial<Issue>) =>
  plane.write(update(issue, by, fields as Record<string, unknown>))

/**
 * A new issue at the top of a column.
 *
 * The number is the project's `sequence` incremented in the same breath. The
 * platform allocates it with `$inc` inside a conditional apply so two people
 * creating at once cannot both take 43; that shape is not reachable through
 * this client's single-transaction write, so the number here is optimistic and
 * the server is the authority on it. A collision shows up as two cards sharing
 * an identifier, which is visible and recoverable — unlike a lost card.
 */
export const open = (
  plane: Plane,
  by: string,
  space: string,
  fields: { title: string; status: string; priority: number; number: number; after?: Issue },
) =>
  plane.write(
    create(space, by, Class.issue, {
      title: fields.title,
      status: fields.status,
      priority: fields.priority,
      number: fields.number,
      rank: between(undefined, fields.after?.rank),
      assignee: null,
      subIssues: 0,
      comments: 0,
      attachments: 0,
      estimation: 0,
      reportedTime: 0,
      remainingTime: 0,
    }),
  )
