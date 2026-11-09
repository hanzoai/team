/**
 * The workspace domain vocabulary.
 *
 * Every document carries the four core metadata fields (`_id`, `_class`,
 * `space`, `modifiedOn`); the remaining fields are specific to each entity.
 */

export const Class = {
  project: 'team:class:Project',
  issue: 'team:class:Issue',
  status: 'team:class:IssueStatus',
  milestone: 'team:class:Milestone',
  component: 'team:class:Component',
  person: 'team:class:Person',
  channel: 'team:class:Channel',
  direct: 'team:class:DirectMessage',
  message: 'team:class:ChatMessage',
  reply: 'team:class:ThreadMessage',
  reaction: 'team:class:Reaction',
  notice: 'team:class:ActivityInboxNotification',
  tag: 'team:class:TagReference',
} as const

export const Tx = {
  create: 'team:tx:CreateDoc',
  update: 'team:tx:UpdateDoc',
  remove: 'team:tx:RemoveDoc',
} as const

/** The four fields the platform puts on every document. */
export type Doc = {
  _id: string
  _class: string
  space: string
  modifiedOn: number
  modifiedBy?: string
  createdOn?: number
  createdBy?: string
}

/**
 * A workflow state's category, and there are exactly four.
 *
 * The platform stores an ordinal on `IssueStatus.category`; these are the ids
 * that ordinal names. A board's columns are the space's statuses grouped by it,
 * which is why the theme has four state colours and not one per status.
 */
export const Category = {
  backlog: 'team:statusCategory:Backlog',
  todo: 'team:statusCategory:Unstarted',
  doing: 'team:statusCategory:Started',
  done: 'team:statusCategory:Completed',
  cancelled: 'team:statusCategory:Cancelled',
} as const

/**
 * Priority, as the platform ranks it: 0 none, 1 urgent, 2 high, 3 medium,
 * 4 low. The theme collapses these to two tiers for colour; the label keeps
 * all four, because the label is where the distinction is real.
 */
export const Priority = { none: 0, urgent: 1, high: 2, medium: 3, low: 4 } as const
export const priorityName = ['No priority', 'Urgent', 'High', 'Medium', 'Low'] as const

export type Project = Doc & {
  name: string
  description?: string
  identifier: string
  sequence: number
  defaultIssueStatus?: string
  members?: string[]
  private?: boolean
  archived?: boolean
  icon?: string
}

export type Status = Doc & {
  name: string
  description?: string
  /** One of `Category`. A board column is a group of statuses sharing one. */
  category: string
  /** The platform's own ordering within a category. */
  rank?: string
  color?: number
}

export type Issue = Doc & {
  title: string
  description?: string
  /** A `Status._id`. The column a card sits in. */
  status: string
  priority: number
  /** The per-project ordinal that makes `PROJ-42`. */
  number: number
  /** A `Person._id`, or null when nobody holds it. */
  assignee?: string | null
  component?: string | null
  milestone?: string | null
  dueDate?: number | null
  /** Points, whatever the space means by them. */
  estimation?: number
  reportedTime?: number
  remainingTime?: number
  /** Collection sizes the platform maintains; the card paints them. */
  subIssues?: number
  comments?: number
  attachments?: number
  labels?: number
  /**
   * Everyone following this issue.
   * The assignee is one of them; a card draws the set and the assignee first.
   */
  collaborators?: string[]
  /** The platform's own ordering within a column. */
  rank?: string
}

/** A tag on a document. The word is on the reference, so a card paints it. */
export type Tag = Doc & {
  attachedTo: string
  attachedToClass?: string
  /** The tag's own document, when the space keeps one. */
  tag?: string
  title: string
  color?: number
}

/** A part of a project. A card names the one it belongs to. */
export type Component = Doc & {
  label: string
  description?: string
  lead?: string | null
}

export type Person = Doc & {
  name: string
  avatar?: string | null
  city?: string
}

export type Channel = Doc & {
  name: string
  topic?: string
  description?: string
  private?: boolean
  archived?: boolean
  members?: string[]
  life?: string
  bindings?: string[]
}

export type Message = Doc & {
  message: string
  attachedTo?: string
  attachedToClass?: string
  collection?: string
  editedOn?: number
  reactions?: number
}

export type Notice = Doc & {
  title?: string
  body?: string
  isViewed: boolean
  attachedTo?: string
  attachedToClass?: string
  /** The platform's own type id — a mention, an assignment, a reply. */
  types?: string[]
}

/** A person's display name. */
export const nameOf = (person: { name?: string } | undefined | null): string =>
  (person?.name ?? '').trim()

/** `PROJ-42`, the id a person actually quotes. */
export const ref = (project: Pick<Project, 'identifier'> | undefined, issue: Pick<Issue, 'number'>) =>
  project ? `${project.identifier}-${issue.number}` : `#${issue.number}`

/**
 * A cache key. The CLASS comes first and nothing else may, because forgetting
 * a class by prefix is how another person's change reaches this screen: the
 * plane broadcasts a transaction, `<Space>` drops every key beginning with its
 * `objectClass`, and the reads under it run again. A key that buried the class
 * would need a table mapping classes to families, and that table is exactly the
 * thing that goes stale.
 */
export const key = (cls: string, ...parts: (string | number | undefined | null)[]) =>
  [cls, ...parts.map((p) => p ?? '')].join('|')
