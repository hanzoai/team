import type { DragEvent } from 'react'
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  SizableText, XStack, YStack,
} from '@hanzo/ui'
import { MoreHorizontal, Plus } from '@hanzogui/lucide-icons-2'
import { Card } from './Card.tsx'
import type { Column as Model, Issue, Status } from './model.ts'
import { caps, gap, round, rung } from '../../theme/theme.ts'
import { dot } from './tone.ts'

/**
 * One status, its issues, and the two affordances that add to it.
 *
 * The header is flush with the cards rather than with a column padding: the dot
 * starts where a card starts and the menu ends where a card ends, so the whole
 * column reads as one edge. That is why the column has no horizontal padding of
 * its own and the width is stated once.
 *
 * While a card is in flight the column draws a dashed slot at the index it
 * would land in. It is the same rectangle the dragged card vacated, which is
 * what makes the gap read as a destination rather than as a hole.
 */
export const WIDTH = 208

export const Column = ({
  column, drag, over, onOver, onDrop, onAdd, onOpen, onLift, onLand,
}: {
  column: Model
  /** The issue in flight, from anywhere on the board. */
  drag: Issue | null
  /** The id this column would drop before, `end` for after the last, null for elsewhere. */
  over: string | 'end' | null
  onOver: (status: Status, before: string | 'end') => void
  onDrop: (status: Status, before?: string) => void
  /** Absent on a board with no project to open an issue in. */
  onAdd?: (status: Status) => void
  onOpen?: (issue: Issue) => void
  onLift: (issue: Issue) => void
  onLand: () => void
}) => {
  const land = (before?: string) => (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop(column.status, before)
  }
  const hover = (before: string | 'end') => (e: DragEvent) => {
    e.preventDefault()
    onOver(column.status, before)
  }

  return (
    <YStack
      data-slot="column"
      data-status={column.status}
      width={WIDTH}
      shrink={0}
      gap={gap.tight}
      role="list"
      aria-label={column.name}
      onDragOver={hover('end')}
      onDrop={land()}
    >
      <XStack items="center" gap={gap.tight} height={24}>
        <YStack width={8} height={8} rounded={9999} shrink={0} style={{ backgroundColor: dot[column.status] }} />
        <SizableText fontSize={rung.small} fontWeight="700" color="$ink" {...caps}>
          {column.name}
        </SizableText>
        <SizableText fontSize={rung.small} color="$dim">
          – {column.issues.length}
        </SizableText>
        <XStack flex={1} />
        {onAdd ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${column.name} actions`}>
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAdd(column.status)}>Add issue</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </XStack>

      {onAdd ? (
        <Button
          variant="ghost"
          height={36}
          width="100%"
          borderWidth={1}
          borderStyle="dashed"
          borderColor="$edge"
          rounded={round.card}
          aria-label={`Add issue to ${column.name}`}
          onPress={() => onAdd(column.status)}
        >
          <Plus size={16} />
        </Button>
      ) : null}

      {column.issues.map((issue) => (
        <YStack key={issue.id} role="listitem" gap={gap.tight} onDragOver={hover(issue.id)} onDrop={land(issue.id)}>
          {drag && over === issue.id ? <Slot height={drag.cover ? 260 : 176} /> : null}
          <Card
            issue={issue}
            dragging={drag?.id === issue.id}
            onOpen={onOpen}
            onDragStart={() => onLift(issue)}
            onDragEnd={onLand}
          />
        </YStack>
      ))}

      {drag && over === 'end' ? <Slot height={drag.cover ? 260 : 176} /> : null}
      <YStack flex={1} minH={24} />
    </YStack>
  )
}

/** Where the card in flight would land. */
const Slot = ({ height }: { height: number }) => (
  <YStack height={height} rounded={round.card} borderWidth={1} borderStyle="dashed" borderColor="$edge" />
)
