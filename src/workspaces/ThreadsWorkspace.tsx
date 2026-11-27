/**
 * Followed Threads Split View (`/threads`)
 *
 * Displays real channel threads with replies loaded from `/v1/team/messages/:id/replies`.
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUp, MessagesSquare } from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'

import { bareAccount } from '~/data/model.ts'
import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint } from '~/theme/theme.ts'
import { loadThreadReplies, sendThreadReply, useWorkspace, type RosterMember } from '~/workspace/store.ts'

function resolveMember(roster: readonly RosterMember[], authorId: string): RosterMember {
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

export function ThreadsWorkspace() {
  const { messages, channels, roster } = useWorkspace()
  const threaded = messages.filter((m) => m.replyCount > 0 || m.replies.length > 0)
  const [selectedId, setSelectedId] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const active = threaded.find((m) => m.id === selectedId) ?? threaded[0] ?? null
  const activeChannel = active ? channels.find((c) => c.id === active.roomId) : null

  useEffect(() => {
    if (active?.id) {
      void loadThreadReplies(active.id)
    }
  }, [active?.id])

  const submit = async () => {
    if (!active || !draft.trim() || sending) return
    setSending(true)
    try {
      await sendThreadReply(active.roomId, active.id, draft, false)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="followed-threads-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        gap={8}
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <MessagesSquare size={15} color={paint.ink} />
        <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
          Threads
        </SizableText>
        <SizableText fontSize={12} style={{ color: paint.dim }}>
          {`${threaded.length} ${threaded.length === 1 ? 'thread' : 'threads'}`}
        </SizableText>
      </XStack>

      {threaded.length === 0 ? (
        <YStack flex={1} items="center" justify="center" p={24} gap={6}>
          <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }}>
            No active threads yet
          </SizableText>
          <SizableText fontSize={12.5} style={{ color: paint.dim }}>
            Reply to any message in a channel to start a thread.
          </SizableText>
        </YStack>
      ) : (
        <XStack flex={1} minH={0}>
          {/* Thread List */}
          <YStack
            width={290}
            shrink={0}
            minH={0}
            borderRightWidth={1}
            style={{ borderRightColor: paint.rule }}
          >
            <ScrollArea flex={1} minH={0}>
              <YStack p={10} gap={6}>
                {threaded.map((m) => {
                  const author = resolveMember(roster, m.authorId)
                  const ch = channels.find((c) => c.id === m.roomId)
                  const on = active?.id === m.id
                  const count = Math.max(m.replyCount, m.replies.length)
                  return (
                    <YStack
                      key={m.id}
                      {...press(() => setSelectedId(m.id), m.body.slice(0, 48))}
                      p={10}
                      gap={5}
                      rounded={8}
                      borderWidth={1}
                      style={{
                        backgroundColor: on ? paint.rowActive : paint.card,
                        borderColor: on ? paint.border : paint.rule,
                      }}
                    >
                      <XStack items="center" justify="space-between">
                        <SizableText fontSize={11} fontWeight="700" style={{ color: paint.mute }}>
                          {ch ? (ch.kind === 'dm' ? ch.name : `#${ch.name}`) : m.roomId}
                        </SizableText>
                        <SizableText fontSize={10.5} style={{ color: paint.dim }}>
                          {`${count} ${count === 1 ? 'reply' : 'replies'}`}
                        </SizableText>
                      </XStack>
                      <SizableText fontSize={12.5} fontWeight="600" style={{ color: paint.ink }} numberOfLines={2}>
                        {`${author.shortName}: ${m.body.split('\n')[0]}`}
                      </SizableText>
                    </YStack>
                  )
                })}
              </YStack>
            </ScrollArea>
          </YStack>

          {/* Active Thread Reader + Composer */}
          {active ? (
            <YStack flex={1} minW={0} minH={0}>
              <ScrollArea flex={1} minH={0}>
                <YStack p={18} gap={14}>
                  <YStack p={12} rounded={10} borderWidth={1} gap={6} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                    <SizableText fontSize={11.5} fontWeight="700" style={{ color: paint.mute }}>
                      {`${activeChannel ? (activeChannel.kind === 'dm' ? activeChannel.name : `#${activeChannel.name}`) : active.roomId} · Parent Message`}
                    </SizableText>
                    <SizableText fontSize={13.5} lineHeight={20} style={{ color: paint.ink }}>
                      {active.body}
                    </SizableText>
                  </YStack>

                  <YStack gap={10}>
                    {active.replies.map((rep) => {
                      const ra = resolveMember(roster, rep.authorId)
                      return (
                        <XStack key={rep.id} gap={10} items="flex-start">
                          <MemberPortrait member={ra} size={28} />
                          <YStack flex={1} gap={2}>
                            <XStack items="center" gap={6}>
                              <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
                                {ra.name}
                              </SizableText>
                              <SizableText fontSize={11} style={{ color: paint.dim }}>
                                {rep.at}
                              </SizableText>
                            </XStack>
                            <SizableText fontSize={13} lineHeight={19} style={{ color: paint.fg }}>
                              {rep.body}
                            </SizableText>
                          </YStack>
                        </XStack>
                      )
                    })}
                  </YStack>
                </YStack>
              </ScrollArea>

              <XStack
                p={14}
                gap={8}
                borderTopWidth={1}
                items="center"
                style={{ borderTopColor: paint.rule }}
              >
                <XStack
                  flex={1}
                  px={12}
                  py={6}
                  rounded={9}
                  borderWidth={1}
                  items="center"
                  style={{ backgroundColor: paint.composer, borderColor: paint.composerRule }}
                >
                  <Input
                    flex={1}
                    unstyled
                    height={24}
                    borderWidth={0}
                    bg="transparent"
                    fontSize={13}
                    color={paint.ink}
                    placeholder="Reply to thread…"
                    value={draft}
                    onChangeText={setDraft}
                    onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                      if (e.key === 'Enter') {
                        e.preventDefault?.()
                        void submit()
                      }
                    }}
                  />
                  <YStack
                    {...press(() => void submit(), 'Send')}
                    width={26}
                    height={26}
                    rounded={13}
                    items="center"
                    justify="center"
                    opacity={sending ? 0.5 : 1}
                    style={{ backgroundColor: paint.composerAccent }}
                  >
                    <ArrowUp size={14} color={paint.composerAccentInk} />
                  </YStack>
                </XStack>
              </XStack>
            </YStack>
          ) : null}
        </XStack>
      )}
    </YStack>
  )
}
