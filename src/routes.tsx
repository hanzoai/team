/**
 * EVERY ADDRESS THIS CLIENT ANSWERS, and the only module that knows both a
 * navigator and a view.
 *
 * The shell is composed HERE rather than inside each surface, so a surface
 * cannot forget it and no two surfaces can draw it differently — one rail, one
 * navigator column, one aside, whatever screen is showing. A surface component
 * renders only its own region.
 *
 * The rail's list lives in `~/shell/surfaces`, and the paths below are that
 * table's. A surface reachable from the rail and missing here is a glyph that
 * goes nowhere, which is exactly what one declaration prevents.
 *
 * A board's default view is the board's own address, so Kanban has one address
 * and not two. The splat ranks last and catches every address this product ever
 * answered and no longer does, so a stale bookmark is a redirect rather than
 * the router's own error page.
 */
import { EmptyState } from '@hanzo/ui/product'
import { SquareCheck } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { Navigate, useParams } from 'react-router'

import { useProjects } from '~/serve'

import { AppsNav, AppsScreen, BotsNav, BotsScreen } from '~/apps/BusinessApps'
import { AgentPane, Chat, Channels } from '~/chat'
import { CrmNav, CrmScreen } from '~/crm/CrmWorkspace'
import { Inbox } from '~/inbox'
import { Nav } from '~/nav'
import { Shell } from '~/shell'
import { Tracker } from '~/tracker'

/** A screen this build has not written. It says which one and what belongs on
 *  it, because a blank screen and an unfinished one look identical and only one
 *  of them is honest. */
const soon = (title: string, what: string) => (
  <EmptyState icon={SquareCheck} title={title} description={`${what} Not built yet.`} />
)

/** A project's page, named from the address so the screen is about the thing you
 *  clicked rather than about the router. */
const Page = () => {
  const { page } = useParams()
  const name = page ? page[0].toUpperCase() + page.slice(1) : 'This page'
  return soon(name, `${name} for one project.`)
}

const ProjectRoot = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/projects/${id}/issues` : '/projects'} replace />
}

const LEGACY_AGENT_ALIAS: Record<string, string> = {
  algo: 'sci',
  cal: 'mana',
  core: 'opera',
  db: 'data',
  sec: 'cyber',
}

const AgentRedirect = () => {
  const { id } = useParams()
  const slug = (id ?? 'rev').replace(/^dm-/, '')
  const target = LEGACY_AGENT_ALIAS[slug] ?? slug
  return <Navigate to={`/chat/dm-${target}`} replace />
}

/**
 * Where a visit starts: your workspace chat with orgs, channels, leads and
 * 24/7 bots on the sidebar (or the first project's board when `?state=` is set
 * by fixture harnesses).
 */
const Landing = () => {
  const projects = useProjects()
  const explicitState =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('state')
  if (!explicitState) {
    return <Navigate to={`/chat/dm-rev${window.location.search}`} replace />
  }
  if (projects.phase === 'loading') return tracker(null)
  const first = [...(projects.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))[0]
  return <Navigate to={first ? `/projects/${first._id}/issues` : '/issues'} replace />
}

const tracker = (view: ReactNode) => (
  <Shell nav={<Nav />} aside={<Inbox />}>
    {view}
  </Shell>
)

const chat = (view: ReactNode) => (
  <Shell nav={<Channels />} aside={<AgentPane />}>
    {view}
  </Shell>
)

const bots = (view: ReactNode) => (
  <Shell nav={<BotsNav />} aside={<Inbox />}>
    {view}
  </Shell>
)

const apps = (view: ReactNode) => (
  <Shell nav={<AppsNav />} aside={<Inbox />}>
    {view}
  </Shell>
)

const crm = (view: ReactNode) => (
  <Shell nav={<CrmNav />}>
    {view}
  </Shell>
)

export const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Landing /> },
  { path: '/auth', element: <Landing /> },
  { path: '/auth/callback', element: <Landing /> },

  { path: '/issues', element: tracker(<Tracker />) },
  { path: '/issues/:view', element: tracker(<Tracker />) },
  { path: '/mine', element: tracker(soon('My issues', 'Everything assigned to you, across every project.')) },
  { path: '/projects', element: tracker(soon('All projects', 'The projects you are in, and the ones you could join.')) },
  { path: '/projects/:id', element: <ProjectRoot /> },
  { path: '/projects/:id/issues', element: tracker(<Tracker />) },
  { path: '/projects/:id/issues/:view', element: tracker(<Tracker />) },
  { path: '/projects/:id/:page', element: tracker(<Page />) },

  { path: '/chat', element: chat(<Chat />) },
  { path: '/chat/:id', element: chat(<Chat />) },

  { path: '/crm', element: <Navigate to="/crm/opportunities" replace /> },
  { path: '/crm/:section', element: crm(<CrmScreen />) },

  { path: '/bots', element: bots(<BotsScreen />) },
  { path: '/agents', element: <Navigate to="/bots" replace /> },
  { path: '/agents/:id', element: <AgentRedirect /> },

  { path: '/apps', element: apps(<AppsScreen />) },
  { path: '/apps/:appId', element: apps(<AppsScreen />) },

  { path: '/calendar', element: <Shell nav={null}>{soon('Calendar', 'Meetings, deadlines and the week beside the work.')}</Shell> },
  { path: '/cal', element: <Navigate to="/calendar" replace /> },
  { path: '/time', element: <Shell nav={null}>{soon('Time', 'What the work took, against what it was estimated at.')}</Shell> },
  { path: '/meet', element: <Shell nav={null}>{soon('Meet', 'Calls and huddles, from the room you are already in.')}</Shell> },

  { path: '/inbox', element: <Navigate to="/chat/dm-rev" replace /> },
  { path: '/docs', element: <Navigate to="/apps/cms" replace /> },
  { path: '/files', element: <Navigate to="/apps/dataroom" replace /> },
  { path: '/mail', element: <Navigate to="/apps/email" replace /> },
  { path: '/admin', element: <Navigate to="/apps/console" replace /> },
  { path: '/settings', element: <Navigate to="/bots" replace /> },
  { path: '/people', element: <Navigate to="/crm/contacts" replace /> },

  { path: '*', element: <Navigate to="/chat/c-general" replace /> },
]
