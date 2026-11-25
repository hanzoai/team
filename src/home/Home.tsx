/**
 * Workspace Home (#391): executive summary of pending approvals, active work by
 * owner, overdue tasks, recent inbox activity, and quick links to live rooms
 * and projects. Every count and row comes strictly from live workspace data.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, ScrollArea, Separator, SizableText, Skeleton, XStack, YStack } from '@hanzo/ui'
import {
  AlertCircle,
  Bell,
  Bot,
  FolderKanban,
  Hash,
  MessagesSquare,
  ShieldCheck,
  SquareCheck,
  User,
} from '@hanzogui/lucide-icons-2'

import { useRooms } from '~/chat/read.ts'
import { useSpace } from '~/data/space.tsx'
import { usePendingApprovals } from '~/handoff/store.ts'
import { ApprovalCard } from '~/inbox/ApprovalCard.tsx'
import { see, useNotes } from '~/inbox/feed.ts'
import { Row } from '~/inbox/Row.tsx'
import { useBoard, useProjects } from '~/serve.tsx'
import { press, setAsideKind, showAside } from '~/shell'
import { caps, paint, ring, round, rung } from '~/theme/theme.ts'
import type { Issue } from '~/tracker/board/model.ts'
import { dot } from '~/tracker/board/tone.ts'
import { formatDueDate } from '~/tracker/source.ts'
import { buildHomeSummary } from './summary.ts'

export function Home() {
  const navigate = useNavigate()
  const { current } = useSpace()
  const boardSource = useBoard()
  const approvals = usePendingApprovals()
  const notesFeed = useNotes()
  const roomsFeed = useRooms()
  const projectsFeed = useProjects()

  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [boardError, setBoardError] = useState<Error | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!boardSource) {
      setIssues(null)
      return
    }
    setBoardError(null)
    return boardSource.watch(
      (next) => {
        setIssues(next)
        setBoardError(null)
      },
      (err) => setBoardError(err),
    )
  }, [boardSource, retryTick])

  const openInbox = () => {
    setAsideKind('inbox')
    showAside()
  }

  const notes = notesFeed.data ?? []
  const rooms = (roomsFeed.data ?? []).filter((r) => r.kind === 'channel').slice(0, 6)
  const projects = (projectsFeed.data ?? []).filter((p) => !p.archived).slice(0, 6)
  const loadingBoard = issues === null && !boardError

  const summary = useMemo(
    () => buildHomeSummary({ issues: issues ?? [], approvals, notes }),
    [issues, approvals, notes],
  )

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={16} $md={{ p: 24 }} gap={20} maxW={1080} width="100%" mx="auto">
        {/* Header */}
        <XStack items="center" justify="space-between" gap={12} flexWrap="wrap">
          <YStack gap={4}>
            <SizableText fontSize="$6" fontWeight="700" color="$ink">
              {current?.name ? `${current.name} Home` : 'Workspace Home'}
            </SizableText>
            <SizableText fontSize={rung.small} color="$soft">
              Live approvals, active ownership, and recent activity across your workspace.
            </SizableText>
          </YStack>
          <XStack gap={8} flexWrap="wrap">
            <Button size="sm" variant="outline" onPress={() => navigate('/chat')}>
              <MessagesSquare size={14} />
              Open Chat
            </Button>
            <Button size="sm" variant="outline" onPress={() => navigate('/issues')}>
              <SquareCheck size={14} />
              All Issues
            </Button>
          </XStack>
        </XStack>

        {/* Summary KPI Strip */}
        <XStack gap={12} flexWrap="wrap">
          <StatCard
            icon={<ShieldCheck size={15} color={summary.pendingApprovalsCount > 0 ? paint.alert : paint.dim} />}
            label="Pending approvals"
            value={summary.pendingApprovalsCount}
            onPress={openInbox}
          />
          <StatCard
            icon={<SquareCheck size={15} color="$soft" />}
            label="Active tasks"
            value={loadingBoard ? '—' : summary.activeCount}
            onPress={() => navigate('/issues')}
          />
          <StatCard
            icon={<AlertCircle size={15} color={summary.overdueCount > 0 ? paint.alert : paint.dim} />}
            label="Overdue"
            value={loadingBoard ? '—' : summary.overdueCount}
            onPress={() => navigate('/issues/timeline')}
          />
          <StatCard
            icon={<Bell size={15} color={summary.unreadNotesCount > 0 ? paint.alert : paint.dim} />}
            label="Unread updates"
            value={notesFeed.phase === 'loading' ? '—' : summary.unreadNotesCount}
            onPress={openInbox}
          />
        </XStack>

        {/* Pending Approvals */}
        <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$panel" overflow="hidden">
          <XStack px={16} py={12} items="center" justify="space-between" borderBottomWidth={1} borderColor="$edge">
            <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
              Approvals Waiting on You
            </SizableText>
            <SizableText fontSize={rung.chip} color="$dim">
              {approvals.length}
            </SizableText>
          </XStack>
          {approvals.length === 0 ? (
            <YStack p={16}>
              <SizableText fontSize={rung.small} color="$soft">
                No pending approvals right now. Hand off work in Chat or Issues when an approval gate is needed.
              </SizableText>
            </YStack>
          ) : (
            <YStack>
              {approvals.map((rec) => (
                <ApprovalCard key={rec.id} record={rec} />
              ))}
            </YStack>
          )}
        </YStack>

        {/* Active Work by Owner */}
        <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$panel" overflow="hidden">
          <XStack px={16} py={12} items="center" justify="space-between" borderBottomWidth={1} borderColor="$edge">
            <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
              Active Work by Owner
            </SizableText>
            <Button size="xs" variant="ghost" onPress={() => navigate('/issues')}>
              View board
            </Button>
          </XStack>
          {boardError ? (
            <YStack p={16} gap={8} items="flex-start" role="alert">
              <SizableText fontSize={rung.small} color="$ink">
                {boardError.message}
              </SizableText>
              <Button size="sm" variant="outline" onPress={() => setRetryTick((n) => n + 1)}>
                Try again
              </Button>
            </YStack>
          ) : loadingBoard ? (
            <YStack p={16} gap={8} aria-busy={true} aria-label="Loading active work">
              <Skeleton height={36} />
              <Skeleton height={36} />
            </YStack>
          ) : summary.owners.length === 0 ? (
            <YStack p={16} gap={8} items="flex-start">
              <SizableText fontSize={rung.small} color="$soft">
                No active issues yet. Create one from Chat or the Tracker.
              </SizableText>
              <Button size="sm" variant="outline" onPress={() => navigate('/issues')}>
                Go to Tracker
              </Button>
            </YStack>
          ) : (
            summary.owners.map((owner, idx) => (
              <YStack key={owner.id}>
                {idx > 0 ? <Separator borderColor="$edge" /> : null}
                <YStack px={16} py={12} gap={8}>
                  <XStack items="center" justify="space-between" gap={8}>
                    <XStack items="center" gap={6}>
                      {owner.bot ? <Bot size={14} color="$ink" /> : <User size={14} color="$ink" />}
                      <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
                        {owner.name}
                      </SizableText>
                    </XStack>
                    <XStack items="center" gap={8}>
                      <SizableText fontSize={rung.chip} color="$soft">
                        {`${owner.active} active`}
                      </SizableText>
                      {owner.overdue > 0 ? (
                        <SizableText fontSize={rung.chip} fontWeight="700" style={{ color: paint.alert }}>
                          {`${owner.overdue} overdue`}
                        </SizableText>
                      ) : null}
                    </XStack>
                  </XStack>
                  <YStack gap={4}>
                    {owner.issues.slice(0, 4).map((issue) => (
                      <XStack
                        key={issue.id}
                        {...press(() => navigate(`/issues?issue=${encodeURIComponent(issue.id)}`), `Open ${issue.key}`)}
                        px={10}
                        py={6}
                        rounded={round.field}
                        bg="$raised"
                        items="center"
                        gap={8}
                        hoverStyle={{ background: '$hover' }}
                        focusVisibleStyle={ring}
                      >
                        <YStack width={7} height={7} rounded={9999} shrink={0} style={{ backgroundColor: dot[issue.status] }} />
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$soft" shrink={0}>
                          {issue.key}
                        </SizableText>
                        <SizableText fontSize={rung.small} color="$ink" flex={1} numberOfLines={1}>
                          {issue.title}
                        </SizableText>
                        {issue.dueDate ? (
                          <SizableText fontSize={rung.chip} color="$dim" shrink={0}>
                            {formatDueDate(issue.dueDate)}
                          </SizableText>
                        ) : null}
                      </XStack>
                    ))}
                  </YStack>
                </YStack>
              </YStack>
            ))
          )}
        </YStack>

        {/* Recent Activity & Quick Jump */}
        <XStack gap={16} flexWrap="wrap">
          <YStack flex={1} minW={280} rounded={round.card} borderWidth={1} borderColor="$edge" bg="$panel" overflow="hidden">
            <XStack px={16} py={12} items="center" justify="space-between" borderBottomWidth={1} borderColor="$edge">
              <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                Recent Activity
              </SizableText>
              <SizableText fontSize={rung.chip} color="$dim">
                {summary.recentNotes.length}
              </SizableText>
            </XStack>
            {summary.recentNotes.length === 0 ? (
              <YStack p={16}>
                <SizableText fontSize={rung.small} color="$soft">
                  All caught up — no recent notifications.
                </SizableText>
              </YStack>
            ) : (
              summary.recentNotes.map((n) => (
                <Row
                  key={n.id}
                  note={n}
                  onSee={see}
                  onOpen={(item) => {
                    if (item.to) navigate(item.to)
                  }}
                />
              ))
            )}
          </YStack>

          <YStack width="100%" $md={{ width: 300 }} gap={12}>
            <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$panel" p={14} gap={8}>
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Channels
              </SizableText>
              {rooms.length === 0 ? (
                <SizableText fontSize={rung.small} color="$soft">
                  No channels in this workspace yet.
                </SizableText>
              ) : (
                rooms.map((r) => (
                  <XStack
                    key={r.id}
                    {...press(() => navigate(`/chat/${encodeURIComponent(r.id)}`), `Open #${r.name}`)}
                    px={8}
                    py={6}
                    rounded={round.field}
                    items="center"
                    gap={6}
                    hoverStyle={{ background: '$hover' }}
                    focusVisibleStyle={ring}
                  >
                    <Hash size={13} color="$soft" />
                    <SizableText fontSize={rung.small} color="$ink" numberOfLines={1}>
                      {r.name}
                    </SizableText>
                  </XStack>
                ))
              )}
            </YStack>

            <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$panel" p={14} gap={8}>
              <SizableText fontSize={rung.chip} fontWeight="700" color="$dim" {...caps}>
                Projects
              </SizableText>
              {projects.length === 0 ? (
                <Button size="sm" variant="outline" onPress={() => navigate('/projects?new')}>
                  Create first project
                </Button>
              ) : (
                projects.map((p) => (
                  <XStack
                    key={p._id}
                    {...press(() => navigate(`/projects/${encodeURIComponent(p._id)}/issues`), `Open ${p.name}`)}
                    px={8}
                    py={6}
                    rounded={round.field}
                    items="center"
                    gap={6}
                    hoverStyle={{ background: '$hover' }}
                    focusVisibleStyle={ring}
                  >
                    <FolderKanban size={13} color="$soft" />
                    <SizableText fontSize={rung.chip} fontWeight="700" color="$soft">
                      {p.identifier}
                    </SizableText>
                    <SizableText fontSize={rung.small} color="$ink" numberOfLines={1} flex={1}>
                      {p.name}
                    </SizableText>
                  </XStack>
                ))
              )}
            </YStack>
          </YStack>
        </XStack>
      </YStack>
    </ScrollArea>
  )
}

const StatCard = ({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  onPress: () => void
}) => (
  <YStack
    {...press(onPress, `${label}: ${value}`)}
    flex={1}
    minW={140}
    p={14}
    gap={6}
    rounded={round.card}
    borderWidth={1}
    borderColor="$edge"
    bg="$panel"
    hoverStyle={{ background: '$hover' }}
    focusVisibleStyle={ring}
  >
    <XStack items="center" justify="space-between">
      <SizableText fontSize={rung.chip} fontWeight="600" color="$dim">
        {label}
      </SizableText>
      {icon}
    </XStack>
    <SizableText fontSize="$7" fontWeight="700" color="$ink">
      {value}
    </SizableText>
  </YStack>
)
