/**
 * THE MESSAGE LIST, and its five states.
 *
 * Each state is a separate answer, not a fallback: a room with nothing in it,
 * a room still being read and a room that could not be read all render an empty
 * column if the phase is thrown away, and the three are then indistinguishable
 * to a reader and to anything scoring the screen. The read carries the phase
 * and this is where it is spent.
 *
 * The list is anchored to its END, because a conversation is read from the
 * bottom. That is one `justify` on the scroller's content rather than a
 * scroll-to-bottom effect: an effect fights the reader who has scrolled up, and
 * it runs one frame late, so the first paint of every room is its middle.
 */
import { SizableText, Spinner, YStack } from '@hanzo/ui'
import { BackendStateCard, classifyBackend } from '@hanzo/ui/product'
import { useEffect, useRef } from 'react'

import { paint } from '~/theme/theme.ts'
import type { Message, Person, Reaction, Room } from './chat.ts'
import { dayName, entries } from './group.ts'
import { Run } from './Run.tsx'

export type ListProps = {
  room: Room
  phase: 'loading' | 'ready' | 'failure'
  error?: Error
  messages: Message[]
  people: Person[]
  reactions: Reaction[]
  me: string
  onRetry: () => void
  onReact: (m: Message, emoji: string) => void
  onOpen: (m: Message) => void
  open?: string
}

export function List({
  room,
  phase,
  error,
  messages,
  people,
  reactions,
  me,
  onRetry,
  onReact,
  onOpen,
  open,
}: ListProps) {
  if (phase === 'loading') return <Waiting />
  if (phase === 'failure') return <Failed error={error} onRetry={onRetry} />
  if (messages.length === 0) return <Nothing room={room} />

  return <Said {...{ messages, people, reactions, me, onReact, onOpen, open }} />
}

/**
 * The conversation.
 *
 * Flows naturally from the top so short conversations do not leave a large
 * empty void above the messages.
 */
function Said({
  messages,
  people,
  reactions,
  me,
  onReact,
  onOpen,
  open,
}: Omit<ListProps, 'room' | 'phase' | 'error' | 'onRetry'>) {
  const end = useRef<HTMLElement | null>(null)

  // Follow the end when something new arrives. Keyed on the LAST id rather than
  // the length, so an edit does not scroll and a message removed does not
  // either — only something actually said.
  const last = messages[messages.length - 1]?.id
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [last])

  return (
    <YStack flex={1} minH={0} style={{ overflowY: 'auto' }}>
      <YStack pt={4} pb={12}>
        {entries(messages).map((e) =>
          e.kind === 'day' ? (
            <Day key={e.id} at={e.at} />
          ) : (
            <Run
              key={e.id}
              author={e.author}
              at={e.at}
              messages={e.messages}
              people={people}
              reactions={reactions}
              me={me}
              onReact={onReact}
              onOpen={onOpen}
              open={open}
            />
          ),
        )}
        <div ref={(n) => void (end.current = n)} />
      </YStack>
    </YStack>
  )
}

/** A date, on a hairline that runs the width of the conversation. */
const Day = ({ at }: { at: number }) => (
  <YStack px={16} pt={14} pb={4}>
    <YStack height={1} bg="$edge" position="relative" justify="center">
      <SizableText
        position="absolute"
        self="center"
        px={10}
        style={{ backgroundColor: paint.panel }}
        fontSize="$1"
        color="$dim"
      >
        {dayName(at)}
      </SizableText>
    </YStack>
  </YStack>
)

export const Middle = ({ children }: { children: React.ReactNode }) => (
  <YStack flex={1} minH={0} items="center" justify="center" p={24}>
    {children}
  </YStack>
)

/** Being read. Says so rather than showing an empty room that is not empty. */
export const Waiting = () => (
  <Middle>
    <Spinner size={16} />
  </Middle>
)

/** A read that refused, said in the estate's own words for a refusal. */
export const Failed = ({ error, onRetry }: { error?: Error; onRetry: () => void }) => (
  <Middle>
    <BackendStateCard state={classifyBackend(error)} onRetry={onRetry} />
  </Middle>
)

/**
 * Genuinely nothing said yet.
 *
 * It names the room, because "no messages" is true of every empty room and
 * tells a reader nothing about whether they are in the one they meant to open.
 */
const Nothing = ({ room }: { room: Room }) => (
  <Middle>
    <YStack gap={6} maxW={340} items="center">
      <SizableText fontSize="$4" fontWeight="500" color="$ink">
        {room.kind === 'direct' ? room.name : `#${room.name}`}
      </SizableText>
      <SizableText fontSize="$2" color="$dim" text="center">
        {room.topic
          ? room.topic
          : room.kind === 'direct'
            ? 'The beginning of your conversation.'
            : 'This is the beginning of the channel. Say something.'}
      </SizableText>
    </YStack>
  </Middle>
)
