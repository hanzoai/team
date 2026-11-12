/**
 * The names, so no component writes a colour.
 *
 * tokens.css chooses the values; this file is the only way to reach one. A
 * component reads `paint.card`, never `var(--team-card)` and never a hex — one
 * spelling, checked by the compiler, and a role that moves moves everywhere.
 *
 * The type ladder, the spacing ramp and the radii are @hanzo/gui's published
 * `$N` tokens and are NOT restated here. What is stated is which rung each ROLE
 * lands on, because that is the decision four regions would otherwise take
 * separately and take differently.
 */

/** A CSS reference to one role. The value lives in tokens.css. */
const role = <N extends string>(name: N) => `var(--team-${name})` as const

export const paint = {
  /** The app. The main canvas sits directly on it (#171717 dark / #ffffff light). */
  ground: role('ground'),
  /** The board, chat, and inbox canvas. */
  panel: role('panel'),
  /** A card, and an unread row: the same rung, because both are objects. */
  card: role('card'),
  /** The one hairline, at a fixed alpha so it lifts with its surface. */
  rule: role('rule'),

  /** Unified outer L-frame chrome (38px top bar + 44px icon rail + 240px sidebar). */
  bar: role('bar'),
  barRule: role('bar-rule'),
  rail: role('rail'),
  railRule: role('rail-rule'),
  railActive: role('rail-active'),
  railFg: role('rail-fg'),
  railFgActive: role('rail-fg-active'),
  sidebar: role('sidebar'),
  sidebarRule: role('sidebar-rule'),
  rowActive: role('row-active'),
  rowHover: role('row-hover'),
  avatar: role('avatar'),
  avatarInk: role('avatar-ink'),
  composer: role('composer'),
  composerRule: role('composer-rule'),
  composerAccent: role('composer-accent'),
  composerAccentInk: role('composer-accent-ink'),
  composerWarn: role('composer-warn'),
  chatUser: role('chat-user'),
  chatUserInk: role('chat-user-ink'),

  ink: role('ink'),
  mute: role('mute'),
  dim: role('dim'),

  /** Where you are and how many: active tab, active breadcrumb, count, progress. */
  accent: role('accent'),
  /** Addressed to you: a mention, the bell, an unread you are named in. */
  alert: role('alert'),
} as const

/** The four workflow states, by category. `IssueStatus.category` is the model's. */
export const state = {
  backlog: role('backlog'),
  todo: role('todo'),
  doing: role('doing'),
  done: role('done'),
} as const

export type State = keyof typeof state

/** Six categorical slots. Nothing outside this module names one. */
const SLOTS = 6

/**
 * Which slot a thing gets, from its id.
 *
 * A stable hash rather than a table: the labels, the projects and the
 * components all come from a space nobody here has seen, so a per-name table
 * would be a table of guesses that goes stale the first time someone adds a
 * tag. The same id gets the same slot on every screen and in every session,
 * which is the only property a reader actually depends on.
 */
export const slot = (id: string): number => {
  const key = id.toLowerCase()
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return (Math.abs(h) % SLOTS) + 1
}

/**
 * A chip. Its slot's hue as the fill, the ground as the ink.
 *
 * One value serves the fill and the dot because the ramp's lightness was chosen
 * for both; a second, quieter value per slot would be a second thing to keep in
 * step for no reading a person actually makes.
 */
export const chip = (id: string) =>
  ({ background: `var(--team-hue-${slot(id)})`, color: 'var(--team-chip-ink)' }) as const

/** A mark that carries a colour of its own — a project glyph, a component. */
export const mark = (id: string) => `var(--team-hue-${slot(id)})` as const

/**
 * Priority reads as two tiers, and that is the whole scheme.
 *
 * The platform ranks four, and a colour that separates Low from Medium spends
 * the one signal that has to survive a glance on a distinction the label
 * already makes. Urgent and High carry the alert hue; the rest carry none.
 */
export const urgent = (priority: number) => priority === 1 || priority === 2

/**
 * Priority as a chip, and it has two faces because priority has two tiers.
 *
 * Priority is ORDERED, so it reads as rank rather than as category, and it must
 * not spend a slot of the categorical ring saying so — a Low chip that happens
 * to land on the same hue as the Design label would claim a kinship neither
 * has. The urgent end carries the alert hue; everything below it carries no
 * hue at all, which is exactly as much as a reader needs.
 */
export const rank = (priority: number) =>
  urgent(priority)
    ? ({ background: 'var(--team-urgent)', color: 'var(--team-chip-ink)' } as const)
    : ({ background: 'var(--team-quiet)', color: paint.ink } as const)

/**
 * Which gui rung each role lands on. Four regions, one answer.
 *
 * These are @hanzo/gui `$N` tokens: type $1 11 · $2 13 · $3 14 · $4 15 · $7 21 ·
 * $10 32; space is the 4px ramp $1 4 · $2 8 · $3 12 · $4 16 · $5 24; radius $1 6
 * control · $3 8 row · $10+ pill. Nothing here invents a number — every rung is
 * one the ladder already publishes, which is why the product cannot drift into
 * a tenth size the way it did before the ladder existed.
 */
export const rung = {
  /** "Tracker", "Inbox", the board's own title — one size, three placements. */
  title: '$7',
  /** A navigator row, a tab label. */
  row: '$4',
  /** A card title, an inbox line, a percentage, a count. */
  body: '$3',
  /** A breadcrumb, a column header. */
  small: '$2',
  /** A chip. */
  chip: '$1',
  /** The rail's figure. Measured 22 image px of cap, so ~20 — and $10's 32
   *  overruns the 60px capsule the moment the number reaches three glyphs. */
  figure: '$7',
} as const

export const gap = {
  /** Card to card, chip to chip. */
  tight: '$2',
  /** Inside a card. */
  inset: '$3',
  /** Column to column, panel padding. */
  wide: '$4',
  /** The board's own left inset. */
  edge: '$5',
} as const

export const round = {
  card: '$1',
  panel: '$1',
  field: '$1',
  pill: '$10',
} as const

/**
 * Uppercase labels carry tracking, and only they do.
 *
 * Measured on the reference at ~+0.08em; a grotesque set in caps at zero
 * tracking closes up and reads as one word. It applies to the column headers
 * and the navigator's section heads, and to nothing else.
 */
export const caps = { textTransform: 'uppercase', letterSpacing: 0.08 } as const

/**
 * The focus ring, stated once for the product.
 *
 * A keyboard ring is the one piece of chrome that has to look identical
 * everywhere — a reader learns it once — and it was already written out
 * separately in two files before this line existed. Spread it into
 * `focusVisibleStyle`.
 */
export const ring = { outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' } as const
