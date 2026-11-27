/**
 * Unified Hanzo Dev chrome contract for Hanzo Team (`hanzo.team` SPA):
 *  - Keyboard shortcuts (`⌘B` toggle sidebar, `⌘.` toggle right thread pane,
 *    `⌘K` quick switcher, `⌘,` settings, `⌘/` shortcuts dialog, `⇧⌘O` new thread,
 *    `Alt+1..6` workspace views)
 *  - Cross-app switcher items (`Dev`, `Bot`, `Team`, `Console`, `Desktop/Mobile`)
 *  - First-class `Channels`; people and bots come from the space's own roster
 *  - `X-Org-Id` organization persistence
 */

export type TeamShortcutAction =
  | 'toggle-sidebar'
  | 'toggle-thread-pane'
  | 'command-palette'
  | 'settings'
  | 'shortcuts'
  | 'new-thread'
  | 'view-1'
  | 'view-2'
  | 'view-3'
  | 'view-4'
  | 'view-5'
  | 'view-6'

export type TeamShortcutSpec = {
  action: TeamShortcutAction
  label: string
  mac: string
  pc: string
}

export const TEAM_SHORTCUTS: readonly TeamShortcutSpec[] = [
  { action: 'settings', label: 'Preferences & settings', mac: '⌘,', pc: 'Ctrl+,' },
  { action: 'command-palette', label: 'Quick switcher & omnibox', mac: '⌘K', pc: 'Ctrl+K' },
  { action: 'toggle-sidebar', label: 'Toggle left channel sidebar', mac: '⌘B', pc: 'Ctrl+B' },
  { action: 'toggle-thread-pane', label: 'Toggle right thread pane', mac: '⌘.', pc: 'Ctrl+.' },
  { action: 'new-thread', label: 'New channel or thread', mac: '⇧⌘O', pc: 'Ctrl+Shift+O' },
  { action: 'view-1', label: 'Switch workspace views (Home..Office)', mac: '⌥1..6', pc: 'Alt+1..6' },
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
  const raw = e.key ?? ''
  const lower = raw.toLowerCase()
  const mod = Boolean(e.metaKey || e.ctrlKey)

  if (e.altKey && !mod && !e.shiftKey) {
    if (raw === '1') return 'view-1'
    if (raw === '2') return 'view-2'
    if (raw === '3') return 'view-3'
    if (raw === '4') return 'view-4'
    if (raw === '5') return 'view-5'
    if (raw === '6') return 'view-6'
    return null
  }

  if (!mod || e.altKey) return null

  if (!e.shiftKey && lower === 'k') return 'command-palette'
  if (!e.shiftKey && lower === 'b' && !e.isContentEditable) return 'toggle-sidebar'
  if (!e.shiftKey && raw === '.') return 'toggle-thread-pane'
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
