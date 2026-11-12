/**
 * THE CHAT SCREEN — a room's header, its conversation, and a composer.
 *
 * The header is the reference board's own, one field at a time: the quiet line
 * the breadcrumb occupies carries the topic, the title row carries the name and
 * the member faces, and the whole thing sits on the board's inset. There is no
 * tab row, because a channel has one view and the board's tabs exist to choose
 * between three — a row of one tab is a row that says nothing.
 *
 * Everything below the header is the same for a channel and a direct message.
 * The difference between them is a glyph and a name, which is where it belongs.
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { EmptyState } from '@hanzo/ui/product'
import { Bell, Hash, Lock, MessagesSquare } from '@hanzogui/lucide-icons-2'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { invalidate, useRead } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { press, toggleAsideKind, useAside, useAsideKind, useNotices } from '~/shell'
import { paint, ring, round, rung } from '~/theme/theme'
import { Face } from './Face.tsx'
import { botIn, withId } from './bots.ts'
import { openDm } from './dm.ts'
import { react, reply, say, titled, unreact, type Message, type Person, type Room } from './chat.ts'
import { Composer } from './Composer.tsx'
import { Failed, List, Middle, Waiting } from './List.tsx'
import { People } from './People.tsx'
import { useLive, useMessages, usePeople, useReactions, useReplies, useRooms } from './read.ts'
import { Thread } from './Thread.tsx'
import { tally } from './Run.tsx'

const LEGACY_DM_ALIAS: Record<string, string> = {
  'dm-algo': 'dm-sci',
  'dm-cal': 'dm-mana',
  'dm-core': 'dm-opera',
  'dm-db': 'dm-data',
  'dm-sec': 'dm-cyber',
}

export function Chat() {
  const { id: rawId } = useParams()
  const id = rawId ? (LEGACY_DM_ALIAS[rawId] ?? rawId) : rawId
  const { plane, current } = useSpace()
  const rooms = useRooms()
  const roster = usePeople()

  // `/chat/with-<uuid>` is a conversation with somebody on the roster. For an
  // agent it is a real direct message with its member account — the only room
  // the server answers in — so it is opened (or found) through the server.
  const withWho = withId(id)
  const who = useMemo(() => (withWho ? (roster.data ?? []).find((p) => p.id === withWho) : undefined), [withWho, roster.data])
  const space = current?.uuid ?? ''
  const dm = useRead(
    `chat:dm:${space}:${who?.id ?? '-'}`,
    () => openDm(space, who!),
    { enabled: Boolean(plane && who && space) },
  )

  const found = useMemo(() => (rooms.data ?? []).find((r) => r.id === id) ?? null, [rooms.data, id])
  const room = withWho ? (dm.data ?? null) : found
  const agent = room ? botIn(room, roster.data ?? []) : undefined

  const conversation = useMessages(room?.id ?? null)
  const messages = conversation.data ?? []
  const ids = useMemo(() => messages.map((m) => m.id), [messages])
  const feelings = useReactions(ids)
  useLive(room?.id ?? null)

  const [thread, setThread] = useState<string | null>(null)
  const parent = messages.find((m) => m.id === thread) ?? null
  const answers = useReplies(parent?.id ?? null)

  const me = plane?.account ?? ''
  const people = roster.data ?? []
  const reactions = feelings.data ?? []

  /**
   * React, or take it back.
   *
   * The same press does both, because a reaction chip is a toggle and a
   * separate un-react control would be a second thing to find for an action
   * that has one obvious place.
   */
  const onReact = useCallback(
    (message: Message, emoji: string) => {
      if (!plane || !room) return
      const held = tally(reactions.filter((r) => r.message === message.id)).find((g) => g.emoji === emoji)
      const mine = reactions.find((r) => r.message === message.id && r.emoji === emoji && r.by === me)
      void (held && mine
        ? unreact(plane, room, mine)
        : react(plane, room, message, emoji)
      ).then(() => invalidate('chat:reactions:'))
    },
    [plane, room, reactions, me],
  )

  // The four answers before there is a room, and they are four because they
  // are four different facts. Rendering an empty panel for the middle two —
  // which is what one `!room` guard does — makes a screen that is still
  // reading and a screen that refused indistinguishable from a room with
  // nothing in it, and the reader is left to guess which.
  if (!id) return <Pick />
  if (withWho) {
    if (roster.phase === 'failure') return <Failed error={roster.error} onRetry={roster.reload} />
    if (roster.phase === 'loading' || !plane) return <Waiting />
    if (!who) return <Gone />
    if (dm.phase === 'failure') return <Failed error={dm.error} onRetry={dm.reload} />
    if (!room) return <Waiting />
  } else if (rooms.phase === 'failure') return <Failed error={rooms.error} onRetry={rooms.reload} />
  else if (rooms.phase === 'loading' || !plane) return <Waiting />
  if (!room) return <Gone />

  return (
    <XStack flex={1} minH={0}>
      <YStack flex={1} minW={0} minH={0}>
        <Header room={room} people={people} agent={agent} />

        <List
          room={room}
          phase={conversation.phase}
          error={conversation.error}
          messages={messages}
          people={people}
          reactions={reactions}
          me={me}
          onRetry={conversation.reload}
          onReact={onReact}
          onOpen={(m) => setThread(m.id)}
          open={thread ?? undefined}
        />

        <Composer
          placeholder={room.kind === 'direct' ? `Message ${titled(room, people)}` : `Message #${room.name}`}
          onSend={(text) => say(plane, room, text, people)}
        />
      </YStack>

      {parent ? (
        <Thread
          room={room}
          parent={parent}
          replies={answers.data ?? []}
          phase={answers.phase}
          error={answers.error}
          people={people}
          reactions={reactions}
          me={me}
          onClose={() => setThread(null)}
          onRetry={answers.reload}
          onReact={onReact}
          onSend={(text) => reply(plane, room, parent, text, people)}
        />
      ) : null}
    </XStack>
  )
}

/**
 * The room's own header.
 *
 * The topic sits where the board draws its breadcrumb — the quiet line above
 * the title — because it is the same kind of information: where you are, said
 * without weight. A room with no topic leaves the line out rather than filling
 * it with a placeholder.
 */
function Header({
  room,
  people,
  agent,
}: {
  room: Room
  people: ReturnType<typeof usePeople>['data']
  agent?: Person
}) {
  const unread = useNotices()
  const asideShowing = useAside()
  const asideKind = useAsideKind()
  return (
    <YStack borderBottomWidth={1} borderBottomColor="$edge" bg="$panel">
      <XStack px={20} py={10} items="center" justify="space-between" gap={12}>
        {agent ? (
          <XStack flex={1} minW={0} items="center" gap={12}>
            <Face person={agent} size={34} />
            <XStack items="center" gap={8} flexWrap="wrap">
              <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                {agent.name}
              </SizableText>
              <XStack px={7} py={2} rounded={round.field} bg="$raised" borderWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                  Agent
                </SizableText>
              </XStack>
            </XStack>
          </XStack>
        ) : (
          <XStack flex={1} minW={0} items="center" gap={10}>
            <XStack items="center" gap={6} shrink={0}>
              {room.kind === 'direct' ? null : room.private ? (
                <Lock size={16} color="$quiet" />
              ) : (
                <Hash size={17} color="$quiet" />
              )}
              <SizableText fontSize={rung.row} fontWeight="600" color="$ink" numberOfLines={1}>
                {titled(room, people ?? [])}
              </SizableText>
            </XStack>
            {room.topic ? (
              <>
                <YStack width={1} height={14} bg="$edge" shrink={0} />
                <SizableText fontSize={rung.small} color="$dim" numberOfLines={1} flex={1}>
                  {room.topic}
                </SizableText>
              </>
            ) : null}
          </XStack>
        )}

        <XStack items="center" gap={8} shrink={0}>
          {agent ? null : (
            <People members={room.members} people={people ?? []} />
          )}

          {/* Collapsible Inbox drawer trigger with unread count badge */}
          <XStack
            {...press(() => toggleAsideKind('inbox'), 'Toggle Inbox drawer')}
            aria-pressed={asideShowing && asideKind === 'inbox'}
            px={9}
            py={5}
            rounded={round.field}
            bg={asideShowing && asideKind === 'inbox' ? '$hover' : '$raised'}
            borderWidth={1}
            borderColor={asideShowing && asideKind === 'inbox' ? '$bound' : '$edge'}
            items="center"
            gap={6}
            hoverStyle={{ background: '$hover' }}
            focusVisibleStyle={ring}
          >
            <Bell size={13} color={asideShowing && asideKind === 'inbox' ? '$ink' : '$quiet'} />
            <SizableText
              fontSize={rung.chip}
              fontWeight="500"
              color={asideShowing && asideKind === 'inbox' ? '$ink' : '$quiet'}
            >
              Inbox
            </SizableText>
            {unread > 0 ? (
              <YStack
                minW={16}
                height={16}
                px={4}
                rounded={round.pill}
                items="center"
                justify="center"
                style={{ background: paint.alert }}
              >
                <SizableText
                  fontSize={10}
                  lineHeight={12}
                  fontWeight="700"
                  style={{ color: paint.panel }}
                >
                  {unread}
                </SizableText>
              </YStack>
            ) : null}
          </XStack>
        </XStack>
      </XStack>

    </YStack>
  )
}

/** No room in the address: the surface opened, and nothing is chosen. */
const Pick = () => (
  <Middle>
    <EmptyState
      icon={MessagesSquare}
      title="Chat"
      description="Choose a channel or a conversation to read it."
    />
  </Middle>
)

/** An address that named a room this space does not have. */
const Gone = () => (
  <Middle>
    <EmptyState
      icon={MessagesSquare}
      title="No such room"
      description="It may have been archived, or it may belong to another space."
    />
  </Middle>
)

