/**
 * Mattermost `Followed Threads` Split View (`/threads`)
 */
import { Input, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUp, MessagesSquare } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint } from '~/theme/theme.ts'
import { sendThreadReply, useWorkspace } from '~/workspace/store.ts'

export function ThreadsWorkspace() {
  const { messages, channels, roster } = useWorkspace()
  const threaded = messages.filter((m) => m.replies.length > 0)
  const [selectedId, setSelectedId] = useState<string>(threaded[0]?.id ?? '')
  const [draft, setDraft] = useState('')

  const active = threaded.find((m) => m.id === selectedId) ?? threaded[0] ?? null
  const activeChannel = active ? channels.find((c) => c.id === active.roomId) : null

  const submit = () => {
    if (!active || !draft.trim()) return
    sendThreadReply(active.roomId, active.id, draft, false)
    setDraft('')
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
          Followed Threads
        </SizableText>
        <SizableText fontSize={12} style={{ color: paint.dim }}>
          {`${threaded.length} active engineering & incident discussions`}
        </SizableText>
      </XStack>

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
                const author = roster.find((r) => r.id === m.authorId) ?? roster[0]!
                const ch = channels.find((c) => c.id === m.roomId)
                const on = active?.id === m.id
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
                        {`#${ch?.name ?? m.roomId}`}
                      </SizableText>
                      <SizableText fontSize={10.5} style={{ color: paint.dim }}>
                        {`${m.replies.length} replies`}
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
                    {`#${activeChannel?.name ?? active.roomId} · Parent Message`}
                  </SizableText>
                  <SizableText fontSize={13.5} lineHeight={20} style={{ color: paint.ink }}>
                    {active.body.split('```')[0]?.trim()}
                  </SizableText>
                </YStack>

                <YStack gap={10}>
                  {active.replies.map((rep) => {
                    const ra = roster.find((r) => r.id === rep.authorId) ?? roster[0]!
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
                  placeholder="Reply to followed thread…"
                  value={draft}
                  onChangeText={setDraft}
                  onKeyDown={(e: { key?: string; preventDefault?: () => void }) => {
                    if (e.key === 'Enter') {
                      e.preventDefault?.()
                      submit()
                    }
                  }}
                />
                <YStack
                  {...press(submit, 'Send')}
                  width={26}
                  height={26}
                  rounded={13}
                  items="center"
                  justify="center"
                  style={{ backgroundColor: paint.composerAccent }}
                >
                  <ArrowUp size={14} color={paint.composerAccentInk} />
                </YStack>
              </XStack>
            </XStack>
          </YStack>
        ) : null}
      </XStack>
    </YStack>
  )
}
