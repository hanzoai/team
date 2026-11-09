/**
 * THE CHAT NAVIGATOR — channels, the 12 lead agents in a 2-column grid (matching
 * Hanzo Bot), and the 22 specialist 24/7 autonomous bots.
 */
import { SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { Hash, Lock, Plus, Share2 } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { BOT_AGENTS, HANZO_AGENTS, LEAD_AGENTS, type AgentPreset } from '~/data/agents.ts'
import { openConnectModal } from '~/shell/ConnectOrgModal.tsx'
import { PAD } from '~/shell/measure.ts'
import { Find, Group, Nav as Column, press, Roll, Row, Rule, surfaceAt } from '~/shell'
import { round, rung } from '~/theme/theme'
import type { Room } from './chat.ts'
import { useRooms } from './read.ts'

export function Channels() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [connectOpen, setConnectOpen] = useState(true)
  const [botsOpen, setBotsOpen] = useState(true)
  const [leadsOpen, setLeadsOpen] = useState(true)
  const load = useRooms()
  const all = load.data ?? []
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all
  const channels = shown.filter((r) => r.kind === 'channel')
  const internalChannels = channels.filter((r) => !r.connectedOrgs || r.connectedOrgs.length === 0)
  const connectChannels = channels.filter((r) => r.connectedOrgs && r.connectedOrgs.length > 0)
  const directs = shown.filter((r) => r.kind === 'direct' && !r.id.startsWith('dm-'))
  const shownLeads = q
    ? LEAD_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department}`.toLowerCase().includes(q))
    : LEAD_AGENTS
  const shownBots = q
    ? BOT_AGENTS.filter((a) => `${a.name} ${a.role} ${a.department} ${a.status}`.toLowerCase().includes(q))
    : BOT_AGENTS

  return (
    <Column title={surfaceAt(pathname)?.label ?? 'Chat'}>
      <Find value={query} onChange={setQuery} />
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
        shownLeads.length === 0 &&
        shownBots.length === 0 ? (
          <Note>{`Nothing matches “${query.trim()}”.`}</Note>
        ) : null}

        {internalChannels.length > 0 ? (
          <>
            <Group
              count={internalChannels.length}
              open={channelsOpen}
              onToggle={() => setChannelsOpen((v) => !v)}
            >
              Channels
            </Group>
            {channelsOpen
              ? internalChannels.map((r) => <Line key={r.id} room={r} />)
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
                  <Line key={r.id} room={r} />
                ))}
                <XStack
                  {...press(() => openConnectModal('connect'), 'Connect external organization channel')}
                  px={PAD}
                  py={6}
                  mx={4}
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
                      mx={4}
                      gap={10}
                      items="center"
                      rounded={round.field}
                      bg={here ? '$hover' : 'transparent'}
                      hoverStyle={{ background: '$hover' }}
                    >
                      <YStack position="relative" shrink={0}>
                        <AgentFace agent={agent} size={30} />
                        <YStack
                          position="absolute"
                          b={-1}
                          r={-1}
                          width={8}
                          height={8}
                          rounded={round.pill}
                          bg="$ink"
                          borderWidth={1.5}
                          borderColor="$background"
                        />
                      </YStack>
                      <YStack flex={1} minW={0} gap={1}>
                        <XStack items="baseline" gap={6} minW={0}>
                          <SizableText
                            fontSize={rung.body}
                            fontWeight="600"
                            color={here ? '$ink' : '$ink'}
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
              <Line key={r.id} room={r} />
            ))}
          </>
        ) : null}
      </Roll>
    </Column>
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

const Line = ({ room }: { room: Room }) => {
  const agent = room.id.startsWith('dm-')
    ? HANZO_AGENTS.find((a) => `dm-${a.id}` === room.id)
    : undefined
  const label =
    room.connectedOrgs && room.connectedOrgs.length > 0
      ? `${room.name} · ${room.connectedOrgs.join(', ')}`
      : room.name
  return (
    <Row
      to={`/chat/${room.id}`}
      icon={agent ? <AgentFace agent={agent} size={18} /> : <Glyph room={room} />}
    >
      {label}
    </Row>
  )
}

const Glyph = ({ room }: { room: Room }) =>
  room.kind === 'direct' ? null : room.connectedOrgs && room.connectedOrgs.length > 0 ? (
    <Share2 size={14} color="$soft" />
  ) : room.private ? (
    <Lock size={14} color="$soft" />
  ) : (
    <Hash size={16} color="$soft" />
  )

const Note = ({ children }: { children: string }) => (
  <SizableText px={PAD} py={8} fontSize="$2" color="$faint">
    {children}
  </SizableText>
)
