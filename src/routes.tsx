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
import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { Navigate, useParams } from 'react-router'

import { AgentPane, Chat, Channels } from '~/chat'
import { CrmNav, CrmScreen } from '~/crm/CrmWorkspace'
import { Inbox } from '~/inbox'
import { Nav } from '~/nav'
import { Shell } from '~/shell'
import { Tracker } from '~/tracker'
import { AllProjectsScreen } from '~/tracker/ProjectsWorkspace'

/** The Bots app arrives on its first visit: the model client, the composer and
 *  the voice come with it, and the tracker never pays for them. */
const Bots = lazy(() => import('~/bots/Bots.tsx').then((m) => ({ default: m.Bots })))

const ProjectRoot = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/projects/${id}/issues` : '/projects'} replace />
}

/**
 * Where a visit starts: the thread-focused workspace (`/chat`), with the
 * left organization rail, channel & bot navigator, active conversation, and agent pane.
 */
const Landing = () => <Navigate to="/chat" replace />

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
  { path: '/mine', element: tracker(<Tracker mine />) },
  { path: '/mine/:view', element: tracker(<Tracker mine />) },
  { path: '/projects', element: tracker(<AllProjectsScreen />) },
  { path: '/projects/:id', element: <ProjectRoot /> },
  { path: '/projects/:id/issues', element: tracker(<Tracker />) },
  { path: '/projects/:id/issues/:view', element: tracker(<Tracker />) },
  { path: '/projects/:id/:page', element: <ProjectRoot /> },

  { path: '/chat', element: chat(<Chat />) },
  { path: '/chat/:id', element: chat(<Chat />) },

  // The Bots app draws its own roster, thread and panel, so it takes no navigator.
  {
    path: '/bots',
    element: (
      <Shell nav={null}>
        <Suspense fallback={null}>
          <Bots />
        </Suspense>
      </Shell>
    ),
  },

  { path: '/crm', element: <Navigate to="/crm/investors" replace /> },
  { path: '/crm/:section', element: crm(<CrmScreen />) },

  // Surfaces that held only invented content are gone; their addresses land on something real.
  { path: '/overview', element: <Navigate to="/chat" replace /> },
  { path: '/agents', element: <Navigate to="/chat" replace /> },
  { path: '/agents/:id', element: <Navigate to="/chat" replace /> },
  { path: '/apps', element: <Navigate to="/chat" replace /> },
  { path: '/apps/:appId', element: <Navigate to="/chat" replace /> },
  { path: '/calendar', element: <Navigate to="/chat" replace /> },
  { path: '/cal', element: <Navigate to="/chat" replace /> },
  { path: '/time', element: <Navigate to="/chat" replace /> },
  { path: '/meet', element: <Navigate to="/chat" replace /> },
  { path: '/inbox', element: <Navigate to="/chat" replace /> },
  { path: '/docs', element: <Navigate to="/chat" replace /> },
  { path: '/files', element: <Navigate to="/chat" replace /> },
  { path: '/mail', element: <Navigate to="/chat" replace /> },
  { path: '/admin', element: <Navigate to="/chat" replace /> },
  { path: '/settings', element: <Navigate to="/chat" replace /> },
  { path: '/people', element: <Navigate to="/crm/investors" replace /> },

  { path: '*', element: <Navigate to="/chat" replace /> },
]
