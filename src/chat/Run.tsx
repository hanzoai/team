/**
 * ONE PERSON'S TURN — the unit the message list is drawn in.
 *
 * The anatomy is the reference's own notification row, which is the only dense
 * list of `avatar · rich text · meta` it measurably draws: the avatar in a fixed
 * left column, the text column starting at one gap past it, primary-weight names
 * against secondary prose, and the quiet meta line. A conversation is that row
 * with more than one line of text in it, so it is built out of the same numbers
 * rather than a second set.
 *
 * What is OURS, because the reference has no chat screen to measure: hover, the
 * focus ring, the reply affordance and the reaction row. They are drawn on the
 * channels the navigator already uses for the same jobs — a faint ground for
 * hover, the system outline for focus — so they read as this product even
 * though nothing was copied.
 */
import { Avatar, AvatarFallback, AvatarImage, SizableText, XStack, YStack } from '@hanzo/ui'
import { MessageSquare, SmilePlus } from '@hanzogui/lucide-icons-2'

import { paint } from '~/theme/theme.ts'
import { press } from '~/shell'

import type { Message, Person, Reaction } from './chat.ts'
import { clock } from './group.ts'
import { initials, nameOf } from './read.ts'
import { tokens } from './text.ts'

/** The avatar column, and where the text starts. Image 52 and +16 in the
 *  reference's own row; on the 1.5 scale that is 36 and 12. */
export const FACE = 36
export const TEXT = FACE + 12

export type RunProps = {
  author: string
  at: number
  messages: Message[]
  people: Person[]
  reactions: Reaction[]
  /** Who is reading, so their own reaction reads as pressed. */
  me: string
  onReact: (message: Message, emoji: string) => void
  onOpen: (message: Message) => void
  /** The message whose thread is open, so its row can say so. */
  open?: string
}

export function Run({ author, at, messages, people, reactions, me, onReact, onOpen, open }: RunProps) {
  const name = nameOf(people, author)
  const person = people.find((p) => p.name === name)

  return (
    <XStack px={24} pt={12} gap={12} items="flex-start">
      <Avatar circular size={FACE}>
        {person?.avatar ? <AvatarImage src={person.avatar} alt="" /> : null}
        <AvatarFallback bg="$raised">
          <SizableText fontSize="$2" color="$quiet">{initials(name)}</SizableText>
        </AvatarFallback>
      </Avatar>

      <YStack flex={1} minW={0} gap={2}>
        <XStack gap={8} items="baseline">
          <SizableText fontSize="$3" fontWeight="600" color="$ink">{name}</SizableText>
          <SizableText fontSize="$1" color="$dim">{clock(at)}</SizableText>
        </XStack>

        {messages.map((m) => (
          <Said
            key={m.id}
            message={m}
            reactions={reactions.filter((r) => r.message === m.id)}
            me={me}
            onReact={onReact}
            onOpen={onOpen}
            open={open === m.id}
          />
        ))}
      </YStack>
    </XStack>
  )
}

/**
 * One message inside a turn: its paragraphs, its reactions, and its thread.
 *
 * The controls live in the row rather than beside it and appear on hover, which
 * is ours — a channel that draws a react button and a reply button on every
 * message spends more ink on affordances than on what anybody said.
 */
function Said({
  message,
  reactions,
  me,
  onReact,
  onOpen,
  open,
}: {
  message: Message
  reactions: Reaction[]
  me: string
  onReact: (m: Message, emoji: string) => void
  onOpen: (m: Message) => void
  open: boolean
}) {
  const groups = tally(reactions)
  const own = Boolean(me) && message.author === me

  return (
    <YStack
      group
      position="relative"
      pr={72}
      py={2}
      rounded="$1"
      bg={open ? '$hover' : 'transparent'}
      hoverStyle={{ background: '$hover' }}
    >
      <YStack
        self={own ? 'flex-start' : undefined}
        px={own ? 12 : 0}
        py={own ? 6 : 0}
        rounded={own ? 12 : 0}
        style={own ? { backgroundColor: paint.chatUser } : undefined}
      >
        {message.lines.map((line, i) => (
          <SizableText
            key={i}
            fontSize="$3"
            lineHeight={22}
            color={own ? undefined : '$ink'}
            style={own ? { color: paint.chatUserInk } : undefined}
          >
            {tokens(line).map((t, j) =>
              t.kind === 'text' ? (
                <SizableText
                  key={j}
                  fontSize="$3"
                  lineHeight={22}
                  color={own ? undefined : '$ink'}
                  style={own ? { color: paint.chatUserInk } : undefined}
                >
                  {t.value}
                </SizableText>
              ) : (
                <SizableText
                  key={j}
                  fontSize="$3"
                  lineHeight={22}
                  style={{ color: t.kind === 'mention' ? paint.alert : paint.accent }}
                  fontWeight={t.kind === 'mention' ? '500' : '400'}
                  {...(t.kind === 'link'
                    ? { tag: 'a', href: t.value, target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {t.value}
                </SizableText>
              ),
            )}
          </SizableText>
        ))}
      </YStack>

      {groups.length > 0 ? (
        <XStack gap={4} pt={4} flexWrap="wrap">
          {groups.map((g) => (
            <Chip
              key={g.emoji}
              emoji={g.emoji}
              count={g.by.length}
              mine={g.by.includes(me)}
              onPress={() => onReact(message, g.emoji)}
            />
          ))}
        </XStack>
      ) : null}

      {message.replies > 0 ? (
        <XStack
          items="center"
          gap={5}
          pt={4}
          {...press(() => onOpen(message))}
        >
          <MessageSquare size={13} color={paint.accent} />
          <SizableText fontSize="$1" style={{ color: paint.accent }}>
            {message.replies === 1 ? '1 reply' : `${message.replies} replies`}
          </SizableText>
        </XStack>
      ) : null}

      {/* The two controls, in the gutter the padding above reserves so they
          never sit on top of a word. Hidden until the row is hovered or
          something inside it has focus — a keyboard reaches them the same way a
          pointer does. */}
      <XStack
        position="absolute"
        t={0}
        r={8}
        gap={2}
        opacity={0}
        $group-hover={{ opacity: 1 }}
        focusWithinStyle={{ opacity: 1 }}
      >
        <Control label="React" onPress={() => onReact(message, '👍')}>
          <SmilePlus size={15} color="$soft" />
        </Control>
        <Control label="Reply in thread" onPress={() => onOpen(message)}>
          <MessageSquare size={15} color="$soft" />
        </Control>
      </XStack>
    </YStack>
  )
}

const Control = ({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) => (
  <YStack
    width={26}
    height={26}
    items="center"
    justify="center"
    rounded="$1"
    bg="$panel"
    borderWidth={1}
    borderColor="$edge"
    {...press(onPress, label)}
    hoverStyle={{ background: '$hover' }}
    focusVisibleStyle={{ outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' }}
  >
    {children}
  </YStack>
)

/** One emoji and how many people chose it. Pressed when the reader is one. */
const Chip = ({
  emoji,
  count,
  mine,
  onPress,
}: {
  emoji: string
  count: number
  mine: boolean
  onPress: () => void
}) => (
  <XStack
    aria-pressed={mine}
    height={22}
    items="center"
    gap={4}
    px={7}
    rounded={11}
    borderWidth={1}
    borderColor={mine ? '$bound' : '$edge'}
    bg={mine ? '$hover' : '$raised'}
    {...press(onPress)}
    hoverStyle={{ borderColor: '$bound' }}
    focusVisibleStyle={{ outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' }}
  >
    <SizableText fontSize={12} lineHeight={14}>{emoji}</SizableText>
    <SizableText fontSize="$1" color={mine ? '$ink' : '$quiet'}>{count}</SizableText>
  </XStack>
)

/**
 * Reactions, one row per emoji.
 *
 * Insertion order rather than count, so a row does not reshuffle under the
 * pointer the moment somebody else reacts — a chip that moves as you reach for
 * it is a chip you press by accident.
 */
export const tally = (reactions: Reaction[]): { emoji: string; by: string[] }[] => {
  const out: { emoji: string; by: string[] }[] = []
  for (const r of reactions) {
    const found = out.find((g) => g.emoji === r.emoji)
    if (found) found.by.push(r.by)
    else out.push({ emoji: r.emoji, by: [r.by] })
  }
  return out
}
