/**
 * COL 4 — Right Contextual Pane (`296px`)
 *
 * Switches cleanly between:
 *  1. Mattermost's simultaneous `Thread` RHS (real replies from `/v1/team/messages/:id/replies`)
 *  2. Workforce & Members Roster (real humans from `/v1/team/members` & real bots from `/v1/agents`)
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUp, Check, MessagesSquare, X } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { bareAccount } from '~/data/model.ts'
import { paint, ring, round, state } from '~/theme/theme.ts'
import {
  closeThreadPane,
  openDmWithMember,
  sendThreadReply,
  toggleRosterPane,
  useWorkspace,
  type RosterMember,
} from '~/workspace/store.ts'
import { ASIDE } from './measure.ts'
import { press } from './press.ts'
import { MemberPortrait } from './UnifiedSidebar.tsx'

function resolveAuthor(roster: readonly RosterMember[], authorId: string): RosterMember {
  const bare = bareAccount(authorId)
  const hit = roster.find((r) => r.id === authorId || r.id === bare || bareAccount(r.id) === bare)
  if (hit) return hit
  const short = bare ? `Member ${bare.slice(0, 6)}` : 'Teammate'
  return {
    id: bare || 'member',
    handle: short.toLowerCase().replace(/\s+/g, '-'),
    name: short,
    shortName: short,
    bot: false,
    activity: '',
    presence: 'offline',
  }
}

export function RightPane() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { rightPaneMode, activeThread, channels, messages, roster, currentUser, hydrating } = useWorkspace()
  const [replyText, setReplyText] = useState('')
  const [alsoToChannel, setAlsoToChannel] = useState(false)
  const [sending, setSending] = useState(false)

  const onHome = pathname === '/home'
  const onOffice = pathname === '/office'

  if (onOffice) return null
  if (!onHome && rightPaneMode === 'closed') return null

  const showThread = !onHome && rightPaneMode === 'thread' && activeThread !== null
  const parentMsg = showThread
    ? messages.find((m) => m.id === activeThread.messageId) ?? null
    : null
  const threadRoom = parentMsg
    ? channels.find((c) => c.id === parentMsg.roomId) ?? null
    : null

  const openChatWith = async (member: RosterMember) => {
    const myBare = bareAccount(currentUser?.accountId || currentUser?.id || '')
    if (!member.bot && myBare && bareAccount(member.id) === myBare) {
      navigate('/office')
      return
    }
    const dmId = await openDmWithMember(member.id).catch(() => null)
    navigate(dmId ? `/chat/${dmId}` : `/chat/with-${member.id}`)
  }

  if (showThread && parentMsg) {
    const parentAuthor = resolveAuthor(roster, parentMsg.authorId)
    const roomLabel = threadRoom ? (threadRoom.kind === 'dm' ? threadRoom.name : `#${threadRoom.name}`) : 'Channel'
    const totalReplies = Math.max(parentMsg.replyCount, parentMsg.replies.length)

    const submitReply = async () => {
      const clean = replyText.trim()
      if (!clean || sending) return
      setSending(true)
      try {
        await sendThreadReply(parentMsg.roomId, parentMsg.id, clean, alsoToChannel)
        setReplyText('')
      } finally {
        setSending(false)
      }
    }

    return (
      <YStack
        width={ASIDE}
        shrink={0}
        minH={0}
        borderLeftWidth={1}
        style={{ backgroundColor: paint.aside, borderLeftColor: paint.sidebarRule }}
        data-testid="mattermost-thread-rhs"
      >
        {/* Thread RHS Header */}
        <XStack
          height={44}
          px={14}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          style={{ borderBottomColor: paint.rule }}
        >
          <XStack items="center" gap={7} minW={0} flex={1}>
            <MessagesSquare size={14} color={paint.ink} />
            <SizableText fontSize={13} fontWeight="700" style={{ color: paint.ink }}>
              Thread
            </SizableText>
            <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1}>
              {roomLabel}
            </SizableText>
          </XStack>
          <XStack
            {...press(closeThreadPane, 'Close thread')}
            width={24}
            height={24}
            rounded={6}
            items="center"
            justify="center"
            hoverStyle={{ background: paint.hover }}
            focusVisibleStyle={ring}
            data-testid="close-thread-rhs"
          >
            <X size={14} color={paint.dim} />
          </XStack>
        </XStack>

        {/* Thread Parent + Replies Stream */}
        <ScrollArea flex={1} minH={0}>
          <YStack p={12} gap={12}>
            {/* Parent Message */}
            <YStack
              p={10}
              rounded={9}
              borderWidth={1}
              gap={6}
              style={{ backgroundColor: paint.card, borderColor: paint.border }}
            >
              <XStack items="center" gap={8}>
                <MemberPortrait member={parentAuthor} size={24} />
                <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
                  {parentAuthor.name}
                </SizableText>
                <SizableText fontSize={10.5} style={{ color: paint.dim }}>
                  {parentMsg.at}
                </SizableText>
              </XStack>
              <SizableText fontSize={12.5} lineHeight={18} style={{ color: paint.fg }}>
                {parentMsg.body.split('```')[0]?.trim() || parentMsg.body}
              </SizableText>
            </YStack>

            {/* Replies Divider */}
            <XStack items="center" gap={8}>
              <SizableText fontSize={11} fontWeight="600" style={{ color: paint.dim }}>
                {`${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`}
              </SizableText>
              <YStack flex={1} height={1} style={{ backgroundColor: paint.rule }} />
            </XStack>

            {/* Thread Replies */}
            {parentMsg.replies.length === 0 ? (
              <SizableText fontSize={12} style={{ color: paint.dim }}>
                No replies yet — start the thread below.
              </SizableText>
            ) : (
              <YStack gap={10}>
                {parentMsg.replies.map((rep) => {
                  const repAuthor = resolveAuthor(roster, rep.authorId)
                  return (
                    <XStack key={rep.id} gap={8} items="flex-start">
                      <MemberPortrait member={repAuthor} size={24} />
                      <YStack flex={1} minW={0} gap={2}>
                        <XStack items="center" gap={6}>
                          <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
                            {repAuthor.bot ? `@${repAuthor.handle}` : repAuthor.shortName}
                          </SizableText>
                          <SizableText fontSize={10.5} style={{ color: paint.dim }}>
                            {rep.at}
                          </SizableText>
                        </XStack>
                        <SizableText fontSize={12.5} lineHeight={18} style={{ color: paint.fg }}>
                          {rep.body}
                        </SizableText>
                      </YStack>
                    </XStack>
                  )
                })}
              </YStack>
            )}
          </YStack>
        </ScrollArea>

        {/* Thread RHS Composer + `Also send to #channel` */}
        <YStack
          p={10}
          gap={7}
          borderTopWidth={1}
          style={{ borderTopColor: paint.rule, backgroundColor: paint.aside }}
        >
          <XStack
            px={10}
            py={6}
            rounded={9}
            borderWidth={1}
            items="center"
            gap={6}
            style={{ backgroundColor: paint.composer, borderColor: paint.composerRule }}
          >
            <Input
              flex={1}
              unstyled
              height={24}
              borderWidth={0}
              bg="transparent"
              fontSize={12.5}
              color={paint.ink}
              placeholder="Reply to thread…"
              value={replyText}
              onChangeText={setReplyText}
              onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                if (e.key === 'Enter') {
                  e.preventDefault?.()
                  void submitReply()
                }
              }}
              data-testid="thread-rhs-input"
            />
            <YStack
              {...press(() => void submitReply(), 'Send thread reply')}
              width={24}
              height={24}
              rounded={12}
              items="center"
              justify="center"
              opacity={sending ? 0.5 : 1}
              style={{ backgroundColor: paint.composerAccent }}
            >
              <ArrowUp size={13} color={paint.composerAccentInk} />
            </YStack>
          </XStack>

          <XStack
            {...press(() => setAlsoToChannel((v) => !v), `Also send to ${roomLabel}`)}
            items="center"
            gap={6}
            px={2}
          >
            <YStack
              width={14}
              height={14}
              rounded={4}
              borderWidth={1}
              items="center"
              justify="center"
              style={{
                backgroundColor: alsoToChannel ? paint.ink : 'transparent',
                borderColor: alsoToChannel ? paint.ink : paint.dim,
              }}
            >
              {alsoToChannel ? <Check size={10} color={paint.ground} /> : null}
            </YStack>
            <SizableText fontSize={11.5} style={{ color: paint.mute }}>
              {`Also send to ${roomLabel}`}
            </SizableText>
          </XStack>
        </YStack>
      </YStack>
    )
  }

  // MODE 2: Workforce & Members Roster
  const agents = roster.filter((m) => m.bot)
  const humans = roster.filter((m) => !m.bot)
  const humansOnline = humans.filter((h) => h.presence === 'online').length

  return (
    <YStack
      width={ASIDE}
      shrink={0}
      minH={0}
      borderLeftWidth={1}
      style={{ backgroundColor: paint.aside, borderLeftColor: paint.sidebarRule }}
      data-testid="workforce-roster-rhs"
    >
      {onHome ? (
        <YStack px={18} pt={18} pb={10} gap={2}>
          <SizableText fontSize={13.5} fontWeight="600" style={{ color: paint.ink }}>
            Your workforce
          </SizableText>
          <SizableText fontSize={11.5} style={{ color: paint.dim }}>
            {hydrating
              ? 'Loading roster…'
              : `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} · ${humansOnline} online`}
          </SizableText>
        </YStack>
      ) : (
        <XStack
          height={44}
          px={14}
          items="center"
          justify="space-between"
          borderBottomWidth={1}
          style={{ borderBottomColor: paint.rule }}
        >
          <SizableText fontSize={12.5} fontWeight="600" style={{ color: paint.ink }}>
            {`Members · ${agents.length + humans.length}`}
          </SizableText>
          <XStack
            {...press(toggleRosterPane, 'Hide roster')}
            width={24}
            height={24}
            rounded={6}
            items="center"
            justify="center"
            hoverStyle={{ background: paint.hover }}
          >
            <X size={13} color={paint.dim} />
          </XStack>
        </XStack>
      )}

      <ScrollArea flex={1} minH={0}>
        <YStack px={12} py={onHome ? 6 : 10} gap={onHome ? 6 : 14}>
          {!onHome ? (
            <SizableText px={6} fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
              {`AI AGENTS — ${agents.length}`}
            </SizableText>
          ) : null}

          <YStack gap={2}>
            {agents.length === 0 ? (
              <SizableText px={6} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                {hydrating ? 'Loading agents…' : 'No bots in this workspace yet.'}
              </SizableText>
            ) : (
              agents.map((ag) => (
                <RosterRow key={ag.id} member={ag} onPress={() => void openChatWith(ag)} />
              ))
            )}
          </YStack>

          {!onHome ? (
            <YStack gap={2} pt={4}>
              <SizableText px={6} pb={2} fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
                {`HUMANS — ${humans.length} (${humansOnline} ONLINE)`}
              </SizableText>
              {humans.length === 0 ? (
                <SizableText px={6} py={4} fontSize={11.5} style={{ color: paint.dim }}>
                  {hydrating ? 'Loading humans…' : 'No human members loaded.'}
                </SizableText>
              ) : (
                humans.map((hu) => (
                  <RosterRow key={hu.id} member={hu} onPress={() => void openChatWith(hu)} />
                ))
              )}
            </YStack>
          ) : null}
        </YStack>
      </ScrollArea>

      <XStack
        {...press(() => navigate('/office'), 'View entire workforce in Virtual Office')}
        px={18}
        py={12}
        borderTopWidth={1}
        items="center"
        justify="space-between"
        style={{ borderTopColor: paint.rule }}
        hoverStyle={{ background: paint.hover }}
      >
        <SizableText fontSize={12} style={{ color: paint.dim }}>
          Open Virtual Office →
        </SizableText>
      </XStack>
    </YStack>
  )
}

function RosterRow({
  member,
  onPress,
}: {
  member: RosterMember
  onPress: () => void
}) {
  return (
    <XStack
      {...press(onPress, `${member.name} · ${member.activity}`)}
      px={8}
      py={6}
      rounded={8}
      items="center"
      gap={10}
      hoverStyle={{ background: paint.rowHover }}
      focusVisibleStyle={ring}
      data-testid={`roster-member-${member.id}`}
    >
      <YStack position="relative" shrink={0}>
        <MemberPortrait member={member} size={30} speaking={Boolean(member.speaking)} />
        <YStack
          position="absolute"
          b={-1}
          r={-1}
          width={8}
          height={8}
          rounded={round.pill}
          borderWidth={1.5}
          style={{
            backgroundColor: member.presence === 'online' || member.bot ? state.done : paint.dim,
            borderColor: paint.aside,
          }}
        />
      </YStack>
      <YStack flex={1} minW={0}>
        <XStack items="center" gap={5}>
          <SizableText fontSize={13} fontWeight="600" style={{ color: paint.ink }} numberOfLines={1}>
            {member.name}
          </SizableText>
          {member.bot ? (
            <SizableText fontSize={9.5} fontWeight="700" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
              APP
            </SizableText>
          ) : null}
        </XStack>
        <SizableText fontSize={11.5} style={{ color: paint.dim }} numberOfLines={1}>
          {member.activity || (member.bot ? `@${member.handle}` : member.presence)}
        </SizableText>
      </YStack>
    </XStack>
  )
}
