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
 *
 * Bots are teammates here. A direct message with one names it and links to it
 * on hanzo.bot, where its own thread, computer and schedule are; a private
 * channel can be given one, which then answers an @-mention there.
 */
import { Popover } from '@hanzo/gui'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { EmptyState } from '@hanzo/ui/product'
import { ArrowUpRight, Bell, Bot, Hash, Lock, MessagesSquare, Plus } from '@hanzogui/lucide-icons-2'
import { useCallback, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'

import { invalidate, useRead } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { press, toggleAsideKind, useAside, useAsideKind, useNotices } from '~/shell'
import { paint, ring, round, rung } from '~/theme/theme'
import { Face } from './Face.tsx'
import { addable, botIn, hanzoBot, withId } from './bots.ts'
import { openDm } from './dm.ts'
import { addToChannel } from './members.ts'
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
  if (!id) {
    if (rooms.phase === 'failure') return <Failed error={rooms.error} onRetry={rooms.reload} />
    if (rooms.phase === 'loading' || !plane) return <Waiting />
    const firstRoom = (rooms.data ?? []).find((r) => r.kind === 'channel') ?? (rooms.data ?? [])[0]
    if (firstRoom) return <Navigate to={`/chat/${firstRoom.id}`} replace />
    return <Pick />
  }
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
        <Header room={room} people={people} agent={agent} space={space} org={current?.org ?? null} />

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
          people={people}
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
  space,
  org,
}: {
  room: Room
  people: ReturnType<typeof usePeople>['data']
  agent?: Person
  /** The open space, which a channel's members are added in. */
  space: string
  /** The org hanzo.bot opens in. */
  org: string | null
}) {
  const unread = useNotices()
  const asideShowing = useAside()
  const asideKind = useAsideKind()
  return (
    <YStack borderBottomWidth={1} borderBottomColor="$edge" bg="$panel">
      <XStack px={16} py={8} items="center" justify="space-between" gap={10}>
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
          {agent ? <OnHanzoBot bot={agent} org={org} /> : (
            <People members={room.members} people={people ?? []} />
          )}
          {room.kind === 'channel' && room.private ? (
            <AddBot room={room} people={people ?? []} space={space} />
          ) : null}

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

/** The bot on hanzo.bot: its own thread, computer and schedule. */
const OnHanzoBot = ({ bot, org }: { bot: Person; org: string | null }) => (
  <XStack
    asChild
    px={9}
    py={5}
    rounded={round.field}
    bg="$raised"
    borderWidth={1}
    borderColor="$edge"
    items="center"
    gap={6}
    hoverStyle={{ background: '$hover' }}
    focusVisibleStyle={ring}
  >
    <a href={hanzoBot(bot.name, org)} target="_blank" rel="noopener" data-testid="bot-on-hanzo-bot">
      <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
        Open on hanzo.bot
      </SizableText>
      <ArrowUpRight size={13} color="$quiet" />
    </a>
  </XStack>
)

/**
 * Give a private channel a bot. Only a private channel needs it: in a public
 * one every bot of the org already answers an @-mention, and in a private one a
 * bot answers only once it is in it.
 */
const AddBot = ({ room, people, space }: { room: Room; people: Person[]; space: string }) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const choices = addable(room, people)

  const add = async (bot: Person) => {
    if (busy) return
    setBusy(bot.id)
    setFailed(null)
    try {
      await addToChannel(space, room, bot)
      invalidate('chat:rooms:')
      setOpen(false)
    } catch (e: unknown) {
      setFailed(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" allowFlip stayInFrame>
      <Popover.Trigger asChild>
        <XStack
          {...press(() => setOpen((v) => !v), 'Add a bot to this channel')}
          px={9}
          py={5}
          rounded={round.field}
          bg="$raised"
          borderWidth={1}
          borderColor="$edge"
          items="center"
          gap={6}
          hoverStyle={{ background: '$hover' }}
          focusVisibleStyle={ring}
          data-testid="add-bot-to-channel"
        >
          <Plus size={13} color="$quiet" />
          <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
            Add bot
          </SizableText>
        </XStack>
      </Popover.Trigger>

      <Popover.Content
        role="dialog"
        aria-label="Add a bot to this channel"
        borderWidth={1}
        borderColor="$edge"
        bg="$panel"
        p={6}
        width={260}
        rounded={12}
        elevation="$4"
        style={{ zIndex: 100000 }}
      >
        <YStack gap={2} width="100%">
          {choices.length === 0 ? (
            <SizableText px={8} py={6} fontSize={rung.small} color="$dim">
              Every bot is already in this channel.
            </SizableText>
          ) : (
            choices.map((bot) => (
              <XStack
                key={bot.id}
                {...press(() => void add(bot), `Add ${bot.name}`)}
                aria-disabled={busy !== null}
                px={8}
                py={6}
                gap={10}
                items="center"
                rounded={8}
                hoverStyle={{ background: '$hover' }}
                opacity={busy && busy !== bot.id ? 0.5 : 1}
              >
                <Face person={bot} size={22} />
                <SizableText fontSize={rung.body} fontWeight="500" color="$ink" numberOfLines={1} flex={1}>
                  {bot.name}
                </SizableText>
                {busy === bot.id ? (
                  <SizableText fontSize={rung.chip} color="$quiet">
                    Adding…
                  </SizableText>
                ) : (
                  <Bot size={14} color="$soft" />
                )}
              </XStack>
            ))
          )}
          {failed ? (
            <SizableText px={8} py={4} fontSize={rung.small} style={{ color: paint.alert }}>
              {failed}
            </SizableText>
          ) : null}
        </YStack>
      </Popover.Content>
    </Popover>
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

