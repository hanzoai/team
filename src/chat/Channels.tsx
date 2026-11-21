/**
 * THE CHAT NAVIGATOR — Unified Hanzo Team left sidebar:
 *  - Search/filter input (`Jump to channel or person... ⌘K`)
 *  - First-class `Channels` list (unread count badges, active channel pill, `+ New Channel`)
 *  - `Hanzo Connect` shared channels, server-backed `Bots`, and `Direct` messages
 */
import { Input, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { ArrowUpRight, Hash, Lock, Megaphone, Plus, Share2 } from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { openConnectModal } from '~/shell/ConnectOrgModal.tsx'
import { ICON, PAD, ROW } from '~/shell/measure.ts'
import {
  filterChannelItems,
  Find,
  Group,
  Nav as Column,
  press,
  Roll,
  Row,
  Rule,
  surfaceAt,
} from '~/shell'
import { paint, round, rung } from '~/theme/theme'
import { botDm, botsOf, hanzoBot, withPath } from './bots.ts'
import { createChannel, titled, type Person, type Room } from './chat.ts'
import { Face } from './Face.tsx'
import { usePeople, useRooms } from './read.ts'

const ROW_AXIS = { flexDirection: 'row' } as const

export function Channels() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { plane, current } = useSpace()
  const org = current?.org ?? null

  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [connectOpen, setConnectOpen] = useState(true)
  const [botsOpen, setBotsOpen] = useState(true)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')

  useEffect(() => {
    const onNew = () => setCreatingChannel(true)
    window.addEventListener('hanzo:team-new-channel', onNew)
    return () => window.removeEventListener('hanzo:team-new-channel', onNew)
  }, [])

  const load = useRooms()
  const roster = usePeople().data ?? []
  const all = load.data ?? []
  const q = query.trim().toLowerCase()
  const shown = filterChannelItems(all, query)
  const channels = shown.filter((r) => r.kind === 'channel')
  const internalChannels = channels.filter((r) => !r.connectedOrgs || r.connectedOrgs.length === 0)
  const connectChannels = channels.filter((r) => r.connectedOrgs && r.connectedOrgs.length > 0)
  // A direct message with a bot is reached through the bot's own row, so it is
  // not listed a second time among the people.
  const bots = botsOf(roster)
  const directs = shown.filter((r) => r.kind === 'direct' && !botDm(r, bots))
  const shownBots = bots.filter((p) => !q || p.name.toLowerCase().includes(q))
  const dmOf = (bot: Person) => all.find((r) => botDm(r, [bot]))?.id

  const submitNewChannel = async () => {
    const clean = newChannelName.trim().replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
    if (!clean) return
    setNewChannelName('')
    setCreatingChannel(false)
    if (plane) {
      const roomId = await createChannel(plane, clean)
      invalidate('chat:rooms:')
      navigate(`/chat/${roomId}`)
    }
  }

  return (
    <Column title={surfaceAt(pathname)?.label ?? 'Team'}>
      <Find
        value={query}
        onChange={setQuery}
        placeholder="Search…"
      />
      <YStack height={8} />
      <Rule />

      <Roll>
        {load.phase === 'loading' ? (
          <YStack px={PAD} py={12}>
            <Spinner size={16} />
          </YStack>
        ) : null}

        {load.phase === 'failure' ? <Note>Your rooms could not be read.</Note> : null}

        {load.phase === 'ready' && all.length === 0 && shownBots.length === 0 ? (
          <Note>No rooms yet.</Note>
        ) : null}

        {load.phase === 'ready' &&
        all.length > 0 &&
        shown.length === 0 &&
        shownBots.length === 0 ? (
          <Note>{`Nothing matches “${query.trim()}”.`}</Note>
        ) : null}

        {/* First-class Channels Section */}
        <Group
          count={internalChannels.length}
          open={channelsOpen}
          onToggle={() => setChannelsOpen((v) => !v)}
          action={
            <XStack
              {...press(() => setCreatingChannel((v) => !v), 'Create new channel')}
              px={6}
              py={2}
              rounded={round.field}
              hoverStyle={{ bg: '$hover' }}
              items="center"
              gap={3}
              data-testid="sidebar-new-channel-btn"
            >
              <Plus size={12} color="$quiet" />
              <SizableText fontSize={rung.chip} fontWeight="500" color="$quiet">
                New Channel
              </SizableText>
            </XStack>
          }
        >
          Channels
        </Group>

        {creatingChannel ? (
          <XStack
            mx={PAD}
            my={4}
            px={8}
            py={5}
            gap={6}
            items="center"
            rounded={round.field}
            borderWidth={1}
            borderColor="$edge"
            bg="$panel"
            data-testid="sidebar-new-channel-form"
          >
            <Hash size={14} color="$soft" />
            <Input
              flex={1}
              unstyled
              height={24}
              borderWidth={0}
              bg="transparent"
              fontSize={rung.small}
              color="$ink"
              placeholderTextColor="$faint"
              placeholder="channel-name"
              value={newChannelName}
              onChangeText={setNewChannelName}
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e.key === 'Enter') {
                  e.preventDefault?.()
                  void submitNewChannel()
                } else if (e.key === 'Escape') {
                  setCreatingChannel(false)
                }
              }}
            />
            <XStack
              {...press(() => void submitNewChannel(), 'Create channel')}
              px={8}
              py={3}
              rounded={round.field}
              bg="$ink"
            >
              <SizableText fontSize={rung.chip} fontWeight="600" color="$background">
                Add
              </SizableText>
            </XStack>
          </XStack>
        ) : null}

        {channelsOpen
          ? internalChannels.map((r) => (
              <ChannelPill
                key={r.id}
                room={r}
                roster={roster}
                unreadCount={0}
              />
            ))
          : null}

        {load.phase === 'ready' && (!q || connectChannels.length > 0) ? (
          <>
            <Rule />
            <Group
              count={connectChannels.length}
              open={connectOpen}
              onToggle={() => setConnectOpen((v) => !v)}
            >
              Hanzo Connect
            </Group>
            {connectOpen ? (
              <>
                {connectChannels.map((r) => (
                  <ChannelPill key={r.id} room={r} roster={roster} unreadCount={0} />
                ))}
                <XStack
                  {...press(() => openConnectModal('connect'), 'Connect external organization channel')}
                  px={PAD}
                  py={6}
                  mx={6}
                  gap={8}
                  items="center"
                  rounded={round.field}
                  hoverStyle={{ background: '$hover' }}
                  data-testid="hanzo-connect-add-trigger"
                >
                  <Plus size={14} color="$soft" />
                  <SizableText fontSize={rung.body} color="$quiet" fontWeight="500">
                    Connect organization…
                  </SizableText>
                </XStack>
              </>
            ) : null}
          </>
        ) : null}

        {load.phase === 'ready' && (!q || shownBots.length > 0) ? (
          <>
            <Rule />
            <Group count={shownBots.length} open={botsOpen} onToggle={() => setBotsOpen((v) => !v)}>
              Bots
            </Group>
            {botsOpen ? (
              <>
                {shownBots.map((bot) => {
                  const to = withPath(bot)
                  const dm = dmOf(bot)
                  return (
                    <Row
                      key={bot.id}
                      to={to}
                      icon={<Face person={bot} size={18} />}
                      current={(path) => path === to || (dm !== undefined && path === `/chat/${dm}`)}
                    >
                      {bot.name}
                    </Row>
                  )
                })}
                <XStack
                  asChild
                  px={PAD}
                  py={6}
                  mx={4}
                  gap={8}
                  items="center"
                  rounded={round.field}
                  hoverStyle={{ background: '$hover' }}
                >
                  <a href={hanzoBot(null, org)} target="_blank" rel="noopener" data-testid="make-bot-on-hanzo-bot">
                    <Plus size={14} color="$soft" />
                    <SizableText fontSize={rung.body} color="$quiet" fontWeight="500" flex={1}>
                      Make a bot on hanzo.bot
                    </SizableText>
                    <ArrowUpRight size={13} color="$soft" />
                  </a>
                </XStack>
              </>
            ) : null}
          </>
        ) : null}

        {directs.length > 0 ? (
          <>
            <Rule />
            <Group count={directs.length}>Direct</Group>
            {directs.map((r) => (
              <ChannelPill key={r.id} room={r} roster={roster} unreadCount={0} />
            ))}
          </>
        ) : null}
      </Roll>
    </Column>
  )
}

const ChannelPill = ({
  room,
  roster,
  unreadCount,
  onClearUnread,
}: {
  room: Room
  roster: readonly Person[]
  unreadCount: number
  onClearUnread?: () => void
}) => {
  const { pathname } = useLocation()
  const to = `/chat/${room.id}`
  const here = pathname === to || pathname.startsWith(`${to}/`)
  const label =
    room.connectedOrgs && room.connectedOrgs.length > 0
      ? `${room.name} · ${room.connectedOrgs.join(', ')}`
      : titled(room, roster)

  return (
    <XStack
      asChild
      style={
        here
          ? { ...ROW_AXIS, backgroundColor: paint.rowActive, borderColor: paint.paneEdge }
          : { ...ROW_AXIS, borderColor: 'transparent' }
      }
      height={ROW - 2}
      items="center"
      justify="space-between"
      gap={8}
      px={PAD - 2}
      mx={6}
      rounded={round.field}
      borderWidth={1}
      hoverStyle={here ? undefined : { bg: '$hover' }}
      onClick={onClearUnread}
      data-testid={`sidebar-channel-${room.name}`}
    >
      <Link to={to} aria-current={here ? 'page' : undefined}>
        <XStack items="center" gap={8} minW={0} flex={1}>
          <YStack width={ICON} height={ICON} items="center" justify="center" shrink={0}>
            <Glyph room={room} />
          </YStack>
          <SizableText
            fontSize={rung.body}
            fontWeight={here || unreadCount > 0 ? '600' : '400'}
            color={here || unreadCount > 0 ? '$ink' : '$quiet'}
            numberOfLines={1}
          >
            {label}
          </SizableText>
        </XStack>
        {unreadCount > 0 ? (
          <XStack
            px={6}
            py={1}
            rounded={round.pill}
            bg="$ink"
            items="center"
            justify="center"
            shrink={0}
            data-testid={`channel-unread-${room.name}`}
          >
            <SizableText fontSize={rung.chip} fontWeight="700" color="$background">
              {unreadCount}
            </SizableText>
          </XStack>
        ) : null}
      </Link>
    </XStack>
  )
}

const Glyph = ({ room }: { room: Room }) =>
  room.kind === 'direct' ? null : room.connectedOrgs && room.connectedOrgs.length > 0 ? (
    <Share2 size={14} color="$soft" />
  ) : /^(announcements?|releases?|news)$/i.test(room.name) ? (
    <Megaphone size={14} color="$soft" />
  ) : room.private ? (
    <Lock size={14} color="$soft" />
  ) : (
    <Hash size={15} color="$soft" />
  )

const Note = ({ children }: { children: string }) => (
  <SizableText px={PAD} py={12} fontSize={rung.small} color="$dim">
    {children}
  </SizableText>
)
