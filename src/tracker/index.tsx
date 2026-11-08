/**
 * THE ISSUES SCREEN: the head, and the board, list, or timeline under it.
 *
 * The head is chrome and the board is data, which is why they are siblings
 * rather than nested — a header that disappears while its contents load makes
 * three screens out of one, and the reference draws the same band in every
 * state.
 *
 * One screen serves `/projects/:id/issues`, `/issues`, and `/mine`; they differ
 * in what the source is scoped to and in what the trail says, and in nothing
 * else.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { XStack, YStack } from '@hanzo/ui'

import { useSpace } from '~/data/space.tsx'
import { standingIs, useBoard, useCrew, useProject } from '~/serve'
import { Board } from './board/Board.tsx'
import { standby } from './board/fixture.ts'
import type { Issue, Priority, Status } from './board/model.ts'
import { Head, VIEWS, type Step, type View } from './Head.tsx'
import { IssueDrawer, NewIssueModal } from './IssueDrawer.tsx'
import { IssueList, IssueTimeline } from './Views.tsx'

/** The view in the address, or Kanban — the default view. */
const viewOf = (asked: string | undefined): View =>
  VIEWS.find((v) => v.id === asked)?.id ?? 'kanban'

export const Tracker = ({ mine = false }: { mine?: boolean }) => {
  const { id, view } = useParams()
  const project = useProject(id)
  const { standing } = useSpace()
  const source = useBoard(id) ?? standby(standingIs(standing))
  const add = source.add?.bind(source)
  const people = useCrew(id)
  const [only, setOnly] = useState<Priority[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [liveIssues, setLiveIssues] = useState<Issue[]>([])
  const [createStatus, setCreateStatus] = useState<Status | null>(null)
  const here = viewOf(view)

  useEffect(() => {
    return source.watch(
      (next) => setLiveIssues(next),
      () => {},
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
              onOpen={(issue) => setSelectedId(issue.id)}
              onCreateIn={add ? (status) => setCreateStatus(status) : undefined}
            />
          ) : here === 'list' ? (
            <IssueList
              source={source}
              only={only}
              mine={mine}
              onOpen={(issue) => setSelectedId(issue.id)}
              onCreateIn={add ? (status) => setCreateStatus(status) : undefined}
            />
          ) : (
            <IssueTimeline
              source={source}
              only={only}
              mine={mine}
              onOpen={(issue) => setSelectedId(issue.id)}
            />
          )}
        </YStack>
        {selectedIssue ? (
          <IssueDrawer
            issue={selectedIssue}
            source={source}
            people={people}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </XStack>
      {createStatus && add ? (
        <NewIssueModal
          initialStatus={createStatus}
          people={people}
          onCreate={async (status, title, patch) => {
            await add(status, title, patch)
          }}
          onClose={() => setCreateStatus(null)}
        />
      ) : null}
    </YStack>
  )
}
