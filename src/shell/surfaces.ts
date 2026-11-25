/**
 * Core top-level workspace surfaces in Hanzo Team v1.1.0.
 */
import {
  Bot,
  Brain,
  Briefcase,
  Building2,
  Home,
  Inbox,
  Layers,
  MessagesSquare,
  SquareCheck,
} from '@hanzogui/lucide-icons-2'

export type Glyph = typeof SquareCheck

export type Surface = {
  id: string
  label: string
  icon: Glyph
  path: string
}

export const SURFACES: readonly Surface[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'inbox', label: 'Inbox', icon: Inbox, path: '/inbox' },
  { id: 'threads', label: 'Threads', icon: MessagesSquare, path: '/threads' },
  { id: 'office', label: 'Office', icon: Building2, path: '/office' },
  { id: 'chat', label: 'Channels', icon: MessagesSquare, path: '/chat' },
  { id: 'tracker', label: 'Work', icon: SquareCheck, path: '/issues' },
  { id: 'spaces', label: 'Spaces', icon: Layers, path: '/spaces' },
  { id: 'memory', label: 'Memory', icon: Brain, path: '/memory' },
  { id: 'bots', label: 'Bots on hanzo.bot', icon: Bot, path: '/bots' },
  { id: 'crm', label: 'CRM', icon: Briefcase, path: '/crm' },
]

export const surfaceAt = (pathname: string): Surface | undefined =>
  SURFACES.find(
    (s) =>
      pathname === s.path ||
      pathname.startsWith(`${s.path}/`) ||
      (s.id === 'home' && (pathname === '/overview' || pathname.startsWith('/overview/'))) ||
      (s.id === 'tracker' &&
        (pathname === '/mine' ||
          pathname.startsWith('/mine/') ||
          pathname === '/projects' ||
          pathname.startsWith('/projects/') ||
          pathname === '/files' ||
          pathname.startsWith('/files/'))),
  )
