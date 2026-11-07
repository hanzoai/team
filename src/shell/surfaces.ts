/**
 * WHAT THE PRODUCT CONTAINS. One table, and it is the only one.
 *
 * A surface is a top-level area: the rail switches between them and each owns a
 * root address. Adding one is an entry here and nothing else — the rail reads
 * this list and so does `routes.tsx`, so a surface cannot be reachable from the
 * rail and missing from the router, which is how a product ends up with a glyph
 * that goes nowhere.
 *
 * What is NOT a surface: the aside. It coexists with every screen rather than
 * being a place you go, so it has no address and no slot of its own — the bell
 * toggles it.
 *
 * The order is the rail's, and it is the reference's: calendar, chat, tracker,
 * time, meet, with the bell above them and the add control below.
 */
import { Bot, Calendar, Clock, LayoutGrid, MessagesSquare, SquareCheck, Video } from '@hanzogui/lucide-icons-2'

/** Any glyph from the icon set. Named off one of them, because the set's own
 *  component type is not exported and restating it here would be a second
 *  spelling of a type we do not own. */
export type Glyph = typeof SquareCheck

export type Surface = {
  /** One word. It names the surface everywhere but the address. */
  id: string
  /** What it is called: the rail's hint, and the navigator's title. */
  label: string
  icon: Glyph
  /** Its root address. Not derived from the id, because the tracker's screens
   *  are `/issues` and calling them `/tracker/issues` would say it twice. */
  path: string
}

export const SURFACES: readonly Surface[] = [
  { id: 'chat', label: 'Chat', icon: MessagesSquare, path: '/chat' },
  { id: 'tracker', label: 'Tracker', icon: SquareCheck, path: '/issues' },
  { id: 'bots', label: 'Bots', icon: Bot, path: '/bots' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
  { id: 'meet', label: 'Meet', icon: Video, path: '/meet' },
  { id: 'time', label: 'Time', icon: Clock, path: '/time' },
  { id: 'apps', label: 'Business Apps', icon: LayoutGrid, path: '/apps' },
]

/** Which surface an address is inside. */
export const surfaceAt = (pathname: string): Surface | undefined =>
  SURFACES.find((s) => pathname === s.path || pathname.startsWith(`${s.path}/`))
