/**
 * A THREAD — one message and everything hanging off it.
 *
 * It opens as a split of the board region rather than as the shell's aside,
 * because the aside is the Inbox and a panel that two things take turns owning
 * is a panel whose state nobody can reason about. A thread also belongs to the
 * room it is in: closing the room should close it, and it should not survive a
 * move to another surface, which a shell-level panel would.
 *
 * The parent message is drawn at the top in the same component the list uses,
 * so a thread cannot come to disagree with the conversation it came out of.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { X } from '@hanzogui/lucide-icons-2'

import { press } from '~/shell'

import type { Message, Person, Reaction, Room } from './chat.ts'
import { Composer } from './Composer.tsx'
import { List } from './List.tsx'
import { Run } from './Run.tsx'

export function Thread({
  room,
  parent,
  replies,
  phase,
  error,
  people,
  reactions,
  me,
  onClose,
  onRetry,
  onReact,
  onCreateTask,
  onSend,
}: {
  room: Room
  parent: Message
  replies: Message[]
  phase: 'loading' | 'ready' | 'failure'
  error?: Error
  people: Person[]
  reactions: Reaction[]
  me: string
  onClose: () => void
  onRetry: () => void
  onReact: (m: Message, emoji: string) => void
  onCreateTask?: (m: Message) => void
  onSend: (text: string) => Promise<void>
}) {
  return (
    <YStack width={360} shrink={0} minH={0} borderLeftWidth={1} borderLeftColor="$edge">
      <XStack height={56} items="center" px={20} gap={8}>
        <SizableText flex={1} fontSize="$4" fontWeight="500" color="$ink">
          Thread
        </SizableText>
        <YStack
          width={28}
          height={28}
          items="center"
          justify="center"
          rounded="$1"
          {...press(onClose, 'Close the thread')}
          hoverStyle={{ background: '$hover' }}
          focusVisibleStyle={{ outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' }}
        >
          <X size={16} color="$soft" />
        </YStack>
      </XStack>

      <YStack pb={8} borderBottomWidth={1} borderBottomColor="$edge">
        <Run
          author={parent.author}
          at={parent.at}
          messages={[parent]}
          people={people}
          reactions={reactions}
          me={me}
          onReact={onReact}
          onOpen={() => {}}
          onCreateTask={onCreateTask}
        />
      </YStack>

      <List
        room={room}
        phase={phase}
        error={error}
        messages={replies}
        people={people}
        reactions={reactions}
        me={me}
        onRetry={onRetry}
        onReact={onReact}
        onOpen={() => {}}
        onCreateTask={onCreateTask}
      />

      <Composer placeholder="Reply…" people={people} onSend={onSend} />
    </YStack>
  )
}
