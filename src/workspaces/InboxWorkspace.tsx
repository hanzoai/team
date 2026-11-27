/**
 * Unified Inbox Workspace (`/inbox`)
 *
 * Hydrated directly from `/v1/team/inbox` with real mark-read, mark-all-read,
 * archive, and deep-link navigation to the triggering channel.
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { Archive, Check, CheckCheck, Inbox as InboxIcon } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint, ring, round } from '~/theme/theme.ts'
import {
  archiveAttention,
  markAllAttentionRead,
  markAttentionRead,
  useWorkspace,
} from '~/workspace/store.ts'

type FilterTab = 'all' | 'mention' | 'dm' | 'reply'

export function InboxWorkspace() {
  const navigate = useNavigate()
  const { attention, inboxUnread, roster, hydrating } = useWorkspace()
  const [filter, setFilter] = useState<FilterTab>('all')

  const mentionItems = attention.filter((a) => a.reason === 'mention')
  const dmItems = attention.filter((a) => a.reason === 'dm')
  const replyItems = attention.filter((a) => a.reason === 'reply')

  const visible =
    filter === 'mention'
      ? mentionItems
      : filter === 'dm'
        ? dmItems
        : filter === 'reply'
          ? replyItems
          : attention

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="inbox-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        justify="space-between"
        gap={10}
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8}>
          <InboxIcon size={15} color={paint.ink} />
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Inbox
          </SizableText>
          <SizableText fontSize={12} style={{ color: paint.dim }}>
            {`${inboxUnread} unread`}
          </SizableText>
        </XStack>

        <XStack items="center" gap={5}>
          {(
            [
              { id: 'all', label: `All (${attention.length})` },
              { id: 'mention', label: `Mentions (${mentionItems.length})` },
              { id: 'dm', label: `Direct (${dmItems.length})` },
              { id: 'reply', label: `Replies (${replyItems.length})` },
            ] as const
          ).map((t) => {
            const active = filter === t.id
            return (
              <XStack
                key={t.id}
                {...press(() => setFilter(t.id), t.label)}
                height={25}
                px={10}
                rounded={6}
                borderWidth={1}
                items="center"
                style={{
                  backgroundColor: active ? paint.rowActive : 'transparent',
                  borderColor: active ? paint.border : paint.rule,
                }}
              >
                <SizableText fontSize={11.5} fontWeight={active ? '600' : '500'} style={{ color: active ? paint.ink : paint.mute }}>
                  {t.label}
                </SizableText>
              </XStack>
            )
          })}

          {inboxUnread > 0 ? (
            <XStack
              {...press(() => void markAllAttentionRead(), 'Mark all read')}
              height={25}
              px={9}
              rounded={6}
              borderWidth={1}
              items="center"
              gap={4}
              style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
              hoverStyle={{ background: paint.hover }}
            >
              <CheckCheck size={12} color={paint.ink} />
              <SizableText fontSize={11} fontWeight="600" style={{ color: paint.ink }}>
                Mark all read
              </SizableText>
            </XStack>
          ) : null}
        </XStack>
      </XStack>

      <ScrollArea flex={1} minH={0}>
        <YStack p={24} gap={12} maxW={780}>
          {hydrating && visible.length === 0 ? (
            <YStack p={20} rounded={14} borderWidth={1} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
              <SizableText fontSize={13} style={{ color: paint.dim }}>
                Loading notifications…
              </SizableText>
            </YStack>
          ) : visible.length === 0 ? (
            <YStack p={24} rounded={14} borderWidth={1} gap={6} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
              <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }}>
                Inbox is clear
              </SizableText>
              <SizableText fontSize={12.5} style={{ color: paint.dim }}>
                Mentions, direct messages, and replies in threads you participate in will appear here.
              </SizableText>
            </YStack>
          ) : (
            visible.map((att) => {
              const member = roster.find((r) => r.handle === att.agentHandle) ?? {
                name: att.agentHandle || 'Member',
                shortName: att.badgeText || 'M',
                avatar: att.avatar,
                bot: false,
              }
              return (
                <XStack
                  key={att.id}
                  p={15}
                  rounded={14}
                  borderWidth={1}
                  items="center"
                  justify="space-between"
                  gap={14}
                  style={{
                    backgroundColor: paint.card,
                    borderColor: att.read ? paint.rule : paint.border,
                  }}
                >
                  <XStack items="center" gap={10} flex={1} minW={0}>
                    <MemberPortrait member={member} size={28} />
                    <YStack flex={1} minW={0} gap={2}>
                      <XStack items="center" gap={6}>
                        {!att.read ? (
                          <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: paint.speaking }} />
                        ) : null}
                        <SizableText fontSize={13} fontWeight={att.read ? '500' : '700'} style={{ color: paint.ink }} numberOfLines={1}>
                          {att.title}
                        </SizableText>
                      </XStack>
                      <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1}>
                        {att.subtitle}
                      </SizableText>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap={6} shrink={0}>
                    {!att.read ? (
                      <XStack
                        {...press(() => void markAttentionRead(att.id), 'Mark read')}
                        width={26}
                        height={26}
                        rounded={6}
                        borderWidth={1}
                        items="center"
                        justify="center"
                        style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                        hoverStyle={{ background: paint.hover }}
                      >
                        <Check size={12} color={paint.ink} />
                      </XStack>
                    ) : null}
                    <XStack
                      {...press(() => void archiveAttention(att.id), 'Archive')}
                      width={26}
                      height={26}
                      rounded={6}
                      borderWidth={1}
                      items="center"
                      justify="center"
                      style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <Archive size={12} color={paint.mute} />
                    </XStack>
                    <XStack
                      {...press(() => {
                        if (!att.read) void markAttentionRead(att.id)
                        navigate(att.targetPath)
                      }, `Open ${att.title}`)}
                      px={10}
                      py={5}
                      rounded={6}
                      borderWidth={1}
                      style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                      hoverStyle={{ background: paint.hover }}
                      focusVisibleStyle={ring}
                    >
                      <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                        Open →
                      </SizableText>
                    </XStack>
                  </XStack>
                </XStack>
              )
            })
          )}
        </YStack>
      </ScrollArea>
    </YStack>
  )
}
