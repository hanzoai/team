/**
 * Mattermost-Grade Unified Inbox Workspace (`/inbox`)
 * Mentions, Thread Replies, Agent Approvals & PR/Deploy blockers with 1-click `[Approve]` / `[Reply]`.
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { CheckCircle2, Inbox as InboxIcon, MessageSquare, ShieldAlert } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint, ring, round } from '~/theme/theme.ts'
import { approveDeployRelease, openThreadPane, useWorkspace } from '~/workspace/store.ts'

type FilterTab = 'all' | 'approvals' | 'mentions'

export function InboxWorkspace() {
  const navigate = useNavigate()
  const { attention, messages, roster } = useWorkspace()
  const [filter, setFilter] = useState<FilterTab>('all')

  const rcMsg = messages.find((m) => m.deployCard)
  const approved = Boolean(rcMsg?.deployCard?.approvedBy)

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="inbox-workspace">
      <XStack
        height={44}
        px={18}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={8}>
          <InboxIcon size={15} color={paint.ink} />
          <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }}>
            Inbox
          </SizableText>
          <SizableText fontSize={12} style={{ color: paint.dim }}>
            Decisions, agent approvals, mentions &amp; release blockers
          </SizableText>
        </XStack>

        <XStack items="center" gap={5}>
          {(['all', 'approvals', 'mentions'] as const).map((t) => {
            const active = filter === t
            return (
              <XStack
                key={t}
                {...press(() => setFilter(t), t)}
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
                  {t === 'all' ? 'All (4)' : t === 'approvals' ? 'Approvals (2)' : 'Mentions (2)'}
                </SizableText>
              </XStack>
            )
          })}
        </XStack>
      </XStack>

      <ScrollArea flex={1} minH={0}>
        <YStack p={20} gap={12} maxW={760}>
          {/* 1-Click Release Approval Row */}
          {filter !== 'mentions' ? (
            <YStack
              p={14}
              rounded={11}
              borderWidth={1}
              gap={10}
              style={{ backgroundColor: paint.card, borderColor: paint.border }}
            >
              <XStack items="center" justify="space-between" gap={8}>
                <XStack items="center" gap={10}>
                  <MemberPortrait member={roster.find((r) => r.id === 'dev')!} size={30} />
                  <YStack>
                    <SizableText fontSize={13.5} fontWeight="700" style={{ color: paint.ink }}>
                      @dev · Approve Hanzo Team v1.1.0 Release Candidate
                    </SizableText>
                    <SizableText fontSize={12} style={{ color: paint.dim }}>
                      #engineering · 136/136 tests green · Linux X11 RGBA verified
                    </SizableText>
                  </YStack>
                </XStack>
                <XStack
                  px={8}
                  py={2}
                  rounded={round.pill}
                  items="center"
                  gap={4}
                  style={{ backgroundColor: approved ? paint.speakingBg : paint.sevBg }}
                >
                  {approved ? (
                    <CheckCircle2 size={11} color={paint.speaking} />
                  ) : (
                    <ShieldAlert size={11} color={paint.sevInk} />
                  )}
                  <SizableText
                    fontSize={10.5}
                    fontWeight="700"
                    style={{ color: approved ? paint.speaking : paint.sevInk }}
                  >
                    {approved ? 'Approved' : 'Needs Sign-Off'}
                  </SizableText>
                </XStack>
              </XStack>

              <XStack items="center" gap={8}>
                {!approved && rcMsg ? (
                  <XStack
                    {...press(() => approveDeployRelease(rcMsg.id), 'Approve release')}
                    px={12}
                    py={6}
                    rounded={6}
                    style={{ backgroundColor: paint.ink }}
                    focusVisibleStyle={ring}
                  >
                    <SizableText fontSize={12} fontWeight="700" style={{ color: paint.ground }}>
                      Approve &amp; Deploy
                    </SizableText>
                  </XStack>
                ) : null}
                <XStack
                  {...press(() => {
                    navigate('/chat/engineering')
                    if (rcMsg) openThreadPane('engineering', rcMsg.id)
                  }, 'Reply in #engineering')}
                  px={11}
                  py={6}
                  rounded={6}
                  borderWidth={1}
                  items="center"
                  gap={5}
                  style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                >
                  <MessageSquare size={12} color={paint.mute} />
                  <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
                    Reply in Thread
                  </SizableText>
                </XStack>
              </XStack>
            </YStack>
          ) : null}

          {/* Remaining Attention & Mention Rows */}
          {attention.map((att) => {
            const agent = roster.find((r) => r.handle === att.agentHandle) ?? roster[0]!
            return (
              <XStack
                key={att.id}
                p={13}
                rounded={10}
                borderWidth={1}
                items="center"
                justify="space-between"
                gap={12}
                style={{ backgroundColor: paint.card, borderColor: paint.border }}
              >
                <XStack items="center" gap={10} flex={1} minW={0}>
                  <MemberPortrait member={agent} size={28} />
                  <YStack flex={1} minW={0}>
                    <SizableText fontSize={13} fontWeight="600" style={{ color: paint.ink }}>
                      {`@${agent.handle} — ${att.title}`}
                    </SizableText>
                    <SizableText fontSize={12} style={{ color: paint.dim }}>
                      {att.subtitle}
                    </SizableText>
                  </YStack>
                </XStack>
                <XStack
                  {...press(() => navigate(att.targetPath), `Open ${att.title}`)}
                  px={10}
                  py={5}
                  rounded={6}
                  borderWidth={1}
                  style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                  hoverStyle={{ background: paint.hover }}
                >
                  <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                    Open →
                  </SizableText>
                </XStack>
              </XStack>
            )
          })}
        </YStack>
      </ScrollArea>
    </YStack>
  )
}
