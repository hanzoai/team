import { useEffect, useState, type ReactNode } from 'react'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { Bot, Check, Monitor, Moon, Palette, Settings, Sliders, Sun, UserRound, X } from '@hanzogui/lucide-icons-2'

import { press } from '~/shell/press.ts'
import { paint, round, rung } from '~/theme/theme.ts'
import {
  useHanzoPreferences,
  type HanzoApprovalMode,
  type HanzoDensityPreference,
  type HanzoEffortPreference,
  type HanzoFontPreference,
  type HanzoThemePreference,
} from './preferences.ts'

export type SettingsTab = 'general' | 'appearance' | 'ai' | 'account'

type ModalListener = (tab: SettingsTab | null) => void
const modalListeners = new Set<ModalListener>()
let activeTab: SettingsTab | null = null

export function openSettingsModal(tab: SettingsTab = 'general') {
  activeTab = tab
  for (const fn of modalListeners) fn(activeTab)
}

export function closeSettingsModal() {
  activeTab = null
  for (const fn of modalListeners) fn(null)
}

const TABS: readonly { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI & Agents', icon: Bot },
  { id: 'account', label: 'Account & Org', icon: UserRound },
]

export function SettingsModal({
  user,
  orgName,
}: {
  user?: { name?: string; email?: string; owner?: string } | null
  orgName?: string
}) {
  const [tab, setTab] = useState<SettingsTab | null>(activeTab)
  const { appearance, chat, setAppearance, setChat } = useHanzoPreferences()

  useEffect(() => {
    const fn: ModalListener = (next) => setTab(next)
    modalListeners.add(fn)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettingsModal(activeTab ?? 'general')
      } else if (e.key === 'Escape' && activeTab) {
        closeSettingsModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      modalListeners.delete(fn)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!tab) return null

  return (
    <YStack
      position="fixed"
      t={0}
      l={0}
      r={0}
      b={0}
      items="center"
      justify="center"
      p={16}
      style={{ backgroundColor: 'var(--overlay, var(--team-ground))', zIndex: 100020 }}
      data-testid="team-settings-modal"
      onPress={() => closeSettingsModal()}
    >
      <XStack
        width="100%"
        maxW={680}
        minH={430}
        maxH="86vh"
        rounded={14}
        borderWidth={1}
        overflow="hidden"
        style={{ backgroundColor: paint.card, borderColor: paint.sidebarRule }}
        onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
      >
        {/* Left Navigation Column */}
        <YStack
          width={190}
          shrink={0}
          p={12}
          gap={4}
          borderRightWidth={1}
          style={{ backgroundColor: paint.sidebar, borderRightColor: paint.sidebarRule }}
        >
          <XStack px={8} py={6} items="center" justify="space-between">
            <SizableText fontSize={rung.row} fontWeight="600" color="$ink">
              Settings
            </SizableText>
          </XStack>

          {TABS.map((item) => {
            const Icon = item.icon
            const selected = tab === item.id
            return (
              <XStack
                key={item.id}
                {...press(() => setTab(item.id), item.label)}
                height={32}
                px={10}
                gap={9}
                rounded={8}
                items="center"
                style={selected ? { backgroundColor: paint.rowActive } : undefined}
                hoverStyle={{ bg: '$hover' }}
                data-testid={`settings-tab-${item.id}`}
              >
                <Icon size={15} color={selected ? '$ink' : '$soft'} />
                <SizableText
                  fontSize={rung.small}
                  fontWeight={selected ? '600' : '400'}
                  color={selected ? '$ink' : '$quiet'}
                >
                  {item.label}
                </SizableText>
              </XStack>
            )
          })}
        </YStack>

        {/* Right Settings Content */}
        <YStack flex={1} minW={0} p={20} gap={18} style={{ overflowY: 'auto' }}>
          <XStack items="center" justify="space-between">
            <SizableText fontSize="$5" fontWeight="600" color="$ink">
              {TABS.find((t) => t.id === tab)?.label}
            </SizableText>
            <YStack
              {...press(() => closeSettingsModal(), 'Close settings')}
              width={28}
              height={28}
              rounded={round.field}
              items="center"
              justify="center"
              hoverStyle={{ bg: '$hover' }}
              data-testid="close-settings-modal"
            >
              <X size={16} color="$soft" />
            </YStack>
          </XStack>

          {tab === 'general' ? (
            <YStack gap={16}>
              <RowBlock
                title="Approval mode"
                description="Control whether workspace agents and channel tools execute automatically or ask before running."
              >
                <SegmentGroup<HanzoApprovalMode>
                  value={chat.approvalMode}
                  onChange={(approvalMode) => setChat({ approvalMode })}
                  options={[
                    { value: 'auto', label: 'Full access' },
                    { value: 'manual', label: 'Manual approval' },
                  ]}
                />
              </RowBlock>

              <RowBlock
                title="Default reasoning effort"
                description="Shared across Hanzo App, Hanzo Bot, and Hanzo Team agent threads."
              >
                <SegmentGroup<HanzoEffortPreference>
                  value={chat.effort}
                  onChange={(effort) => setChat({ effort })}
                  options={[
                    { value: 'low', label: 'Light' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                />
              </RowBlock>

              <RowBlock
                title="Spoken language"
                description="Preferred language for voice transcription and spoken replies."
              >
                <SegmentGroup<string>
                  value={chat.spokenLanguage}
                  onChange={(spokenLanguage) => setChat({ spokenLanguage })}
                  options={[
                    { value: 'auto', label: 'Auto-detect' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </RowBlock>
            </YStack>
          ) : null}

          {tab === 'appearance' ? (
            <YStack gap={16}>
              <RowBlock
                title="Theme"
                description="Synced across Hanzo surfaces on this browser."
              >
                <SegmentGroup<HanzoThemePreference>
                  value={appearance.theme}
                  onChange={(theme) => setAppearance({ theme })}
                  options={[
                    { value: 'dark', label: 'Dark', icon: <Moon size={13} color="$ink" /> },
                    { value: 'light', label: 'Light', icon: <Sun size={13} color="$ink" /> },
                    { value: 'system', label: 'System', icon: <Monitor size={13} color="$ink" /> },
                  ]}
                />
              </RowBlock>

              <RowBlock
                title="Text size"
                description="Adjust interface and conversation typography scale."
              >
                <SegmentGroup<HanzoFontPreference>
                  value={appearance.font}
                  onChange={(font) => setAppearance({ font })}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'default', label: 'Default' },
                    { value: 'large', label: 'Large' },
                  ]}
                />
              </RowBlock>

              <RowBlock
                title="Density"
                description="Control row and message spacing across channels and boards."
              >
                <SegmentGroup<HanzoDensityPreference>
                  value={appearance.density}
                  onChange={(density) => setAppearance({ density })}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'default', label: 'Default' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                />
              </RowBlock>
            </YStack>
          ) : null}

          {tab === 'ai' ? (
            <YStack gap={16}>
              <RowBlock
                title="Third-party model routing"
                description="Allow routing fallback requests to external frontier providers alongside Zen models."
              >
                <SegmentGroup<'on' | 'off'>
                  value={chat.allowThirdPartyModels ? 'on' : 'off'}
                  onChange={(v) => setChat({ allowThirdPartyModels: v === 'on' })}
                  options={[
                    { value: 'on', label: 'Enabled' },
                    { value: 'off', label: 'Zen only' },
                  ]}
                />
              </RowBlock>

              <RowBlock
                title="Autonomous 24/7 fleet"
                description="All 23 workspace agents share your active approval mode and reasoning effort defaults."
              >
                <XStack items="center" gap={6}>
                  <Check size={14} color="$ink" />
                  <SizableText fontSize={rung.small} color="$quiet">
                    Synced with hanzo.app & hanzo.bot
                  </SizableText>
                </XStack>
              </RowBlock>
            </YStack>
          ) : null}

          {tab === 'account' ? (
            <YStack gap={14}>
              <RowBlock
                title="Signed-in account"
                description={user?.email || 'Connected via Hanzo IAM'}
              >
                <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
                  {user?.name || 'Zach Kelling'}
                </SizableText>
              </RowBlock>

              <RowBlock
                title="Active organization"
                description="Workspace channels, Tracker boards, and CRM cohorts follow this organization."
              >
                <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
                  {orgName || 'Hanzo AI'}
                </SizableText>
              </RowBlock>
            </YStack>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  )
}

function RowBlock({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <YStack
      gap={10}
      pb={14}
      borderBottomWidth={1}
      style={{ borderBottomColor: paint.sidebarRule }}
    >
      <YStack gap={3}>
        <SizableText fontSize={rung.body} fontWeight="600" color="$ink">
          {title}
        </SizableText>
        <SizableText fontSize={rung.small} color="$quiet">
          {description}
        </SizableText>
      </YStack>
      <XStack flexWrap="wrap" gap={6}>
        {children}
      </XStack>
    </YStack>
  )
}

function SegmentGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  onChange: (next: T) => void
}) {
  return (
    <XStack
      p={3}
      gap={3}
      rounded={9}
      borderWidth={1}
      style={{ backgroundColor: paint.sidebar, borderColor: paint.sidebarRule }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <XStack
            key={opt.value}
            {...press(() => onChange(opt.value), opt.label)}
            height={28}
            px={11}
            gap={6}
            rounded={7}
            items="center"
            justify="center"
            style={active ? { backgroundColor: paint.railActive } : undefined}
            hoverStyle={{ bg: '$hover' }}
          >
            {opt.icon}
            <SizableText
              fontSize={rung.small}
              fontWeight={active ? '600' : '400'}
              color={active ? '$ink' : '$quiet'}
            >
              {opt.label}
            </SizableText>
          </XStack>
        )
      })}
    </XStack>
  )
}
