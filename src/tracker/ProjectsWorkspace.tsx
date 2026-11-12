/**
 * Projects directory (`/projects`): the real projects of the open space, with
 * the issue counts their boards report. Nothing here is invented.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { FolderKanban } from '@hanzogui/lucide-icons-2'

import { useSpace } from '~/data/space.tsx'
import { standingIs, useBoard, useCrew, useProjects } from '~/serve.tsx'
import { press } from '~/shell/press.ts'
import { caps, chip, round, rung, state } from '~/theme/theme.ts'
import { standby } from './board/standby.ts'
import type { Issue } from './board/model.ts'
import { People } from './board/People.tsx'
import { Ring } from './board/Ring.tsx'

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
              The projects in this space and the issues on their boards.
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
            const ratio = projIssues.length > 0 ? doneCount / projIssues.length : 0

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
                        {projIssues.length} active issues · {(proj.members ?? []).length} members
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

                {/* Sub-page links */}
                <XStack items="center" justify="space-between" flexWrap="wrap" gap={8}>
                  <XStack gap={6} flexWrap="wrap">
                    {(
                      [
                        ['issues', 'Board'],
                        ['issues/list', 'List'],
                        ['issues/timeline', 'Timeline'],
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

