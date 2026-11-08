import { useCallback, useEffect, useState } from 'react'
import { Button, ScrollView, SizableText, Skeleton, XStack, YStack } from '@hanzo/ui'
import { EmptyState } from '@hanzo/ui/product'
import { LayoutGrid } from '@hanzogui/lucide-icons-2'
import { Column, WIDTH } from './Column.tsx'
import { columns } from './move.ts'
import { move } from './move.ts'
import type { Issue, Priority, Source, Status } from './model.ts'

/**
 * The Issues board.
 *
 * Columns are fixed-width and the board scrolls sideways past the viewport
 * rather than reflowing them. That is the whole layout decision: a column that
 * narrows to fit stops being a column of cards, and the reference is itself
 * scrolled — its fourth column is cut by the panel edge.
 *
 * A drop writes twice. It moves the issue locally so the card lands under the
 * pointer, and it tells the source, whose next revision replaces the local
 * guess. A move someone else makes arrives through exactly that second path, so
 * there is one way a card ends up somewhere and no reconciliation between two.
 */
/** What a new issue is called until someone names it. */
export const NEW = 'New issue'

const GAP = 16 // gap.wide — column to column
/** The board's inset, on every side. Measured: the reference's column header
 *  sits at image 264 and the rule above it at 209, which is this inset plus
 *  half a header row. */
const PAD = 24

/**
 * `shrink: 0` on the content is what makes the board scroll rather than clip.
 * A horizontal ScrollView is a flex row, so its content is a flex ITEM and
 * shrinks to the scroller's width by default; its columns then overflow a box
 * that reports its own width, the scroll area never grows, and the last column
 * is cut with no way to reach it. Refusing to shrink is the whole fix.
 */

export const Board = ({ source, only, onOpen, onCreateIn }: {
  source: Source
  /** The priorities showing. Empty is every one of them. */
  only?: readonly Priority[]
  onOpen?: (issue: Issue) => void
  onCreateIn?: (status: Status) => void
}) => {
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [failed, setFailed] = useState<Error | null>(null)
  const [drag, setDrag] = useState<Issue | null>(null)
  const [over, setOver] = useState<{ status: Status; before: string | 'end' } | null>(null)
  const [again, setAgain] = useState(0)

  useEffect(() => {
    setIssues(null)
    setFailed(null)
    return source.watch(
      (next) => { setIssues(next); setFailed(null) },
      setFailed,
    )
  }, [source, again])

  const drop = useCallback(
    (status: Status, before?: string) => {
      setOver(null)
      const held = drag
      setDrag(null)
      if (!held || !issues) return
      setIssues(move(issues, held.id, status, before))
      source.move(held.id, status, before).catch(setFailed)
    },
    [drag, issues, source],
  )

  // The source says whether this board can open an issue; nothing else does.
  const add = source.add?.bind(source)
  const open = onCreateIn ?? (add ? (status: Status) => { add(status, NEW).catch(setFailed) } : undefined)

  if (failed) return <Failed why={failed.message} onRetry={() => setAgain((n) => n + 1)} />
  if (!issues) return <Loading />
  if (issues.length === 0) return <Nothing onAdd={open && (() => open('backlog'))} />

  const showing = only?.length ? issues.filter((i) => i.priority && only.includes(i.priority)) : issues

  return (
    <ScrollView horizontal contentContainerStyle={{ p: PAD, gap: GAP, shrink: 0 }}>
      {columns(showing).map((column) => (
        <Column
          key={column.status}
          column={column}
          drag={drag}
          over={over?.status === column.status ? over.before : null}
          onOver={(status, before) => setOver({ status, before })}
          onDrop={drop}
          onAdd={open}
          onOpen={onOpen}
          onLift={setDrag}
          onLand={() => { setDrag(null); setOver(null) }}
        />
      ))}
    </ScrollView>
  )
}

/** Four columns of card-shaped bars. The shape of what is coming, not a spinner. */
const Loading = () => (
  <XStack p={PAD} gap={GAP} aria-busy={true} aria-label="Loading issues">
    {[0, 1, 2, 3].map((c) => (
      <YStack key={c} width={WIDTH} gap="$2">
        <Skeleton height={12} width={96} />
        <Skeleton height={36} />
        {[0, 1, 2].map((r) => (
          <Skeleton key={r} height={176} />
        ))}
      </YStack>
    ))}
  </XStack>
)

const Nothing = ({ onAdd }: { onAdd?: () => void }) => (
  <YStack p={PAD} items="flex-start">
    <EmptyState
      icon={LayoutGrid}
      title="No issues yet"
      description="Issues you open appear here, one column per status."
      primary={onAdd ? { label: 'New issue', onPress: onAdd } : undefined}
    />
  </YStack>
)

/**
 * Says the board could not be read and offers to read it again. It does not
 * name a route, a status code or a service: none of that helps the person
 * holding the pointer, and the reference draws no such copy anywhere.
 */
const Failed = ({ why, onRetry }: { why: string; onRetry: () => void }) => (
  <YStack p={PAD} gap="$3" items="flex-start" role="alert">
    <SizableText fontSize="$4" color="$ink">
      {why}
    </SizableText>
    <Button variant="outline" size="sm" onPress={onRetry}>
      Try again
    </Button>
  </YStack>
)
