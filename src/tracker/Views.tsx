/**
 * Issue List & Sprint/Roadmap Timeline views for the Tracker.
 *
 * Uses the exact same reactive `Source` (`source.watch`, `source.move`, `source.add`)
 * as `Board.tsx`, so status changes and new issues reflect immediately across
 * Kanban, List, and Timeline views.
 */
import { useEffect, useState } from 'react'
import { Badge, Button, ScrollArea, Separator, SizableText, Skeleton, XStack, YStack } from '@hanzo/ui'
import { EmptyState } from '@hanzo/ui/product'
import { CalendarDays, List, MessageSquare, Paperclip, Plus } from '@hanzogui/lucide-icons-2'

import { press } from '~/shell/press.ts'
import { caps, gap, paint, round, rung } from '~/theme/theme.ts'
import { NEW } from './board/Board.tsx'
import { Count } from './board/Count.tsx'
import { columns, move } from './board/move.ts'
import { People } from './board/People.tsx'
import { Ring } from './board/Ring.tsx'
import { dot, tone } from './board/tone.ts'
import { STATUS, type Issue, type Priority, type Source, type Status } from './board/model.ts'
import { dueWeekIndex, formatDueDate, isOverdue, timelineWeeks } from './source.ts'

const CHIP = { minHeight: 18, height: 18, paddingHorizontal: 8, borderRadius: 9999 } as const
const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1)

const nextStatus = (current: Status): Status => {
  const idx = STATUS.indexOf(current)
  return STATUS[(idx + 1) % STATUS.length] ?? 'backlog'
}

export const IssueList = ({
  source,
  only,
  onOpen,
  onCreateIn,
}: {
  source: Source
  only?: readonly Priority[]
  onOpen?: (issue: Issue) => void
  onCreateIn?: (status: Status) => void
}) => {
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [failed, setFailed] = useState<Error | null>(null)
  const [again, setAgain] = useState(0)

  useEffect(() => {
    setIssues(null)
    setFailed(null)
    return source.watch(
      (next) => {
        setIssues(next)
        setFailed(null)
      },
      setFailed,
    )
  }, [source, again])

  const add = source.add?.bind(source)
  const openIn = onCreateIn ?? (add ? (status: Status) => void add(status, NEW).catch(setFailed) : undefined)

  const advance = (issue: Issue) => {
    if (!issues) return
    const target = nextStatus(issue.status)
    setIssues(move(issues, issue.id, target))
    source.move(issue.id, target).catch(setFailed)
  }

  if (failed) {
    return (
      <YStack p={24} gap="$3" items="flex-start" role="alert">
        <SizableText fontSize="$4" color="$ink">
          {failed.message}
        </SizableText>
        <Button variant="outline" size="sm" onPress={() => setAgain((n) => n + 1)}>
          Try again
        </Button>
      </YStack>
    )
  }

  if (!issues) {
    return (
      <YStack p={24} gap="$3" aria-busy={true} aria-label="Loading issue list">
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <Skeleton key={r} height={44} />
        ))}
      </YStack>
    )
  }

  const baseFiltered = only?.length
    ? issues.filter((i) => i.priority && only.includes(i.priority))
    : issues
  const showing = baseFiltered

  if (showing.length === 0) {
    return (
      <YStack p={24} items="flex-start">
        <EmptyState
          icon={List}
          title="No matching issues"
          description="Issues appear here grouped by workflow status."
          primary={openIn ? { label: 'New issue', onPress: () => openIn('backlog') } : undefined}
        />
      </YStack>
    )
  }

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={16} $md={{ p: 24 }} gap={20}>
        {columns(showing).map((column) => (
          <YStack
            key={column.status}
            rounded={round.card}
            borderWidth={1}
            borderColor="$edge"
            bg="$background"
            overflow="hidden"
          >
            {/* Group Header */}
            <XStack
              px={16}
              height={40}
              items="center"
              gap={gap.tight}
              bg="$panel"
              borderBottomWidth={column.issues.length > 0 ? 1 : 0}
              borderColor="$edge"
            >
              <YStack
                width={8}
                height={8}
                rounded={9999}
                shrink={0}
                style={{ backgroundColor: dot[column.status] }}
              />
              <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                {column.name}
              </SizableText>
              <SizableText fontSize={rung.small} color="$dim">
                {column.issues.length}
              </SizableText>
              <XStack flex={1} />
              {openIn ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Add issue to ${column.name}`}
                  onPress={() => openIn(column.status)}
                >
                  <Plus size={14} />
                </Button>
              ) : null}
            </XStack>

            {/* Rows */}
            {column.issues.map((issue, idx) => {
              const chips = issue.priority ? [cap(issue.priority), ...issue.labels] : issue.labels
              const dueText = formatDueDate(issue.dueDate)
              const overdue = isOverdue(issue.dueDate, issue.status)
              return (
                <YStack key={issue.id}>
                  {idx > 0 ? <Separator borderColor="$edge" /> : null}
                  <XStack
                    px={16}
                    py={10}
                    items="center"
                    gap={10}
                    flexWrap="wrap"
                    cursor={onOpen ? 'pointer' : 'default'}
                    hoverStyle={{ background: '$hover' }}
                    onPress={() => onOpen?.(issue)}
                  >
                    {/* Clickable status dot to cycle status */}
                    <XStack
                      {...press((e?: { stopPropagation?: () => void }) => {
                        e?.stopPropagation?.()
                        advance(issue)
                      }, `Advance ${issue.key} status`)}
                      width={20}
                      height={20}
                      rounded={9999}
                      items="center"
                      justify="center"
                      borderWidth={1}
                      borderColor="$edge"
                      bg="$panel"
                    >
                      <YStack
                        width={8}
                        height={8}
                        rounded={9999}
                        style={{ backgroundColor: dot[issue.status] }}
                      />
                    </XStack>

                    {/* Issue Key */}
                    <SizableText
                      fontSize={rung.small}
                      fontWeight="600"
                      color="$soft"
                      width={68}
                      shrink={0}
                    >
                      {issue.key}
                    </SizableText>

                    {/* Title */}
                    <SizableText
                      fontSize={rung.body}
                      color="$ink"
                      flex={1}
                      minW={140}
                      numberOfLines={1}
                    >
                      {issue.title}
                    </SizableText>

                    {/* Chips */}
                    <XStack gap={gap.tight} items="center" flexWrap="wrap">
                      {dueText ? (
                        <XStack px={7} height={18} rounded={9999} bg="$panel" borderWidth={1} borderColor="$edge" items="center">
                          <SizableText fontSize={rung.chip} fontWeight={overdue ? '700' : '500'} style={{ color: overdue ? paint.alert : paint.mute }}>
                            {dueText}
                          </SizableText>
                        </XStack>
                      ) : null}
                      {chips.map((label) => {
                        const { background, color } = tone(label, issue.priority)
                        return (
                          <Badge key={label} variant="default" style={{ ...CHIP, backgroundColor: background }}>
                            <SizableText fontSize={rung.chip} fontWeight="600" style={{ color }}>
                              {label}
                            </SizableText>
                          </Badge>
                        )
                      })}
                      {issue.origin ? (
                        <XStack
                          px={8}
                          height={18}
                          rounded={9999}
                          bg="$panel"
                          borderWidth={1}
                          borderColor="$edge"
                          items="center"
                        >
                          <SizableText fontSize={rung.chip} color="$quiet">
                            {issue.origin.name}
                          </SizableText>
                        </XStack>
                      ) : null}
                    </XStack>

                    {/* Completion Ring */}
                    <XStack width={64} items="center" justify="flex-end" gap={4} shrink={0}>
                      {issue.done !== undefined ? (
                        <>
                          <Ring done={issue.done} />
                          <SizableText fontSize={rung.small} color="$soft">
                            {Math.round(issue.done * 100)}%
                          </SizableText>
                        </>
                      ) : null}
                    </XStack>

                    {/* Counts */}
                    <XStack width={64} items="center" justify="flex-end" gap="$2" shrink={0}>
                      <Count glyph={<Paperclip size={12} color="$dim" />} n={issue.files} label="attachments" />
                      <Count glyph={<MessageSquare size={12} color="$dim" />} n={issue.replies} label="replies" />
                    </XStack>

                    {/* People */}
                    <XStack items="center" gap={6} justify="flex-end" shrink={0}>
                      <People people={issue.people} size={24} show={3} />
                      {issue.people[0]?.name ? (
                        <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1} maxW={96}>
                          {issue.people[0].bot ? `@${issue.people[0].name}` : issue.people[0].name}
                        </SizableText>
                      ) : null}
                    </XStack>
                  </XStack>
                </YStack>
              )
            })}
          </YStack>
        ))}
      </YStack>
    </ScrollArea>
  )
}

export const IssueTimeline = ({
  source,
  only,
  onOpen,
}: {
  source: Source
  only?: readonly Priority[]
  onOpen?: (issue: Issue) => void
}) => {
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [failed, setFailed] = useState<Error | null>(null)

  useEffect(() => {
    setIssues(null)
    setFailed(null)
    return source.watch(
      (next) => {
        setIssues(next)
        setFailed(null)
      },
      setFailed,
    )
  }, [source])

  const advance = (issue: Issue) => {
    if (!issues) return
    const target = nextStatus(issue.status)
    setIssues(move(issues, issue.id, target))
    source.move(issue.id, target).catch(setFailed)
  }

  if (failed) {
    return (
      <YStack p={24}>
        <SizableText fontSize="$4" color="$ink">
          {failed.message}
        </SizableText>
      </YStack>
    )
  }

  if (!issues) {
    return (
      <YStack p={24} gap="$3" aria-busy={true} aria-label="Loading timeline">
        {[0, 1, 2, 3, 4].map((r) => (
          <Skeleton key={r} height={48} />
        ))}
      </YStack>
    )
  }

  const showing = only?.length
    ? issues.filter((i) => i.priority && only.includes(i.priority))
    : issues

  if (showing.length === 0) {
    return (
      <YStack p={24} items="flex-start">
        <EmptyState
          icon={CalendarDays}
          title="No issues on timeline"
          description="Set a due date on any issue to plot it across upcoming weeks."
        />
      </YStack>
    )
  }

  const weeks = timelineWeeks(Date.now(), 6)
  const scheduled = showing.filter((i) => dueWeekIndex(i.dueDate, weeks) >= 0)
  const later = showing.filter((i) => Boolean(i.dueDate) && dueWeekIndex(i.dueDate, weeks) < 0)
  const unscheduled = showing.filter((i) => !i.dueDate)

  return (
    <ScrollArea flex={1} minH={0}>
      <YStack p={16} $md={{ p: 24 }} gap={16}>
        {scheduled.length > 0 ? (
          <YStack
            rounded={round.card}
            borderWidth={1}
            borderColor="$edge"
            bg="$background"
            style={{ overflowX: 'auto' }}
          >
            <YStack minW={720}>
            {/* Real Calendar Header */}
            <XStack bg="$panel" borderBottomWidth={1} borderColor="$edge" height={48} items="center">
              <XStack width={240} shrink={0} px={16} items="center" justify="space-between" borderRightWidth={1} borderColor="$edge" height="100%">
                <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                  Scheduled Issues
                </SizableText>
                <SizableText fontSize={rung.chip} color="$soft">
                  {scheduled.length}
                </SizableText>
              </XStack>
              <XStack flex={1} height="100%" minW={0}>
                {weeks.map((w) => (
                  <YStack
                    key={w.id}
                    flex={1}
                    px={8}
                    justify="center"
                    borderRightWidth={1}
                    borderColor="$edge"
                    bg={w.now ? '$hover' : 'transparent'}
                  >
                    <XStack items="center" gap={6}>
                      {w.now ? (
                        <YStack width={6} height={6} rounded={9999} style={{ backgroundColor: paint.accent }} />
                      ) : null}
                      <SizableText fontSize={rung.small} fontWeight="600" color={w.now ? '$ink' : '$soft'} numberOfLines={1}>
                        {w.label}
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={rung.chip} color="$quiet" numberOfLines={1}>
                      {w.sub}
                    </SizableText>
                  </YStack>
                ))}
              </XStack>
            </XStack>

            {scheduled.map((issue, idx) => {
              const col = dueWeekIndex(issue.dueDate, weeks)
              const leftPct = (col / weeks.length) * 100
              const widthPct = 100 / weeks.length
              const overdue = isOverdue(issue.dueDate, issue.status)
              const dueLabel = formatDueDate(issue.dueDate)

              return (
                <YStack key={issue.id}>
                  {idx > 0 ? <Separator borderColor="$edge" /> : null}
                  <XStack height={46} items="center" hoverStyle={{ background: '$hover' }}>
                    <XStack
                      width={240}
                      shrink={0}
                      px={16}
                      gap={8}
                      items="center"
                      borderRightWidth={1}
                      borderColor="$edge"
                      height="100%"
                      cursor={onOpen ? 'pointer' : 'default'}
                      onPress={() => onOpen?.(issue)}
                    >
                      <YStack
                        width={8}
                        height={8}
                        rounded={9999}
                        shrink={0}
                        style={{ backgroundColor: dot[issue.status] }}
                      />
                      <SizableText fontSize={rung.chip} fontWeight="600" color="$soft" width={54} shrink={0}>
                        {issue.key}
                      </SizableText>
                      <SizableText fontSize={rung.small} color="$ink" flex={1} numberOfLines={1}>
                        {issue.title}
                      </SizableText>
                      <People people={issue.people} size={20} show={1} />
                    </XStack>

                    <XStack flex={1} height="100%" position="relative" items="center">
                      {weeks.map((w) => (
                        <YStack
                          key={w.id}
                          flex={1}
                          height="100%"
                          borderRightWidth={1}
                          borderColor="$edge"
                          bg={w.now ? '$panel' : 'transparent'}
                        />
                      ))}

                      <XStack
                        {...press(() => advance(issue), `${issue.key} due ${dueLabel} — click to advance status`)}
                        position="absolute"
                        style={{
                          left: `${leftPct + 0.8}%`,
                          width: `${widthPct - 1.6}%`,
                        }}
                        height={26}
                        rounded={round.field}
                        bg="$panel"
                        borderWidth={1}
                        borderColor={overdue ? paint.alert : '$edge'}
                        overflow="hidden"
                        items="center"
                        px={8}
                        justify="space-between"
                      >
                        <SizableText fontSize={rung.chip} fontWeight="600" color="$ink" numberOfLines={1}>
                          {dueLabel}
                        </SizableText>
                      </XStack>
                    </XStack>
                  </XStack>
                </YStack>
              )
            })}
            </YStack>
          </YStack>
        ) : null}

        {later.length > 0 ? (
          <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$background" overflow="hidden">
            <XStack px={16} height={40} items="center" justify="space-between" bg="$panel" borderBottomWidth={1} borderColor="$edge">
              <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                Later (beyond 6 weeks)
              </SizableText>
              <SizableText fontSize={rung.chip} color="$dim">
                {later.length}
              </SizableText>
            </XStack>
            {later.map((issue, idx) => (
              <YStack key={issue.id}>
                {idx > 0 ? <Separator borderColor="$edge" /> : null}
                <XStack
                  px={16}
                  py={10}
                  items="center"
                  gap={10}
                  cursor={onOpen ? 'pointer' : 'default'}
                  hoverStyle={{ background: '$hover' }}
                  onPress={() => onOpen?.(issue)}
                >
                  <YStack width={8} height={8} rounded={9999} shrink={0} style={{ backgroundColor: dot[issue.status] }} />
                  <SizableText fontSize={rung.small} fontWeight="600" color="$soft" width={64} shrink={0}>
                    {issue.key}
                  </SizableText>
                  <SizableText fontSize={rung.body} color="$ink" flex={1} numberOfLines={1}>
                    {issue.title}
                  </SizableText>
                  <SizableText fontSize={rung.chip} color="$soft" shrink={0}>
                    {formatDueDate(issue.dueDate)}
                  </SizableText>
                  <People people={issue.people} size={20} show={2} />
                </XStack>
              </YStack>
            ))}
          </YStack>
        ) : null}

        {unscheduled.length > 0 ? (
          <YStack rounded={round.card} borderWidth={1} borderColor="$edge" bg="$background" overflow="hidden">
            <XStack px={16} height={40} items="center" justify="space-between" bg="$panel" borderBottomWidth={1} borderColor="$edge">
              <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
                Unscheduled (no due date)
              </SizableText>
              <SizableText fontSize={rung.chip} color="$dim">
                {`${unscheduled.length} — open an issue to set a due date`}
              </SizableText>
            </XStack>
            {unscheduled.map((issue, idx) => (
              <YStack key={issue.id}>
                {idx > 0 ? <Separator borderColor="$edge" /> : null}
                <XStack
                  px={16}
                  py={10}
                  items="center"
                  gap={10}
                  cursor={onOpen ? 'pointer' : 'default'}
                  hoverStyle={{ background: '$hover' }}
                  onPress={() => onOpen?.(issue)}
                >
                  <YStack width={8} height={8} rounded={9999} shrink={0} style={{ backgroundColor: dot[issue.status] }} />
                  <SizableText fontSize={rung.small} fontWeight="600" color="$soft" width={64} shrink={0}>
                    {issue.key}
                  </SizableText>
                  <SizableText fontSize={rung.body} color="$ink" flex={1} numberOfLines={1}>
                    {issue.title}
                  </SizableText>
                  <People people={issue.people} size={20} show={2} />
                </XStack>
              </YStack>
            ))}
          </YStack>
        ) : null}
      </YStack>
    </ScrollArea>
  )
}
