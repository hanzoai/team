/**
 * THE CHAT NAVIGATOR — channels, the 12 lead agents in a 2-column grid (matching
 * Hanzo Bot), and the 22 specialist 24/7 autonomous bots.
 */
import { SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { Hash, Lock } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { BOT_AGENTS, HANZO_AGENTS, LEAD_AGENTS, type AgentPreset } from '~/data/agents.ts'
import { PAD } from '~/shell/measure.ts'
import { Find, Group, Nav as Column, press, Roll, Row, Rule, surfaceAt } from '~/shell'
import { round, rung } from '~/theme/theme'
import type { Room } from './chat.ts'
import { useRooms } from './read.ts'

export function Channels() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const load = useRooms()
  const all = load.data ?? []
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all
  const channels = shown.filter((r) => r.kind === 'channel')
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
      <YStack height={14} />
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

        {channels.length > 0 ? (
          <>
            <Group>Channels</Group>
            {channels.map((r) => (
              <Line key={r.id} room={r} />
            ))}
          </>
        ) : null}

        {shownLeads.length > 0 ? (
          <>
            <Rule />
            <Group>Leads</Group>
            <XStack px={PAD - 4} py={4} flexWrap="wrap" gap={6}>
              {shownLeads.map((agent) => {
                const to = `/chat/dm-${agent.id}`
                const here = pathname === to
                return (
                  <YStack
                    key={agent.id}
                    {...press(() => navigate(to), `${agent.name} — ${agent.role}`)}
                    width="47%"
                    py={6}
                    px={4}
                    rounded={round.field}
                    items="center"
                    gap={4}
                    bg={here ? '$hover' : 'transparent'}
                    hoverStyle={{ background: '$hover' }}
                  >
                    <AgentFace agent={agent} size={40} />
                    <SizableText
                      fontSize={rung.small}
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
          </>
        ) : null}

        {shownBots.length > 0 ? (
          <>
            <Rule />
            <Group>Bots · 24/7</Group>
            {shownBots.map((agent) => {
              const to = `/chat/dm-${agent.id}`
              const here = pathname === to
              return (
                <XStack
                  key={agent.id}
                  {...press(() => navigate(to), `${agent.name} — ${agent.role}`)}
                  px={PAD}
                  py={6}
                  mx={4}
                  gap={10}
                  items="center"
                  rounded={round.field}
                  bg={here ? '$hover' : 'transparent'}
                  hoverStyle={{ background: '$hover' }}
                >
                  <AgentFace agent={agent} size={28} />
                  <YStack flex={1} minW={0}>
                    <XStack items="center" justify="space-between" gap={4}>
                      <SizableText
                        fontSize={rung.row}
                        fontWeight={here ? '600' : '500'}
                        color={here ? '$ink' : '$quiet'}
                        numberOfLines={1}
                      >
                        {agent.name}
                      </SizableText>
                      <SizableText fontSize={rung.chip} color="$faint" numberOfLines={1}>
                        {agent.role}
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={rung.chip} color="$soft" numberOfLines={1}>
                      {agent.status}
                    </SizableText>
                  </YStack>
                </XStack>
              )
            })}
          </>
        ) : null}

        {directs.length > 0 ? (
          <>
            <Rule />
            <Group>Direct</Group>
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
  return (
    <Row
      to={`/chat/${room.id}`}
      icon={agent ? <AgentFace agent={agent} size={18} /> : <Glyph room={room} />}
    >
      {room.name}
    </Row>
  )
}

const Glyph = ({ room }: { room: Room }) =>
  room.kind === 'direct' ? null : room.private ? (
    <Lock size={14} color="$soft" />
  ) : (
    <Hash size={16} color="$soft" />
  )

const Note = ({ children }: { children: string }) => (
  <SizableText px={PAD} py={8} fontSize="$2" color="$faint">
    {children}
  </SizableText>
)
