/**
 * Hanzo Team Home Workspace (`/home`)
 *
 * Wired to real workspace channels, members, agents, and `/v1/team/inbox` notifications.
 */
import { Popover } from '@hanzo/gui'
import { ScrollArea, SizableText, Textarea, XStack, YStack } from '@hanzo/ui'
import { ArrowUp, AtSign, ChevronRight, Plus } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { press } from '~/shell/press.ts'
import { useTeamSettings } from '~/settings/preferences.ts'
import { paint, ring, round } from '~/theme/theme.ts'
import {
  markAttentionRead,
  sendWorkspaceMessage,
  setComposerModel,
  useWorkspace,
  type ComposerModel,
} from '~/workspace/store.ts'

const MODELS: readonly ComposerModel[] = ['enso', 'zen6-coder', 'zen6-ultra']

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomeWorkspace() {
  const navigate = useNavigate()
  const { attention, inboxUnread, composerModel, roster, channels, currentUser, hydrating } = useWorkspace()
  const { settings, chat } = useTeamSettings()
  const effortLabel =
    settings.effortDisplay === 'bars'
      ? chat.effort === 'low'
        ? '▮▯▯'
        : chat.effort === 'high'
          ? '▮▮▮'
          : '▮▮▯'
      : 'Auto'
  const [prompt, setPrompt] = useState('')
  const [dispatchedNote, setDispatchedNote] = useState<{ text: string; channelId: string; channelName: string } | null>(null)
  const [modelOpen, setModelOpen] = useState(false)

  const primaryChannel =
    channels.find((c) => c.kind === 'channel' && c.name.toLowerCase() === 'general') ??
    channels.find((c) => c.kind === 'channel') ??
    channels[0] ??
    null
  const publicChannelCount = channels.filter((c) => c.kind === 'channel').length
  const activeBotsCount = roster.filter((r) => r.bot).length
  const firstName = currentUser?.name?.split(/\s+/)[0] || ''

  const submitObjective = async () => {
    const clean = prompt.trim()
    if (!clean || !primaryChannel) return
    setPrompt('')
    const sent = await sendWorkspaceMessage(primaryChannel.id, clean)
    if (sent) {
      setDispatchedNote({
        text: `Sent to #${primaryChannel.name}.`,
        channelId: primaryChannel.id,
        channelName: primaryChannel.name,
      })
    }
  }

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="home-v88-workspace">
      <XStack
        height={44}
        px={22}
        items="center"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <SizableText fontSize={13.5} fontWeight="500" style={{ color: paint.mute }}>
          Home
        </SizableText>
      </XStack>

      <ScrollArea flex={1} minH={0}>
        <YStack
          width="100%"
          maxW={680}
          px={32}
          pt={30}
          pb={28}
          gap={26}
          style={{ marginInline: 'auto' }}
        >
          {/* Real Greeting */}
          <YStack gap={4}>
            <SizableText
              fontSize={28}
              lineHeight={34}
              fontWeight="600"
              style={{ color: paint.ink, letterSpacing: -0.5 }}
            >
              {firstName ? `${greetingByHour()}, ${firstName}.` : `${greetingByHour()}.`}
            </SizableText>
            <SizableText fontSize={13.5} style={{ color: paint.dim }}>
              {hydrating
                ? 'Syncing live workspace activity…'
                : `${publicChannelCount} ${publicChannelCount === 1 ? 'channel' : 'channels'} · ${activeBotsCount} ${activeBotsCount === 1 ? 'bot' : 'bots'} ready`}
            </SizableText>
          </YStack>

          {/* 3 Real Metric Tiles */}
          <XStack gap={12} flexWrap="wrap">
            <MetricTile
              count={String(publicChannelCount)}
              label="Channels"
              onPress={() => navigate(primaryChannel ? `/chat/${primaryChannel.id}` : '/chat')}
            />
            <MetricTile
              count={String(activeBotsCount)}
              label="Active bots"
              onPress={() => navigate('/office')}
            />
            <MetricTile
              count={String(inboxUnread)}
              label="Unread inbox"
              onPress={() => navigate('/inbox')}
            />
          </XStack>

          {/* Real Inbox / Attention Rows */}
          <YStack gap={8}>
            <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }} pb={4}>
              Needs your attention
            </SizableText>

            {attention.length === 0 ? (
              <YStack p={18} rounded={14} borderWidth={1} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                <SizableText fontSize={13} style={{ color: paint.dim }}>
                  {hydrating ? 'Loading inbox notifications…' : 'All caught up — no unread mentions or notifications.'}
                </SizableText>
              </YStack>
            ) : (
              <YStack>
                {attention.slice(0, 6).map((item, idx) => (
                  <XStack
                    key={item.id}
                    {...press(() => {
                      if (!item.read) void markAttentionRead(item.id)
                      navigate(item.targetPath)
                    }, item.title)}
                    py={13}
                    px={6}
                    items="center"
                    justify="space-between"
                    gap={14}
                    borderBottomWidth={idx < Math.min(attention.length, 6) - 1 ? 1 : 0}
                    style={{ borderBottomColor: paint.rule }}
                    hoverStyle={{ background: paint.rowHover }}
                    focusVisibleStyle={ring}
                    data-testid={`home-attention-${item.id}`}
                  >
                    <XStack items="center" gap={13} flex={1} minW={0}>
                      <YStack
                        width={34}
                        height={34}
                        rounded={round.pill}
                        borderWidth={1}
                        items="center"
                        justify="center"
                        shrink={0}
                        style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                      >
                        <SizableText fontSize={10} fontWeight="700" style={{ color: paint.mute, letterSpacing: 0.4 }}>
                          {item.badgeText}
                        </SizableText>
                      </YStack>
                      <YStack flex={1} minW={0} gap={2}>
                        <SizableText fontSize={13.5} fontWeight={item.read ? '400' : '600'} style={{ color: paint.ink }} numberOfLines={1}>
                          {item.title}
                        </SizableText>
                        <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1}>
                          {item.subtitle}
                        </SizableText>
                      </YStack>
                    </XStack>
                    <ChevronRight size={15} color={paint.dim} />
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>

          {dispatchedNote ? (
            <XStack
              px={12}
              py={8}
              rounded={8}
              borderWidth={1}
              items="center"
              justify="space-between"
              style={{ backgroundColor: paint.card, borderColor: paint.border }}
            >
              <SizableText fontSize={12} style={{ color: paint.speaking }}>
                {dispatchedNote.text}
              </SizableText>
              <XStack {...press(() => navigate(`/chat/${dispatchedNote.channelId}`), `Open #${dispatchedNote.channelName}`)}>
                <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                  {`Open #${dispatchedNote.channelName} →`}
                </SizableText>
              </XStack>
            </XStack>
          ) : null}

          {/* Unified Quick Dispatch Composer */}
          <YStack
            mt={8}
            px={16}
            pt={14}
            pb={12}
            gap={18}
            rounded={16}
            borderWidth={1}
            style={{ backgroundColor: paint.composer, borderColor: paint.composerRule }}
            data-testid="home-accomplish-composer"
          >
            <Textarea
              unstyled
              rows={1}
              minH={26}
              maxH={96}
              borderWidth={0}
              bg="transparent"
              fontSize={13.5}
              color={paint.ink}
              placeholder={
                primaryChannel
                  ? `Message #${primaryChannel.name} or @mention a workspace bot…`
                  : 'Create a channel first to dispatch messages…'
              }
              value={prompt}
              onChangeText={setPrompt}
              onKeyDown={(e: { nativeEvent?: { key?: string; metaKey?: boolean; ctrlKey?: boolean }; key?: string; shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; preventDefault?: () => void }) => {
                const k = e.nativeEvent?.key ?? e.key
                const mod = Boolean(e.metaKey || e.ctrlKey || e.nativeEvent?.metaKey || e.nativeEvent?.ctrlKey)
                if (k === 'Enter' && (settings.enterToSend === 'mod-enter' ? mod : !e.shiftKey)) {
                  e.preventDefault?.()
                  void submitObjective()
                }
              }}
            />

            <XStack items="center" justify="space-between">
              <XStack items="center" gap={10}>
                <XStack
                  {...press(() => {
                    const botHandle = roster.find((r) => r.bot)?.handle
                    setPrompt((p) => `${p}${p ? '\n' : ''}- [ ] ${botHandle ? `@${botHandle} ` : ''}`)
                  }, 'Add executable task')}
                  width={26}
                  height={26}
                  rounded={13}
                  items="center"
                  justify="center"
                  hoverStyle={{ background: paint.hover }}
                >
                  <Plus size={15} color={paint.mute} />
                </XStack>
                <XStack
                  {...press(() => {
                    const nextBot = roster.find((r) => r.bot)?.handle
                    if (nextBot) {
                      setPrompt((p) => `${p}${p && !p.endsWith(' ') ? ' ' : ''}@${nextBot} `)
                    }
                  }, 'Mention specialist')}
                  width={26}
                  height={26}
                  rounded={13}
                  items="center"
                  justify="center"
                  hoverStyle={{ background: paint.hover }}
                >
                  <AtSign size={15} color={paint.mute} />
                </XStack>
              </XStack>

              <XStack items="center" gap={12}>
                <Popover open={modelOpen} onOpenChange={setModelOpen} placement="top-end" allowFlip stayInFrame>
                  <Popover.Trigger asChild>
                    <XStack
                      {...press(() => setModelOpen((v) => !v), 'Choose model')}
                      height={28}
                      px={14}
                      rounded={14}
                      borderWidth={1}
                      items="center"
                      justify="center"
                      style={{ backgroundColor: paint.elevated, borderColor: paint.border }}
                      hoverStyle={{ background: paint.hover }}
                    >
                      <SizableText fontSize={12} fontWeight="500" style={{ color: paint.mute }}>
                        {composerModel}
                      </SizableText>
                    </XStack>
                  </Popover.Trigger>
                  <Popover.Content
                    role="menu"
                    borderWidth={1}
                    rounded={10}
                    p={6}
                    width={176}
                    style={{ backgroundColor: paint.sidebar, borderColor: paint.paneEdge, zIndex: 100000 }}
                  >
                    <YStack gap={2}>
                      {MODELS.map((m) => (
                        <XStack
                          key={m}
                          {...press(() => {
                            setComposerModel(m)
                            setModelOpen(false)
                          }, m)}
                          px={8}
                          py={5}
                          rounded={6}
                          hoverStyle={{ background: paint.hover }}
                        >
                          <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }}>
                            {m}
                          </SizableText>
                        </XStack>
                      ))}
                    </YStack>
                  </Popover.Content>
                </Popover>

                <SizableText
                  fontSize={12}
                  style={{
                    color: paint.dim,
                    fontFamily: settings.effortDisplay === 'bars' ? 'var(--font-mono)' : 'var(--font-sans)',
                  }}
                >
                  {effortLabel}
                </SizableText>

                <YStack
                  {...press(() => void submitObjective(), 'Submit')}
                  width={30}
                  height={30}
                  rounded={15}
                  items="center"
                  justify="center"
                  opacity={primaryChannel && prompt.trim() ? 1 : 0.6}
                  style={{ backgroundColor: paint.composerAccent }}
                  focusVisibleStyle={ring}
                >
                  <ArrowUp size={16} color={paint.composerAccentInk} />
                </YStack>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      </ScrollArea>
    </YStack>
  )
}

function MetricTile({
  count,
  label,
  onPress,
}: {
  count: string
  label: string
  onPress: () => void
}) {
  return (
    <YStack
      {...press(onPress, `${count} ${label}`)}
      flex={1}
      minW={156}
      px={20}
      py={16}
      gap={6}
      rounded={14}
      borderWidth={1}
      style={{ backgroundColor: paint.card, borderColor: paint.border }}
      hoverStyle={{ background: paint.elevated }}
      focusVisibleStyle={ring}
    >
      <SizableText fontSize={23} fontWeight="600" style={{ color: paint.ink }}>
        {count}
      </SizableText>
      <SizableText fontSize={12} style={{ color: paint.dim }}>
        {label}
      </SizableText>
    </YStack>
  )
}
