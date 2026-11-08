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
import { Bell, Code, Hash, Lock, MessagesSquare, Monitor } from '@hanzogui/lucide-icons-2'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import { HANZO_AGENTS, humanSchedule, type AgentPreset } from '~/data/agents.ts'
import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { press, toggleAsideKind, useAside, useAsideKind, useNotices } from '~/shell'
import { paint, ring, round, rung } from '~/theme/theme'
import { react, reply, say, unreact, type Message, type Room } from './chat.ts'
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
  const { plane } = useSpace()
  const rooms = useRooms()
  const room = useMemo(() => (rooms.data ?? []).find((r) => r.id === id) ?? null, [rooms.data, id])

  const conversation = useMessages(room?.id ?? null)
  const roster = usePeople()
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
  if (rooms.phase === 'failure') return <Failed error={rooms.error} onRetry={rooms.reload} />
  if (rooms.phase === 'loading' || !plane) return <Waiting />
  if (!room) return <Gone />

  return (
    <XStack flex={1} minH={0}>
      <YStack flex={1} minW={0} minH={0}>
        <Header room={room} people={people} />

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
          placeholder={room.kind === 'direct' ? `Message ${room.name}` : `Message #${room.name}`}
          onSend={(text) => say(plane, room, text)}
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
          onSend={(text) => reply(plane, room, parent, text)}
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
function Header({ room, people }: { room: Room; people: ReturnType<typeof usePeople>['data'] }) {
  const [techOpen, setTechOpen] = useState(false)
  const unread = useNotices()
  const asideShowing = useAside()
  const asideKind = useAsideKind()
  const agent: AgentPreset | undefined = room.id.startsWith('dm-')
    ? HANZO_AGENTS.find((a) => `dm-${a.id}` === room.id)
    : undefined

  return (
    <YStack borderBottomWidth={1} borderBottomColor="$edge" bg="$panel">
      <XStack px={20} py={10} items="center" justify="space-between" gap={12}>
        {agent ? (
          <XStack flex={1} minW={0} items="center" gap={12}>
            <YStack position="relative" shrink={0}>
              <YStack
                width={34}
                height={34}
                rounded={round.pill}
                overflow="hidden"
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
                items="center"
                justify="center"
              >
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  width={34}
                  height={34}
                  style={{ width: 34, height: 34, objectFit: 'cover', display: 'block' }}
                />
              </YStack>
              <YStack
                position="absolute"
                b={-1}
                r={-1}
                width={9}
                height={9}
                rounded={round.pill}
                bg="$ink"
                borderWidth={1.5}
                borderColor="$panel"
              />
            </YStack>

            <YStack flex={1} minW={0} gap={2}>
              <XStack items="center" gap={8} flexWrap="wrap">
                <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
                  {agent.name}
                </SizableText>
                <XStack
                  px={7}
                  py={2}
                  rounded={round.field}
                  bg="$raised"
                  borderWidth={1}
                  borderColor="$edge"
                >
                  <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                    {agent.role}
                  </SizableText>
                </XStack>
                <XStack
                  px={7}
                  py={2}
                  rounded={round.pill}
                  bg="$hover"
                  items="center"
                  gap={5}
                >
                  <YStack width={5} height={5} rounded={round.pill} bg="$ink" />
                  <SizableText fontSize={rung.chip} fontWeight="500" color="$ink">
                    {`Available 24/7 · ${humanSchedule(agent.schedule)}`}
                  </SizableText>
                </XStack>
              </XStack>

              <SizableText fontSize={rung.small} color="$dim" numberOfLines={1}>
                {agent.status}
              </SizableText>
            </YStack>
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
                {room.name}
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
          {agent ? (
            <>
              <XStack
                {...press(() => setTechOpen((v) => !v), 'Toggle technical details')}
                aria-expanded={techOpen}
                px={9}
                py={5}
                rounded={round.field}
                bg={techOpen ? '$hover' : '$raised'}
                borderWidth={1}
                borderColor={techOpen ? '$bound' : '$edge'}
                items="center"
                gap={5}
                hoverStyle={{ background: '$hover' }}
                focusVisibleStyle={ring}
              >
                <Code size={13} color="$quiet" />
                <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                  Technical details
                </SizableText>
              </XStack>

              <XStack
                {...press(() => toggleAsideKind('inspector'), 'Toggle agent sandbox & inspector')}
                aria-pressed={asideShowing && asideKind === 'inspector'}
                px={9}
                py={5}
                rounded={round.field}
                bg={asideShowing && asideKind === 'inspector' ? '$hover' : '$raised'}
                borderWidth={1}
                borderColor={asideShowing && asideKind === 'inspector' ? '$bound' : '$edge'}
                items="center"
                gap={5}
                hoverStyle={{ background: '$hover' }}
                focusVisibleStyle={ring}
              >
                <Monitor size={13} color="$quiet" />
                <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                  Computer
                </SizableText>
              </XStack>
            </>
          ) : (
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

      {/* Collapsible Technical Details View — keeps raw cron & triggers out of the primary header */}
      {agent && techOpen ? (
        <XStack
          px={20}
          py={8}
          bg="$background"
          borderTopWidth={1}
          borderColor="$edge"
          items="center"
          justify="space-between"
          flexWrap="wrap"
          gap={12}
        >
          <XStack items="center" gap={16} flexWrap="wrap">
            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Cron Schedule:
              </SizableText>
              <XStack px={6} py={1} rounded={round.field} bg="$panel" borderWidth={1} borderColor="$edge">
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  {agent.schedule}
                </SizableText>
              </XStack>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Triggers:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {agent.triggers.join(', ')}
              </SizableText>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Department:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {agent.department}
              </SizableText>
            </XStack>

            <XStack items="center" gap={6}>
              <SizableText fontSize={rung.chip} color="$dim">
                Agent ID:
              </SizableText>
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                {`bot-${agent.id}`}
              </SizableText>
            </XStack>
          </XStack>
        </XStack>
      ) : null}
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

