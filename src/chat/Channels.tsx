/**
 * THE CHAT NAVIGATOR — channels, the space's bots, and direct messages. The
 * bots are the agents on the roster the server returns, nothing else.
 */
import { SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import { Hash, Lock, Plus, Share2 } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { openConnectModal } from '~/shell/ConnectOrgModal.tsx'
import { PAD } from '~/shell/measure.ts'
import { Find, Group, Nav as Column, press, Roll, Row, Rule, surfaceAt } from '~/shell'
import { round, rung } from '~/theme/theme'
import { botIn, botsOf, withPath } from './bots.ts'
import { titled, type Person, type Room } from './chat.ts'
import { Face } from './Face.tsx'
import { usePeople, useRooms } from './read.ts'

export function Channels() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [connectOpen, setConnectOpen] = useState(true)
  const [botsOpen, setBotsOpen] = useState(true)
  const load = useRooms()
  const roster = usePeople().data ?? []
  const all = load.data ?? []
  const q = query.trim().toLowerCase()
  const shown = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all
  const channels = shown.filter((r) => r.kind === 'channel')
  const internalChannels = channels.filter((r) => !r.connectedOrgs || r.connectedOrgs.length === 0)
  const connectChannels = channels.filter((r) => r.connectedOrgs && r.connectedOrgs.length > 0)
  const directs = shown.filter((r) => r.kind === 'direct' && !botIn(r, roster))
  const shownBots = botsOf(roster).filter((p) => !q || p.name.toLowerCase().includes(q))

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

        {load.phase === 'ready' && all.length === 0 && shownBots.length === 0 ? (
          <Note>No rooms yet.</Note>
        ) : null}

        {load.phase === 'ready' &&
        all.length > 0 &&
        shown.length === 0 &&
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
              ? internalChannels.map((r) => <Line key={r.id} room={r} roster={roster} />)
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
                  <Line key={r.id} room={r} roster={roster} />
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
            <Group count={shownBots.length} open={botsOpen} onToggle={() => setBotsOpen((v) => !v)}>
              Bots
            </Group>
            {botsOpen
              ? shownBots.map((bot) => {
                  const to = withPath(bot)
                  const here = pathname === to
                  return (
                    <XStack
                      key={bot.id}
                      {...press(() => navigate(to), bot.name)}
                      px={PAD - 2}
                      py={6}
                      mx={4}
                      gap={10}
                      items="center"
                      rounded={round.field}
                      bg={here ? '$hover' : 'transparent'}
                      hoverStyle={{ background: '$hover' }}
                    >
                      <Face person={bot} size={26} />
                      <SizableText fontSize={rung.body} fontWeight="600" color="$ink" numberOfLines={1} flex={1}>
                        {bot.name}
                      </SizableText>
                    </XStack>
                  )
                })
              : null}
          </>
        ) : null}

        {directs.length > 0 ? (
          <>
            <Rule />
            <Group count={directs.length}>Direct</Group>
            {directs.map((r) => (
              <Line key={r.id} room={r} roster={roster} />
            ))}
          </>
        ) : null}
      </Roll>
    </Column>
  )
}

const Line = ({ room, roster }: { room: Room; roster: readonly Person[] }) => {
  const label =
    room.connectedOrgs && room.connectedOrgs.length > 0
      ? `${room.name} · ${room.connectedOrgs.join(', ')}`
      : titled(room, roster)
  return (
    <Row
      to={`/chat/${room.id}`}
      icon={<Glyph room={room} />}
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
