/**
 * Unified Hanzo Dev chrome contract for Hanzo Team (`hanzo.team` SPA):
 *  - Keyboard shortcuts (`⌘B` toggle sidebar, `⌘K` command palette, `⌘,` settings,
 *    `⌘/` shortcuts dialog, `⇧⌘O` new channel / thread)
 *  - Cross-app switcher items (`Dev`, `Bot`, `Team`, `Console`, `Desktop/Mobile`)
 *  - First-class `Channels`; people and bots come from the space's own roster
 *  - `X-Org-Id` organization persistence
 */

export type TeamShortcutAction =
  | 'toggle-sidebar'
  | 'command-palette'
  | 'settings'
  | 'shortcuts'
  | 'new-thread'

export type TeamShortcutSpec = {
  action: TeamShortcutAction
  label: string
  mac: string
  pc: string
}

export const TEAM_SHORTCUTS: readonly TeamShortcutSpec[] = [
  { action: 'command-palette', label: 'Jump to channel, person, or command', mac: '⌘K', pc: 'Ctrl+K' },
  { action: 'toggle-sidebar', label: 'Toggle left sidebar', mac: '⌘B', pc: 'Ctrl+B' },
  { action: 'new-thread', label: 'New channel or thread', mac: '⇧⌘O', pc: 'Ctrl+Shift+O' },
  { action: 'settings', label: 'Preferences & settings', mac: '⌘,', pc: 'Ctrl+,' },
  { action: 'shortcuts', label: 'Keyboard shortcuts', mac: '⌘/', pc: 'Ctrl+/' },
] as const

export type TeamCrossAppItem = {
  id: 'dev' | 'bot' | 'team' | 'console' | 'desktop'
  label: string
  href: string
  internalPath?: string
}

export const TEAM_CROSS_APPS: readonly TeamCrossAppItem[] = [
  { id: 'dev', label: 'Dev', href: 'https://hanzo.ai/dev' },
  { id: 'bot', label: 'Bot', href: 'https://hanzo.bot', internalPath: '/bots' },
  { id: 'team', label: 'Team', href: 'https://hanzo.team', internalPath: '/chat' },
  { id: 'console', label: 'Console', href: 'https://console.hanzo.ai' },
  { id: 'desktop', label: 'Desktop / Mobile', href: 'https://hanzo.app' },
] as const

export const DEFAULT_REQUIRED_CHANNELS = [
  'general',
  'engineering',
  'deployments',
  'approvals',
  'incidents',
] as const

export function matchTeamShortcut(e: {
  key?: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  repeat?: boolean
  defaultPrevented?: boolean
  isComposing?: boolean
  isContentEditable?: boolean
}): TeamShortcutAction | null {
  if (e.defaultPrevented || e.isComposing || e.repeat) return null
  const mod = Boolean(e.metaKey || e.ctrlKey)
  if (!mod || e.altKey) return null
  const raw = e.key ?? ''
  const lower = raw.toLowerCase()

  if (!e.shiftKey && lower === 'k') return 'command-palette'
  if (!e.shiftKey && lower === 'b' && !e.isContentEditable) return 'toggle-sidebar'
  if (e.shiftKey && lower === 'o') return 'new-thread'
  if (!e.shiftKey && raw === ',') return 'settings'
  if (!e.shiftKey && (raw === '/' || raw === '?')) return 'shortcuts'

  return null
}

export function filterChannelItems<T extends { name: string; topic?: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase().replace(/^#+/, '')
  if (!q) return [...items]
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || (item.topic ?? '').toLowerCase().includes(q),
  )
}
