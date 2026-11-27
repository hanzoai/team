/**
 * THE ISSUES SCREEN: the head, and the board, list, or timeline under it.
 *
 * Never renders seeded demo issues as live workspace state:
 * - Signed-in + live plane -> `cloudBoard`
 * - Workspace refused / unreachable -> `standby('refused')` (explicit error state)
 * - Workspace still opening -> `standby('opening')`
 * - Stranger / no workspace -> `standby('nowhere')`
 * - Explicit local desktop guest mode -> empty `localBoardSource`
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { XStack, YStack } from '@hanzo/ui'

import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { useBoard, useCrew, useProject, useProjects } from '~/serve'
import { localBoardSource } from '~/workspace/board.ts'
import { useWorkspace } from '~/workspace/store.ts'
import { Board } from './board/Board.tsx'
import type { Issue, Person, Priority, Status } from './board/model.ts'
import { standby } from './board/standby.ts'
import { Head, VIEWS, type Step, type View } from './Head.tsx'
import { IssueDrawer, NewIssueModal } from './IssueDrawer.tsx'
import { IssueList, IssueTimeline } from './Views.tsx'

const viewOf = (asked: string | undefined): View =>
  VIEWS.find((v) => v.id === asked)?.id ?? 'kanban'

export const Tracker = ({ mine = false }: { mine?: boolean }) => {
  const { id, view } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryIssue = searchParams.get('issue')
  const project = useProject(id)
  const { guest } = useSession()
  const { plane, standing } = useSpace()
  const { roster } = useWorkspace()
  const cloudBoard = useBoard(id, mine)

  const source = useMemo(() => {
    if (plane && cloudBoard) return cloudBoard
    if (guest) return localBoardSource
    if (standing === 'refused') return standby('refused')
    if (standing === 'stranger') return standby('nowhere')
    return standby('opening')
  }, [plane, cloudBoard, guest, standing])

  const add = source.add?.bind(source)
  const cloudCrew = useCrew(id)
  const rosterCrew = useMemo<Person[]>(
    () =>
      roster.map((r) => ({
        id: r.id,
        name: r.name,
        face: r.avatar,
        bot: r.bot,
      })),
    [roster],
  )
  const people = cloudCrew.length > 0 ? cloudCrew : rosterCrew
  const [only, setOnly] = useState<Priority[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(queryIssue)
  const [liveIssues, setLiveIssues] = useState<Issue[]>([])
  const [createStatus, setCreateStatus] = useState<Status | null>(null)
  const here = viewOf(view)

  useEffect(() => {
    if (queryIssue) setSelectedId(queryIssue)
  }, [queryIssue])

  const openIssue = (issueId: string | null) => {
    setSelectedId(issueId)
    if (issueId !== queryIssue) {
      const next = new URLSearchParams(searchParams)
      if (issueId) next.set('issue', issueId)
      else next.delete('issue')
      setSearchParams(next, { replace: true })
    }
  }

  const all = useProjects().data
  const choices = useMemo(
    () => (id ? undefined : (all ?? []).filter((p) => !p.archived).map((p) => ({ id: p._id, name: p.name, identifier: p.identifier }))),
    [id, all],
  )

  useEffect(() => {
    return source.watch(
      (next) => setLiveIssues(next),
      () => {
        setLiveIssues([])
      },
    )
  }, [source])

  const selectedIssue = selectedId ? liveIssues.find((i) => i.id === selectedId) ?? null : null

  const base = mine ? '/mine' : id ? `/projects/${id}/issues` : '/issues'
  const trail: Step[] = [
    { label: 'Your projects', to: '/projects' },
    ...(id ? [{ label: project?.name ?? '…', to: base }] : []),
    { label: mine ? 'My issues' : id ? 'Issues' : 'All issues' },
  ]

  return (
    <YStack flex={1} minH={0}>
      <Head
        trail={trail}
        title={mine ? 'My issues' : id ? 'Issues' : 'All issues'}
        base={base}
        here={here}
        people={people}
        only={only}
        onOnly={setOnly}
        onAdd={add ? () => setCreateStatus('backlog') : undefined}
      />
      <XStack flex={1} minH={0} minW={0}>
        <YStack flex={1} minH={0} minW={0}>
          {here === 'kanban' ? (
            <Board
              source={source}
              only={only}
              onOpen={(issue) => openIssue(issue.id)}
              onCreateIn={add ? (status) => setCreateStatus(status) : undefined}
            />
          ) : here === 'list' ? (
            <IssueList
              source={source}
              only={only}
              onOpen={(issue) => openIssue(issue.id)}
              onCreateIn={add ? (status) => setCreateStatus(status) : undefined}
            />
          ) : (
            <IssueTimeline
              source={source}
              only={only}
              onOpen={(issue) => openIssue(issue.id)}
            />
          )}
        </YStack>
        {selectedIssue ? (
          <IssueDrawer
            issue={selectedIssue}
            source={source}
            people={people}
            onClose={() => openIssue(null)}
          />
        ) : null}
      </XStack>
      {createStatus && add ? (
        <NewIssueModal
          initialStatus={createStatus}
          people={people}
          projects={choices}
          onCreate={async (status, title, patch) => {
            await add(status, title, patch)
          }}
          onClose={() => setCreateStatus(null)}
        />
      ) : null}
    </YStack>
  )
}
