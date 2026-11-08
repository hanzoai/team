/**
 * Huly-style Projects Directory (`/projects`) and Project Sub-Pages
 * (`/projects/:id/:page` — `components`, `milestones`, `templates`).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, ScrollArea, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import { Boxes, CheckCircle2, FileCode2, FolderKanban, Milestone, Plus, Sparkles } from '@hanzogui/lucide-icons-2'

import { HANZO_AGENTS } from '~/data/agents.ts'
import { useSpace } from '~/data/space.tsx'
import { standingIs, useBoard, useCrew, useProject, useProjects } from '~/serve.tsx'
import { press } from '~/shell/press.ts'
import { caps, chip, paint, round, rung, state } from '~/theme/theme.ts'
import { standby } from './board/fixture.ts'
import type { Issue } from './board/model.ts'
import { People } from './board/People.tsx'
import { Ring } from './board/Ring.tsx'
import { dot } from './board/tone.ts'

const PROJECT_BOTS: Record<string, string[]> = {
  'proj-crm': ['rev', 'sal', 'dev', 'su'],
  'proj-mkt': ['mark', 'des', 'art', 'ed'],
  'proj-next': ['sci', 'dev', 'data', 'cyber'],
  'proj-dev': ['dev', 'opera', 'cyber', 'mana'],
}

const PROJECT_COMPONENTS: Record<
  string,
  Array<{ id: string; name: string; lead: string; description: string; bot: string }>
> = {
  'proj-crm': [
    { id: 'cmp-freelynk', name: 'hanzo/crm', lead: 'Zach Kelling', description: 'Native CRM surface, PostgreSQL (`hanzo-sql`) cohorts & inbound lead routing', bot: 'rev' },
    { id: 'cmp-acme', name: 'hanzo/commerce', lead: 'Antje Worring', description: 'Enterprise deal room, org credit grants, multi-seat billing & MSA automation', bot: 'sal' },
    { id: 'cmp-pipeline', name: 'hanzo/marketing', lead: 'Zach Kelling', description: 'Lifecycle journeys, deliverability guardrails & 28 segmented audiences', bot: 'data' },
  ],
  'proj-mkt': [
    { id: 'cmp-funnel', name: 'hanzo/app', lead: 'Antje Worring', description: 'Landing conversion tracking, attribution & checkout analytics', bot: 'mark' },
    { id: 'cmp-brand', name: 'hanzo/ui', lead: 'Zach Kelling', description: '@hanzo/gui monochrome tokens, hero stage & Omni Flash assets', bot: 'des' },
  ],
  'proj-next': [
    { id: 'cmp-atlas', name: 'hanzo/cloud', lead: 'Zach Kelling', description: 'Unified `/v1` API gateway, ZAP transactor ledger & multi-org state replication', bot: 'sci' },
    { id: 'cmp-plugin', name: 'hanzo/mcp', lead: 'Zach Kelling', description: 'Sandboxed extension runtime & 13 unified MCP tools', bot: 'dev' },
  ],
  'proj-dev': [
    { id: 'cmp-runner', name: 'hanzo/ci', lead: 'Zach Kelling', description: 'Ephemeral Kata CI runner fleet & multi-arch BuildKit image builder', bot: 'opera' },
    { id: 'cmp-kms', name: 'hanzo/kms', lead: 'Zach Kelling', description: 'Zero-knowledge secret grants (`kms-grants.yaml`) & automated token rotation', bot: 'cyber' },
  ],
}

const PROJECT_MILESTONES = [
  {
    id: 'ms-1',
    title: 'v2.4 Enterprise Workspace GA',
    target: 'Nov 14, 2026',
    status: 'Active Sprint',
    done: 0.78,
    summary: 'Unified Tracker Kanban, List, Timeline, Virtual Office rooms, and 23 autonomous 24/7 bots.',
    bot: 'mana',
  },
  {
    id: 'ms-2',
    title: 'ZAP Transactor & Multi-Org Ledger Cutover',
    target: 'Nov 28, 2026',
    status: 'On Track',
    done: 0.54,
    summary: 'Zero-downtime migration across Hanzo AI, The Foundation, Lux Network, and Zoo Labs.',
    bot: 'dev',
  },
  {
    id: 'ms-3',
    title: 'Autonomous Bot Computer Sandbox v3',
    target: 'Dec 12, 2026',
    status: 'Planned',
    done: 0.32,
    summary: 'Sub-second Ubuntu microVM snapshots, live browser streaming, and 1-click PR merge gates.',
    bot: 'opera',
  },
] as const

const ISSUE_TEMPLATES = [
  {
    id: 'tpl-bug',
    title: 'Bug Triage & Autonomous Bot Reproduction',
    category: 'QA',
    priority: 'High',
    bot: 'dev',
    description: 'Spins up @dev in an isolated cloud sandbox to reproduce the regression, capture logs, and open a fix PR.',
    defaultIssueTitle: 'Reproduce & patch regression with automated E2E test',
  },
  {
    id: 'tpl-deal',
    title: 'Enterprise Deal Desk & Custom MSA Setup',
    category: 'Sales',
    priority: 'Urgent',
    bot: 'rev',
    description: 'Coordinates @rev, @sal, and @law to provision an enterprise org grant, Data Room, and e-sign MSA.',
    defaultIssueTitle: 'Provision Enterprise Org Grant, Data Room & MSA',
  },
  {
    id: 'tpl-launch',
    title: 'Product Launch & Multi-Channel Campaign',
    category: 'Marketing',
    priority: 'Medium',
    bot: 'mark',
    description: 'Briefs @mark, @des, and @art to ship landing updates, Omni Flash hero video, and social broadcast.',
    defaultIssueTitle: 'Ship launch landing page, hero video & social thread',
  },
  {
    id: 'tpl-sec',
    title: 'Security Audit & KMS Secret Rotation',
    category: 'Devops',
    priority: 'High',
    bot: 'cyber',
    description: 'Runs @cyber across universe kms-grants.yaml, verifies RBAC boundaries, and rotates production tokens.',
    defaultIssueTitle: 'Audit KMS grants and rotate production tokens',
  },
] as const

export function AllProjectsScreen() {
  const navigate = useNavigate()
  const { current, standing } = useSpace()
  const projectsRead = useProjects()
  const source = useBoard() ?? standby(standingIs(standing))
  const crew = useCrew()
  const [issues, setIssues] = useState<Issue[]>([])

  useEffect(() => {
    return source.watch(
      (next) => setIssues(next),
      () => {},
    )
  }, [source])

  const projects = projectsRead.data ?? []

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Header */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <SizableText {...caps} fontSize={rung.chip} fontWeight="600" color="$soft">
              {current?.name ?? 'Hanzo AI'} · Portfolio & Tracker
            </SizableText>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              All projects ({projects.length})
            </SizableText>
            <SizableText fontSize={rung.body} color="$quiet">
              Every project shares live Kanban boards, List & Timeline views, components, milestones, and 24/7 AI bot teammates.
            </SizableText>
          </YStack>
          <XStack gap={8} items="center">
            <People people={crew} size={26} show={5} />
            <Button onPress={() => navigate('/issues')}>All Issues ({issues.length})</Button>
          </XStack>
        </XStack>

        {/* Projects Grid */}
        <XStack flexWrap="wrap" gap={16}>
          {projects.map((proj) => {
            const prefix = proj.identifier.toUpperCase()
            const projIssues = issues.filter((i) => i.key.startsWith(`${prefix}-`))
            const total = projIssues.length || proj.sequence
            const doneCount = projIssues.filter((i) => i.status === 'done').length
            const doingCount = projIssues.filter((i) => i.status === 'progress').length
            const todoCount = projIssues.filter((i) => i.status === 'todo').length
            const backlogCount = projIssues.filter((i) => i.status === 'backlog').length
            const ratio = projIssues.length > 0 ? doneCount / projIssues.length : 0.35
            const bots = (PROJECT_BOTS[proj._id] ?? ['dev', 'mana'])
              .map((id) => HANZO_AGENTS.find((a) => a.id === id))
              .filter((b): b is NonNullable<typeof b> => !!b)
            const comps = PROJECT_COMPONENTS[proj._id] ?? []

            return (
              <YStack
                key={proj._id}
                width={380}
                grow={1}
                p={20}
                rounded={round.card}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
                gap={14}
              >
                <XStack items="center" justify="space-between" gap={10}>
                  <XStack items="center" gap={10}>
                    <YStack
                      width={36}
                      height={36}
                      rounded={round.field}
                      items="center"
                      justify="center"
                      bg="$panel"
                      borderWidth={1}
                      borderColor="$edge"
                    >
                      <FolderKanban size={18} color="$ink" />
                    </YStack>
                    <YStack>
                      <XStack items="center" gap={8}>
                        <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                          {proj.name}
                        </SizableText>
                        <XStack px={8} py={2} rounded={round.pill} style={chip(proj.identifier)}>
                          <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: chip(proj.identifier).color }}>
                            {proj.identifier}
                          </SizableText>
                        </XStack>
                      </XStack>
                      <SizableText fontSize={rung.small} color="$soft">
                        {projIssues.length} active issues · {(proj.members ?? []).length} members · {comps.length} components
                      </SizableText>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap={6}>
                    <Ring done={ratio} size={20} width={2.5} />
                    <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
                      {Math.round(ratio * 100)}%
                    </SizableText>
                  </XStack>
                </XStack>

                {/* Status breakdown bar */}
                <YStack gap={6}>
                  <XStack height={6} rounded={round.pill} bg="$panel" overflow="hidden" gap={2}>
                    <YStack flex={Math.max(1, doneCount)} style={{ backgroundColor: state.done }} />
                    <YStack flex={Math.max(1, doingCount)} style={{ backgroundColor: state.doing }} />
                    <YStack flex={Math.max(1, todoCount)} style={{ backgroundColor: state.todo }} />
                    <YStack flex={Math.max(1, backlogCount)} style={{ backgroundColor: state.backlog }} />
                  </XStack>
                  <XStack justify="space-between" flexWrap="wrap" gap={8}>
                    <SizableText fontSize={rung.chip} color="$quiet">
                      Backlog: {backlogCount}
                    </SizableText>
                    <SizableText fontSize={rung.chip} color="$quiet">
                      To do: {todoCount}
                    </SizableText>
                    <SizableText fontSize={rung.chip} color="$quiet">
                      In progress: {doingCount}
                    </SizableText>
                    <SizableText fontSize={rung.chip} color="$quiet">
                      Done: {doneCount} / {total}
                    </SizableText>
                  </XStack>
                </YStack>

                {/* Assigned 24/7 Bots */}
                <XStack items="center" justify="space-between" pt={4}>
                  <XStack items="center" gap={6} flexWrap="wrap">
                    <SizableText fontSize={rung.chip} color="$soft" {...caps}>
                      24/7 Bots:
                    </SizableText>
                    {bots.map((b) => (
                      <XStack
                        key={b.id}
                        {...press(() => navigate(`/chat/dm-${b.id}`), `Message ${b.name}`)}
                        px={8}
                        py={3}
                        rounded={round.pill}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        hoverStyle={{ background: '$hover' }}
                        items="center"
                        gap={5}
                      >
                        <img
                          src={b.avatar}
                          alt={b.name}
                          width={14}
                          height={14}
                          style={{ width: 14, height: 14, borderRadius: 999, objectFit: 'cover' }}
                        />
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                          @{b.id}
                        </SizableText>
                      </XStack>
                    ))}
                  </XStack>
                </XStack>

                <Separator borderColor="$edge" />

                {/* Sub-page links */}
                <XStack items="center" justify="space-between" flexWrap="wrap" gap={8}>
                  <XStack gap={6} flexWrap="wrap">
                    {(
                      [
                        ['issues', 'Board'],
                        ['issues/list', 'List'],
                        ['issues/timeline', 'Timeline'],
                        ['components', 'Components'],
                        ['milestones', 'Milestones'],
                        ['templates', 'Templates'],
                      ] as const
                    ).map(([sub, label]) => (
                      <XStack
                        key={sub}
                        {...press(() => navigate(`/projects/${proj._id}/${sub}`), `${proj.name} ${label}`)}
                        px={10}
                        py={5}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        hoverStyle={{ background: '$hover' }}
                      >
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$soft">
                          {label}
                        </SizableText>
                      </XStack>
                    ))}
                  </XStack>

                  <Button size="sm" onPress={() => navigate(`/projects/${proj._id}/issues`)}>
                    Open Board →
                  </Button>
                </XStack>
              </YStack>
            )
          })}
        </XStack>
      </YStack>
    </ScrollArea>
  )
}

export function ProjectSubPage() {
  const { id, page } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const { standing } = useSpace()
  const source = useBoard(id) ?? standby(standingIs(standing))
  const [issues, setIssues] = useState<Issue[]>([])
  const [createdNote, setCreatedNote] = useState<string | null>(null)

  useEffect(() => {
    return source.watch(
      (next) => setIssues(next),
      () => {},
    )
  }, [source])

  const projectId = id ?? 'proj-crm'
  const projectName = project?.name ?? 'CRM'
  const currentTab = page ?? 'components'
  const comps = PROJECT_COMPONENTS[projectId] ?? PROJECT_COMPONENTS['proj-crm']!

  const createFromTemplate = (title: string) => {
    if (source.add) {
      void source.add('todo', title).then(() => {
        setCreatedNote(`Created "${title}" in ${projectName} → To do`)
      })
    } else {
      navigate(`/projects/${projectId}/issues`)
    }
  }

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={24} gap={20}>
        {/* Breadcrumb + Sub-navigation */}
        <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
          <YStack gap={4}>
            <XStack items="center" gap={8}>
              <SizableText
                {...press(() => navigate('/projects'), 'Your projects')}
                fontSize={rung.small}
                color="$soft"
                hoverStyle={{ color: '$ink' }}
              >
                Your projects
              </SizableText>
              <SizableText fontSize={rung.small} color="$faint">
                /
              </SizableText>
              <SizableText
                {...press(() => navigate(`/projects/${projectId}/issues`), projectName)}
                fontSize={rung.small}
                color="$soft"
                hoverStyle={{ color: '$ink' }}
              >
                {projectName}
              </SizableText>
              <SizableText fontSize={rung.small} color="$faint">
                /
              </SizableText>
              <SizableText fontSize={rung.small} style={{ color: paint.accent }}>
                {currentTab[0]?.toUpperCase() + currentTab.slice(1)}
              </SizableText>
            </XStack>
            <SizableText fontSize={rung.title} fontWeight="600" color="$ink">
              {projectName} · {currentTab[0]?.toUpperCase() + currentTab.slice(1)}
            </SizableText>
          </YStack>

          <XStack gap={6} flexWrap="wrap">
            {(
              [
                ['issues', 'Issues Board'],
                ['components', 'Components'],
                ['milestones', 'Milestones'],
                ['templates', 'Templates'],
              ] as const
            ).map(([slug, label]) => {
              const active = slug === currentTab
              return (
                <XStack
                  key={slug}
                  {...press(() => navigate(`/projects/${projectId}/${slug}`), label)}
                  px={12}
                  py={6}
                  rounded={round.pill}
                  bg={active ? '$hover' : '$background'}
                  borderWidth={1}
                  borderColor={active ? '$ink' : '$edge'}
                  hoverStyle={{ background: '$hover' }}
                >
                  <SizableText fontSize={rung.small} fontWeight={active ? '600' : '400'} color={active ? '$ink' : '$soft'}>
                    {label}
                  </SizableText>
                </XStack>
              )
            })}
          </XStack>
        </XStack>

        <Separator borderColor="$edge" />

        {createdNote ? (
          <XStack
            p={12}
            rounded={round.field}
            bg="$panel"
            borderWidth={1}
            borderColor="$edge"
            items="center"
            justify="space-between"
          >
            <XStack items="center" gap={8}>
              <CheckCircle2 size={16} color="$ink" />
              <SizableText fontSize={rung.body} color="$ink">
                {createdNote}
              </SizableText>
            </XStack>
            <Button size="sm" onPress={() => navigate(`/projects/${projectId}/issues`)}>
              View on Board →
            </Button>
          </XStack>
        ) : null}

        {currentTab === 'components' ? (
          <YStack gap={14}>
            {comps.map((c) => {
              const bot = HANZO_AGENTS.find((a) => a.id === c.bot)
              const matching = issues.filter((i) => i.origin?.name === c.name)
              const count = matching.length || 3
              return (
                <YStack
                  key={c.id}
                  p={18}
                  rounded={round.card}
                  bg="$background"
                  borderWidth={1}
                  borderColor="$edge"
                  gap={12}
                >
                  <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
                    <XStack items="center" gap={12}>
                      <YStack
                        width={36}
                        height={36}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        items="center"
                        justify="center"
                      >
                        <Boxes size={18} color="$ink" />
                      </YStack>
                      <YStack>
                        <XStack items="center" gap={8}>
                          <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                            {c.name}
                          </SizableText>
                          <XStack px={8} py={2} rounded={round.pill} style={chip(c.name)}>
                            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(c.name).color }}>
                              {count} issues
                            </SizableText>
                          </XStack>
                        </XStack>
                        <SizableText fontSize={rung.small} color="$quiet">
                          {c.description}
                        </SizableText>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap={10}>
                      {bot ? (
                        <XStack
                          {...press(() => navigate(`/chat/dm-${bot.id}`), `Chat with ${bot.name}`)}
                          px={10}
                          py={5}
                          rounded={round.pill}
                          bg="$panel"
                          borderWidth={1}
                          borderColor="$edge"
                          items="center"
                          gap={6}
                        >
                          <img
                            src={bot.avatar}
                            alt={bot.name}
                            width={16}
                            height={16}
                            style={{ width: 16, height: 16, borderRadius: 999, objectFit: 'cover' }}
                          />
                          <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                            Maintained by @{bot.id}
                          </SizableText>
                        </XStack>
                      ) : null}
                      <Button size="sm" variant="outline" onPress={() => navigate(`/projects/${projectId}/issues`)}>
                        Filter Board
                      </Button>
                    </XStack>
                  </XStack>
                </YStack>
              )
            })}
          </YStack>
        ) : currentTab === 'milestones' ? (
          <YStack gap={14}>
            {PROJECT_MILESTONES.map((ms) => {
              const bot = HANZO_AGENTS.find((a) => a.id === ms.bot)
              return (
                <YStack
                  key={ms.id}
                  p={18}
                  rounded={round.card}
                  bg="$background"
                  borderWidth={1}
                  borderColor="$edge"
                  gap={12}
                >
                  <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
                    <XStack items="center" gap={12}>
                      <YStack
                        width={36}
                        height={36}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        items="center"
                        justify="center"
                      >
                        <Milestone size={18} color="$ink" />
                      </YStack>
                      <YStack gap={2}>
                        <XStack items="center" gap={8}>
                          <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                            {ms.title}
                          </SizableText>
                          <XStack px={8} py={2} rounded={round.pill} style={chip(ms.status)}>
                            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(ms.status).color }}>
                              {ms.status}
                            </SizableText>
                          </XStack>
                        </XStack>
                        <SizableText fontSize={rung.small} color="$quiet">
                          {ms.summary}
                        </SizableText>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap={12}>
                      <YStack items="flex-end">
                        <XStack items="center" gap={6}>
                          <Ring done={ms.done} size={18} width={2.5} />
                          <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
                            {Math.round(ms.done * 100)}%
                          </SizableText>
                        </XStack>
                        <SizableText fontSize={rung.chip} color="$soft">
                          Target: {ms.target}
                        </SizableText>
                      </YStack>
                      {bot ? (
                        <Button size="sm" variant="outline" onPress={() => navigate(`/chat/dm-${bot.id}`)}>
                          Ask @{bot.id}
                        </Button>
                      ) : null}
                    </XStack>
                  </XStack>

                  {/* Burn-up bar */}
                  <YStack height={6} rounded={round.pill} bg="$panel" overflow="hidden">
                    <YStack width={`${Math.round(ms.done * 100)}%`} height="100%" style={{ backgroundColor: dot.done }} />
                  </YStack>
                </YStack>
              )
            })}
          </YStack>
        ) : (
          <YStack gap={14}>
            {ISSUE_TEMPLATES.map((tpl) => {
              const bot = HANZO_AGENTS.find((a) => a.id === tpl.bot)
              return (
                <YStack
                  key={tpl.id}
                  p={18}
                  rounded={round.card}
                  bg="$background"
                  borderWidth={1}
                  borderColor="$edge"
                  gap={12}
                >
                  <XStack items="center" justify="space-between" flexWrap="wrap" gap={12}>
                    <XStack items="center" gap={12} flex={1} minW={240}>
                      <YStack
                        width={36}
                        height={36}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor="$edge"
                        items="center"
                        justify="center"
                      >
                        <FileCode2 size={18} color="$ink" />
                      </YStack>
                      <YStack gap={2} flex={1}>
                        <XStack items="center" gap={8} flexWrap="wrap">
                          <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                            {tpl.title}
                          </SizableText>
                          <XStack px={8} py={2} rounded={round.pill} style={chip(tpl.category)}>
                            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color: chip(tpl.category).color }}>
                              {tpl.category} · {tpl.priority}
                            </SizableText>
                          </XStack>
                        </XStack>
                        <SizableText fontSize={rung.small} color="$quiet">
                          {tpl.description}
                        </SizableText>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap={8}>
                      {bot ? (
                        <XStack
                          {...press(() => navigate(`/chat/dm-${bot.id}`), `Message ${bot.name}`)}
                          px={10}
                          py={5}
                          rounded={round.pill}
                          bg="$panel"
                          borderWidth={1}
                          borderColor="$edge"
                          items="center"
                          gap={6}
                        >
                          <Sparkles size={12} color="$ink" />
                          <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                            Auto-assigns @{bot.id}
                          </SizableText>
                        </XStack>
                      ) : null}
                      <Button size="sm" onPress={() => createFromTemplate(tpl.defaultIssueTitle)}>
                        <Plus size={14} /> Use Template
                      </Button>
                    </XStack>
                  </XStack>
                </YStack>
              )
            })}
          </YStack>
        )}
      </YStack>
    </ScrollArea>
  )
}
