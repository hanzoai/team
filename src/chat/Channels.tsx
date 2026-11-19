/**
 * THE CHAT NAVIGATOR — Unified Hanzo Team left sidebar:
 *  - Search/filter input (`Jump to channel or person... ⌘K`)
 *  - First-class `Channels` list (`#general`, `#engineering`, `#deployments`,
 *    `#approvals`, `#incidents`, unread count badges, active channel pill, `+ New Channel`)
 *  - `Direct & Bot Handoffs` list (`@hanzo-dev`, `@release-bot`, team members with presence dots)
 *  - `Hanzo Connect` shared channels, `Bots · 24/7`, and `Team Leads`
 */
import { Input, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { Hash, Lock, Plus, Share2 } from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { BOT_AGENTS, HANZO_AGENTS, LEAD_AGENTS, type AgentPreset } from '~/data/agents.ts'
import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { openConnectModal } from '~/shell/ConnectOrgModal.tsx'
import { ICON, PAD, ROW } from '~/shell/measure.ts'
import {
  DEFAULT_CHANNEL_UNREADS,
  DIRECT_HANDOFF_ROSTER,
  filterChannelItems,
  filterDirectHandoffs,
  Find,
  Group,
  Nav as Column,
  press,
  Roll,
  Rule,
  surfaceAt,
} from '~/shell'
import { paint, round, rung, state } from '~/theme/theme'
import { createChannel, type Room } from './chat.ts'
import { useRooms } from './read.ts'

const ROW_AXIS = { flexDirection: 'row' } as const

export function Channels() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { plane } = useSpace()

  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [handoffsOpen, setHandoffsOpen] = useState(true)
  const [connectOpen, setConnectOpen] = useState(true)
  const [botsOpen, setBotsOpen] = useState(true)
  const [leadsOpen, setLeadsOpen] = useState(true)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [unreads, setUnreads] = useState<Record<string, number>>(() => ({
    ...DEFAULT_CHANNEL_UNREADS,
  }))

  useEffect(() => {
    const onNew = () => setCreatingChannel(true)
    window.addEventListener('hanzo:team-new-channel', onNew)
    return () => window.removeEventListener('hanzo:team-new-channel', onNew)
  }, [])

  // Clear unread badge when viewing a channel
  useEffect(() => {
    const match = /^\/chat\/([^/]+)/.exec(pathname)
    const activeId = match?.[1]
    if (activeId && unreads[activeId]) {
      setUnreads((prev) => ({ ...prev, [activeId]: 0 }))
    }
  }, [pathname, unreads])

  const load = useRooms()
  const all = load.data ?? []
  const q = query.trim().toLowerCase()
  const shown = filterChannelItems(all, query)
  const channels = shown.filter((r) => r.kind === 'channel')
  const internalChannels = channels.filter((r) => !r.connectedOrgs || r.connectedOrgs.length === 0)
  const connectChannels = channels.filter((r) => r.connectedOrgs && r.connectedOrgs.length > 0)
  const shownHandoffs = filterDirectHandoffs(DIRECT_HANDOFF_ROSTER, query)
  const directs = shown.filter(
    (r) =>
      r.kind === 'direct' &&
      !r.id.startsWith('dm-') &&
      !DIRECT_HANDOFF_ROSTER.some((h) => h.id === r.id),
  )
  const shownLeads = q
    ? LEAD_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department}`.toLowerCase().includes(q))
    : LEAD_AGENTS
  const shownBots = q
    ? BOT_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department} ${a.status}`.toLowerCase().includes(q))
    : BOT_AGENTS

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
        placeholder="Jump to channel or person... ⌘K"
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

        {load.phase === 'ready' && all.length === 0 && shownLeads.length === 0 ? (
          <Note>No rooms yet.</Note>
        ) : null}

        {load.phase === 'ready' &&
        all.length > 0 &&
        shown.length === 0 &&
        shownHandoffs.length === 0 &&
        shownLeads.length === 0 &&
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
                unreadCount={unreads[r.id] ?? 0}
                onClearUnread={() => setUnreads((prev) => ({ ...prev, [r.id]: 0 }))}
              />
            ))
          : null}

        {/* First-class Direct & Bot Handoffs Section */}
        {shownHandoffs.length > 0 ? (
          <>
            <Rule />
            <Group
              count={shownHandoffs.length}
              open={handoffsOpen}
              onToggle={() => setHandoffsOpen((v) => !v)}
            >
              Direct &amp; Bot Handoffs
            </Group>
            {handoffsOpen
              ? shownHandoffs.map((dm) => {
                  const to = `/chat/${dm.id}`
                  const here = pathname === to
                  const dotBg =
                    dm.presence === 'online'
                      ? state.done
                      : dm.presence === 'busy'
                        ? state.backlog
                        : paint.dim
                  return (
                    <XStack
                      key={dm.id}
                      {...press(() => navigate(to), `${dm.handle} · ${dm.role}`)}
                      height={ROW - 2}
                      px={PAD - 2}
                      mx={6}
                      gap={8}
                      items="center"
                      justify="space-between"
                      rounded={round.field}
                      borderWidth={1}
                      borderColor={here ? '$edge' : 'transparent'}
                      bg={here ? '$hover' : 'transparent'}
                      hoverStyle={{ bg: '$hover' }}
                      data-testid={`sidebar-handoff-${dm.id}`}
                    >
                      <XStack items="center" gap={8} minW={0} flex={1}>
                        <YStack
                          width={7}
                          height={7}
                          rounded={round.pill}
                          shrink={0}
                          style={{ backgroundColor: dotBg }}
                        />
                        <SizableText
                          fontSize={rung.body}
                          fontWeight={here ? '600' : '400'}
                          color={here ? '$ink' : '$quiet'}
                          numberOfLines={1}
                        >
                          {dm.handle}
                        </SizableText>
                      </XStack>
                      <SizableText fontSize={rung.chip} color="$faint" shrink={0}>
                        {dm.role}
                      </SizableText>
                    </XStack>
                  )
                })
              : null}
          </>
        ) : null}

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
                  <ChannelPill key={r.id} room={r} unreadCount={0} />
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

        {shownBots.length > 0 ? (
          <>
            <Rule />
            <Group
              count={shownBots.length}
              open={botsOpen}
              onToggle={() => setBotsOpen((v) => !v)}
            >
              Bots · 24/7
            </Group>
            {botsOpen
              ? shownBots.map((agent) => {
                  const to = `/chat/dm-${agent.id}`
                  const here = pathname === to
                  return (
                    <XStack
                      key={agent.id}
                      {...press(() => navigate(to), `${agent.name} — ${agent.role}`)}
                      px={PAD - 2}
                      py={6}
                      mx={6}
                      gap={10}
                      items="center"
                      rounded={round.field}
                      bg={here ? '$hover' : 'transparent'}
                      hoverStyle={{ background: '$hover' }}
                    >
                      <YStack position="relative" shrink={0}>
                        <AgentFace agent={agent} size={28} />
                        <YStack
                          position="absolute"
                          b={-1}
                          r={-1}
                          width={8}
                          height={8}
                          rounded={round.pill}
                          style={{ backgroundColor: state.done }}
                          borderWidth={1.5}
                          borderColor="$background"
                        />
                      </YStack>
                      <YStack flex={1} minW={0} gap={1}>
                        <XStack items="baseline" gap={6} minW={0}>
                          <SizableText
                            fontSize={rung.body}
                            fontWeight="600"
                            color="$ink"
                            shrink={0}
                          >
                            {agent.name}
                          </SizableText>
                          <SizableText
                            fontSize={rung.chip}
                            color="$soft"
                            numberOfLines={1}
                            flex={1}
                          >
                            {agent.role}
                          </SizableText>
                        </XStack>
                        <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                          {agent.status}
                        </SizableText>
                      </YStack>
                    </XStack>
                  )
                })
              : null}
          </>
        ) : null}

        {shownLeads.length > 0 ? (
          <>
            <Rule />
            <Group
              count={shownLeads.length}
              open={leadsOpen}
              onToggle={() => setLeadsOpen((v) => !v)}
            >
              Team Leads
            </Group>
            {leadsOpen ? (
              <XStack px={PAD - 4} pt={4} pb={6} flexWrap="wrap" rowGap={6} columnGap={4}>
                {shownLeads.map((agent) => {
                  const to = `/chat/dm-${agent.id}`
                  const here = pathname === to
                  return (
                    <YStack
                      key={agent.id}
                      {...press(() => navigate(to), `${agent.name} — ${agent.role}`)}
                      width="31%"
                      py={5}
                      px={4}
                      rounded={round.field}
                      items="center"
                      gap={3}
                      bg={here ? '$hover' : 'transparent'}
                      hoverStyle={{ background: '$hover' }}
                    >
                      <AgentFace agent={agent} size={34} />
                      <SizableText
                        fontSize={rung.chip}
                        fontWeight={here ? '600' : '500'}
                        color={here ? '$ink' : '$quiet'}
                        numberOfLines={1}
                      >
                        {agent.name}
                      </SizableText>
                    </YStack>
                  )
                })}
              </XStack>
            ) : null}
          </>
        ) : null}

        {directs.length > 0 ? (
          <>
            <Rule />
            <Group count={directs.length}>Direct</Group>
            {directs.map((r) => (
              <ChannelPill key={r.id} room={r} unreadCount={0} />
            ))}
          </>
        ) : null}
      </Roll>
    </Column>
  )
}

const ChannelPill = ({
  room,
  unreadCount,
  onClearUnread,
}: {
  room: Room
  unreadCount: number
  onClearUnread?: () => void
}) => {
  const { pathname } = useLocation()
  const to = `/chat/${room.id}`
  const here = pathname === to || pathname.startsWith(`${to}/`)
  const agent = room.id.startsWith('dm-')
    ? HANZO_AGENTS.find((a) => `dm-${a.id}` === room.id)
    : undefined
  const label =
    room.connectedOrgs && room.connectedOrgs.length > 0
      ? `${room.name} · ${room.connectedOrgs.join(', ')}`
      : room.name

  return (
    <XStack
      asChild
      style={ROW_AXIS}
      height={ROW - 2}
      items="center"
      justify="space-between"
      gap={8}
      px={PAD - 2}
      mx={6}
      rounded={round.field}
      borderWidth={1}
      borderColor={here ? '$edge' : 'transparent'}
      bg={here ? '$hover' : 'transparent'}
      hoverStyle={{ bg: '$hover' }}
      onClick={onClearUnread}
      data-testid={`sidebar-channel-${room.name}`}
    >
      <Link to={to} aria-current={here ? 'page' : undefined}>
        <XStack items="center" gap={8} minW={0} flex={1}>
          <YStack width={ICON} height={ICON} items="center" justify="center" shrink={0}>
            {agent ? <AgentFace agent={agent} size={18} /> : <Glyph room={room} />}
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

const AgentFace = ({ agent, size }: { agent: AgentPreset; size: number }) => (
  <YStack
    width={size}
    height={size}
    rounded={round.pill}
    overflow="hidden"
    bg="$panel"
    borderWidth={1}
    borderColor="$edge"
    items="center"
    justify="center"
    shrink={0}
  >
    <img
      src={agent.avatar}
      alt={agent.name}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
    />
  </YStack>
)

const Glyph = ({ room }: { room: Room }) =>
  room.kind === 'direct' ? null : room.connectedOrgs && room.connectedOrgs.length > 0 ? (
    <Share2 size={14} color="$soft" />
  ) : room.private ? (
    <Lock size={14} color="$soft" />
  ) : (
    <Hash size={15} color="$soft" />
  )

const Note = ({ children }: { children: string }) => (
  <SizableText px={PAD} py={8} fontSize="$2" color="$faint">
    {children}
  </SizableText>
)
