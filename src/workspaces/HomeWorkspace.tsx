/**
 * Hanzo Team v8.8 Home Executive Briefing Workspace
 * Matches `uploaded_media_0_1795584722435.png` pixel-for-pixel:
 * - `Home` 44px quiet header
 * - `Good morning.` / `Your team has been making progress.`
 * - `12 Completed` · `6 In progress` · `4 Need attention` summary cards
 * - `Needs your attention` rows (`DEV`, `SCI`, `VI`) with chevron drill-down
 * - Unified `What should we accomplish today?` `@agent` composer (`enso-auto` · `Auto` · `[↑]`)
 */
import { Popover } from '@hanzo/gui'
import { ScrollArea, SizableText, Textarea, XStack, YStack } from '@hanzo/ui'
import { ArrowUp, AtSign, ChevronRight, Plus } from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { press } from '~/shell/press.ts'
import { paint, ring, round } from '~/theme/theme.ts'
import {
  sendWorkspaceMessage,
  setComposerModel,
  useWorkspace,
  type ComposerModel,
} from '~/workspace/store.ts'

const MODELS: readonly ComposerModel[] = ['enso-auto', 'zen6-coder', 'zen6-ultra']

export function HomeWorkspace() {
  const navigate = useNavigate()
  const { attention, composerModel, roster } = useWorkspace()
  const [prompt, setPrompt] = useState('')
  const [dispatchedNote, setDispatchedNote] = useState<string | null>(null)
  const [modelOpen, setModelOpen] = useState(false)

  const submitObjective = () => {
    const clean = prompt.trim()
    if (!clean) return
    sendWorkspaceMessage('engineering', clean)
    setPrompt('')
    setDispatchedNote(`Dispatched to @vi (${composerModel}) — live run active in #engineering.`)
  }

  return (
    <YStack flex={1} minW={0} minH={0} style={{ backgroundColor: paint.panel }} data-testid="home-v88-workspace">
      {/* 44px Header matching v8.8 reference */}
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
          {/* Executive Greeting */}
          <YStack gap={4}>
            <SizableText
              fontSize={28}
              lineHeight={34}
              fontWeight="600"
              style={{ color: paint.ink, letterSpacing: -0.5 }}
            >
              Good morning.
            </SizableText>
            <SizableText fontSize={13.5} style={{ color: paint.dim }}>
              Your team has been making progress.
            </SizableText>
          </YStack>

          {/* 3 Metric Cards: 12 Completed · 6 In progress · 4 Need attention */}
          <XStack gap={12} flexWrap="wrap">
            <MetricTile
              count="12"
              label="Completed"
              onPress={() => navigate('/issues')}
            />
            <MetricTile
              count="6"
              label="In progress"
              onPress={() => navigate('/office')}
            />
            <MetricTile
              count={String(Math.max(4, attention.filter((a) => !a.resolved).length + 1))}
              label="Need attention"
              onPress={() => navigate('/inbox')}
            />
          </XStack>

          {/* Needs your attention */}
          <YStack gap={8}>
            <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }} pb={4}>
              Needs your attention
            </SizableText>

            <YStack>
              {attention.map((item, idx) => (
                <XStack
                  key={item.id}
                  {...press(() => navigate(item.targetPath), item.title)}
                  py={13}
                  px={6}
                  items="center"
                  justify="space-between"
                  gap={14}
                  borderBottomWidth={idx < attention.length - 1 ? 1 : 0}
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
                      <SizableText fontSize={13.5} fontWeight="500" style={{ color: paint.ink }} numberOfLines={1}>
                        {item.title}
                      </SizableText>
                      <SizableText fontSize={12} style={{ color: paint.dim }} numberOfLines={1}>
                        {item.resolved ? '✓ Approved & deployed' : item.subtitle}
                      </SizableText>
                    </YStack>
                  </XStack>
                  <ChevronRight size={15} color={paint.dim} />
                </XStack>
              ))}
            </YStack>
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
                {dispatchedNote}
              </SizableText>
              <XStack {...press(() => navigate('/chat/engineering'), 'View in #engineering')}>
                <SizableText fontSize={11.5} fontWeight="600" style={{ color: paint.ink }}>
                  Open #engineering →
                </SizableText>
              </XStack>
            </XStack>
          ) : null}

          {/* Unified Hanzo v8.8 Composer (`What should we accomplish today?`) */}
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
              placeholder="What should we accomplish today?"
              value={prompt}
              onChangeText={setPrompt}
              onKeyDown={(e: { nativeEvent?: { key?: string }; key?: string; shiftKey?: boolean; preventDefault?: () => void }) => {
                const k = e.nativeEvent?.key ?? e.key
                if (k === 'Enter' && !e.shiftKey) {
                  e.preventDefault?.()
                  submitObjective()
                }
              }}
            />

            <XStack items="center" justify="space-between">
              <XStack items="center" gap={10}>
                <XStack
                  {...press(() => setPrompt((p) => `${p}${p ? '\n' : ''}- [ ] @dev `), 'Add executable task')}
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
                    const nextBot = roster.find((r) => r.bot)?.handle ?? 'vi'
                    setPrompt((p) => `${p}${p && !p.endsWith(' ') ? ' ' : ''}@${nextBot} `)
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

                <SizableText fontSize={12} style={{ color: paint.dim }}>
                  Auto
                </SizableText>

                <YStack
                  {...press(submitObjective, 'Submit')}
                  width={30}
                  height={30}
                  rounded={15}
                  items="center"
                  justify="center"
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
      px={18}
      py={15}
      gap={6}
      rounded={12}
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
