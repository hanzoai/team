import type { DragEvent } from 'react'
import { Badge, Image, Separator, SizableText, XStack, YStack } from '@hanzo/ui'
import { MessageSquare, Paperclip } from '@hanzogui/lucide-icons-2'
import { Count } from './Count.tsx'
import { People } from './People.tsx'
import { Ring } from './Ring.tsx'
import type { Issue } from './model.ts'
import { gap, round, rung } from '../../theme/theme.ts'
import { tone } from './tone.ts'

/**
 * One issue.
 *
 * The densest thing on the screen and the first thing a viewer judges, so its
 * anatomy is fixed and every part is optional except the title: cover, title,
 * chips, progress, a rule, then a footer of people and counts. A card with one
 * chip and no counts is the same card with parts missing, never a second
 * layout.
 *
 * The rule is FULL BLEED — it crosses the padding and meets both edges. That is
 * why the padding is on two inner stacks rather than on the card: a rule inside
 * a padded box cannot reach the edge, and reaching it with a negative margin
 * leaves the wrong box in the flow for everything below.
 */
const PAD = 12 // gap.inset, as a number: padding takes a value, not a token here
const FOOT = 48

export const Card = ({ issue, dragging, onOpen, ...drag }: {
  issue: Issue
  dragging?: boolean
  onOpen?: (issue: Issue) => void
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: (e: DragEvent) => void
}) => {
  const chips = issue.priority ? [cap(issue.priority), ...issue.labels] : issue.labels

  return (
    <YStack
      data-slot="issue"
      data-issue={issue.id}
      bg="$raised"
      rounded={round.card}
      overflow="hidden"
      opacity={dragging ? 0.4 : 1}
      cursor={onOpen ? 'pointer' : 'grab'}
      hoverStyle={{ background: '$hover' }}
      role="article"
      tabIndex={0}
      aria-label={`${issue.key} ${issue.title}`}
      onPress={() => onOpen?.(issue)}
      {...lift(drag)}
    >
      <YStack p={PAD} gap={gap.tight}>
        {issue.cover ? (
          <Image src={issue.cover} alt="" width="100%" aspectRatio={1.44} rounded="$1" mb={4} />
        ) : null}

        <XStack items="center" justify="space-between" gap={6}>
          <SizableText fontSize={rung.small} fontWeight="600" color="$dim">
            {issue.key}
          </SizableText>
        </XStack>

        <SizableText fontSize={rung.body} lineHeight={20} color="$ink" style={CLAMP}>
          {issue.title}
        </SizableText>

        {chips.length > 0 ? (
          <XStack gap={gap.tight} flexWrap="wrap">
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
          </XStack>
        ) : null}

        {issue.done !== undefined || issue.origin ? (
          <XStack items="center" gap="$4" mt="$2">
            {issue.done !== undefined ? (
              <XStack items="center" gap={4}>
                <Ring done={issue.done} />
                <SizableText fontSize={rung.body} color="$soft">
                  {Math.round(issue.done * 100)}%
                </SizableText>
              </XStack>
            ) : null}
            {issue.origin ? <Origin name={issue.origin.name} mark={issue.origin.mark} /> : null}
          </XStack>
        ) : null}
      </YStack>

      <Separator />

      <XStack height={FOOT} px={PAD} items="center" justify="space-between">
        <People people={issue.people} />
        <XStack items="center" gap="$3">
          <Count glyph={<Paperclip size={12} color="$dim" />} n={issue.files} label="attachments" />
          <Count glyph={<MessageSquare size={12} color="$dim" />} n={issue.replies} label="replies" />
        </XStack>
      </XStack>
    </YStack>
  )
}

/**
 * Badge is a 24px control, which is the right height for a control you press.
 * A tag on a card is read, not pressed, and the reference draws it at three
 * quarters of that. Only the box changes: the label is already Badge's own
 * smallest rung and moving type to fix a box would resize it everywhere.
 */
const CHIP = { minHeight: 18, height: 18, paddingHorizontal: 8, borderRadius: 9999 } as const

/** Sentence case, for the one chip whose text is an enum rather than a name. */
const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1)

/**
 * The drag handlers are DOM props, which gui forwards on web and drops on
 * native. They are gathered into one object because a spread of a value carries
 * no excess-property check, which is how a host prop reaches the element
 * without a cast.
 */
const lift = (on: { onDragStart?: (e: DragEvent) => void; onDragEnd?: (e: DragEvent) => void }) => ({
  draggable: true,
  ...on,
})

/** Where the issue came from. A mark when there is one, its initial otherwise. */
const Origin = ({ name, mark }: { name: string; mark?: string }) => (
  <XStack items="center" gap={6}>
    {mark ? (
      <Image src={mark} alt="" width={20} height={20} rounded={9999} />
    ) : (
      <XStack width={20} height={20} rounded={9999} bg="$edge" items="center" justify="center">
        <SizableText fontSize="$1" color="$quiet">
          {name[0]?.toUpperCase()}
        </SizableText>
      </XStack>
    )}
    <SizableText fontSize="$2" color="$quiet">
      {name}
    </SizableText>
  </XStack>
)

/**
 * Three lines, then an ellipsis. The reference never wraps a title past two and
 * so says nothing about the fourth; a card that grows without limit is ours to
 * rule out, and three keeps a long title readable while holding the column.
 */
const CLAMP = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
} as const
