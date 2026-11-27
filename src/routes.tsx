/**
 * EVERY ADDRESS HANZO TEAM v1.1.0 ANSWERS.
 *
 * Composes the unified 4-column Discord × Mattermost × Hanzo v8.8 `<Shell>` once
 * around every workspace stage. Default `/` lands directly on `#engineering`.
 */
import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import { Navigate, useParams } from 'react-router'

import { ToHanzoBot } from '~/bots/ToHanzoBot.tsx'
import { EngineeringStage } from '~/chat/EngineeringStage.tsx'
import { CrmScreen, RETIRED, Retired } from '~/crm/Crm'
import { Files } from '~/handoff/Files.tsx'
import { launchPathFor, readTeamSettings } from '~/settings/preferences.ts'
import { Shell } from '~/shell'
import { AllProjectsScreen } from '~/tracker/ProjectsWorkspace'
import { HomeWorkspace } from '~/workspaces/HomeWorkspace.tsx'
import { InboxWorkspace } from '~/workspaces/InboxWorkspace.tsx'
import { MemoryWorkspace } from '~/workspaces/MemoryWorkspace.tsx'
import { OfficeWorkspace } from '~/workspaces/OfficeWorkspace.tsx'
import { SpacesWorkspace } from '~/workspaces/SpacesWorkspace.tsx'
import { ThreadsWorkspace } from '~/workspaces/ThreadsWorkspace.tsx'
import { WorkWorkspace } from '~/workspaces/WorkWorkspace.tsx'

const ProjectRoot = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/projects/${id}/issues` : '/projects'} replace />
}

const Landing = () => <Navigate to={launchPathFor(readTeamSettings().defaultLaunchView)} replace />

const stage = (view: ReactNode) => <Shell>{view}</Shell>

export const routes: RouteObject[] = [
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Landing /> },
  { path: '/auth', element: <Landing /> },
  { path: '/auth/callback', element: <Landing /> },

  // Hanzo v8.8 Core Workspaces
  { path: '/home', element: stage(<HomeWorkspace />) },
  { path: '/overview', element: <Navigate to="/home" replace /> },
  { path: '/inbox', element: stage(<InboxWorkspace />) },
  { path: '/threads', element: stage(<ThreadsWorkspace />) },
  { path: '/office', element: stage(<OfficeWorkspace />) },
  { path: '/meet', element: <Navigate to="/office" replace /> },
  { path: '/meet/:room', element: <Navigate to="/office" replace /> },
  { path: '/spaces', element: stage(<SpacesWorkspace />) },
  { path: '/spaces/:id', element: stage(<SpacesWorkspace />) },
  { path: '/files', element: stage(<Files />) },
  { path: '/docs', element: <Navigate to="/spaces" replace /> },
  { path: '/memory', element: stage(<MemoryWorkspace />) },

  // Discord × Mattermost Channels & DMs
  { path: '/chat', element: <Navigate to="/chat/engineering" replace /> },
  { path: '/chat/:id', element: stage(<EngineeringStage />) },

  // Linear-grade Issues, Kanban, List, Timeline & YAML Objectives
  { path: '/issues', element: stage(<WorkWorkspace />) },
  { path: '/issues/:view', element: stage(<WorkWorkspace />) },
  { path: '/mine', element: stage(<WorkWorkspace mine />) },
  { path: '/mine/:view', element: stage(<WorkWorkspace mine />) },
  { path: '/projects', element: stage(<AllProjectsScreen />) },
  { path: '/projects/:id', element: <ProjectRoot /> },
  { path: '/projects/:id/issues', element: stage(<WorkWorkspace />) },
  { path: '/projects/:id/issues/:view', element: stage(<WorkWorkspace />) },
  { path: '/projects/:id/:page', element: <ProjectRoot /> },

  // Bots & CRM
  { path: '/bots', element: stage(<ToHanzoBot />) },
  { path: '/agents', element: <Navigate to="/office" replace /> },
  { path: '/agents/:id', element: stage(<OfficeWorkspace />) },
  { path: '/crm', element: stage(<CrmScreen />) },
  ...RETIRED.map((s) => ({ path: `/crm/${s}`, element: <Retired /> })),
  { path: '/crm/:tab', element: stage(<CrmScreen />) },
  { path: '/crm/:tab/:id', element: stage(<CrmScreen />) },

  { path: '/people', element: <Navigate to="/crm" replace /> },
  { path: '*', element: <Navigate to="/chat/engineering" replace /> },
]
