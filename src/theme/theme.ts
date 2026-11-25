/**
 * The names, so no component writes a colour.
 *
 * tokens.css chooses the values; this file is the only way to reach one. A
 * component reads `paint.card`, never `var(--team-card)` and never a hex — one
 * spelling, checked by the compiler, and a role that moves moves everywhere.
 */

const role = <N extends string>(name: N) => `var(--team-${name})` as const

export const paint = {
  /** Outer pure-black floor (#000000 dark / #ffffff light). */
  ground: role('ground'),
  /** Zen HQ canvas floor (#09090b dark / #fafafa light). */
  canvas: role('canvas'),
  /** Zen panels & department rooms (#0c0c0f dark / #f6f6f5 light). */
  surface: role('surface'),
  /** Zen elevated cards, desks & composer (#141417 dark / #ffffff light). */
  elevated: role('elevated'),
  /** Zen hover surface (#1a1a1f dark / #eceae8 light). */
  hover: role('hover'),
  /** Zen 1px crisp structural border (#1f1f25 dark / #e4e4e2 light). */
  border: role('border'),
  /** Zen primary foreground (#f4f4f5 dark / #09090b light). */
  fg: role('fg'),
  /** Zen secondary foreground (#a1a1aa dark / #52525b light). */
  secondary: role('secondary'),
  /** Main stage canvas (#0f0f12 dark / #ffffff light). */
  panel: role('panel'),
  /** Col 4 right contextual Thread/Roster pane (#0b0b0e dark). */
  aside: role('aside'),
  /** Col 2 bottom 52px user profile dock (#060608 dark). */
  dock: role('dock'),
  /** Center 38px bar omnibox (#141417 dark). */
  omnibox: role('omnibox'),
  omniboxEdge: role('omnibox-edge'),
  /** Raised card / unread surface (#121216 dark). */
  card: role('card'),
  /** Code & diff block well (#0a0a0d dark). */
  code: role('code'),
  codeEdge: role('code-edge'),
  /** Hairline rule across stage & sidebar. */
  rule: role('rule'),
  /** Structural pane divider (#1a1a1e dark). */
  paneEdge: role('pane-edge'),
  /** Modal overlay scrim. */
  backdrop: role('backdrop'),

  /** Outer chrome roles. */
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

  /** Presence, RTC Voice Connected, Diff, and Incident Playbook tokens. */
  speaking: role('speaking'),
  speakingBg: role('speaking-bg'),
  voiceBg: role('voice-bg'),
  voiceEdge: role('voice-edge'),
  diffAddBg: role('diff-add-bg'),
  diffAddInk: role('diff-add-ink'),
  diffDelBg: role('diff-del-bg'),
  diffDelInk: role('diff-del-ink'),
  sevBg: role('sev-bg'),
  sevEdge: role('sev-edge'),
  sevInk: role('sev-ink'),
  roomGlow: role('room-glow'),

  ink: role('ink'),
  mute: role('mute'),
  dim: role('dim'),

  accent: role('accent'),
  alert: role('alert'),
} as const

export const state = {
  backlog: role('backlog'),
  todo: role('todo'),
  doing: role('doing'),
  done: role('done'),
} as const

export type State = keyof typeof state

const SLOTS = 6

export const slot = (id: string): number => {
  const key = id.toLowerCase()
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return (Math.abs(h) % SLOTS) + 1
}

export const chip = (id: string) =>
  ({ background: `var(--team-hue-${slot(id)})`, color: 'var(--team-chip-ink)' }) as const

export const mark = (id: string) => `var(--team-hue-${slot(id)})` as const

export const urgent = (priority: number) => priority === 1 || priority === 2

export const rank = (priority: number) =>
  urgent(priority)
    ? ({ background: 'var(--team-urgent)', color: 'var(--team-chip-ink)' } as const)
    : ({ background: 'var(--team-quiet)', color: paint.ink } as const)

export const rung = {
  title: '$7',
  row: '$4',
  body: '$3',
  small: '$2',
  chip: '$1',
  figure: '$7',
} as const

export const gap = {
  tight: '$2',
  inset: '$3',
  wide: '$4',
  edge: '$5',
} as const

export const round = {
  card: '$1',
  panel: '$3',
  field: '$1',
  pill: '$10',
} as const

export const caps = { textTransform: 'uppercase', letterSpacing: 0.08 } as const

export const ring = { outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' } as const
