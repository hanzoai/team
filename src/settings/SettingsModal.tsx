import { useI18n } from '@hanzo/i18n/react'
import { Box, Dialog, DialogContent, DialogTitle, Input, SizableText, Text, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  CalendarClock,
  GitBranch,
  Info,
  Keyboard,
  MessageSquareText,
  Mic,
  Palette,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useSpace } from '~/data/space.tsx'
import { paint, rung } from '~/theme/theme.ts'
import { AppearancePanel } from './AppearancePanel.tsx'
import { billingUrl, useTeamSettings } from './preferences.ts'
import { getTauriInvoke, KbdBadge } from './settingsPrimitives.tsx'
import { AboutPanel, BridgesPanel, McpZapPanel, SharingAccessPanel } from './SystemPanels.tsx'
import {
  ChatThreadsPanel,
  DevicesPanel,
  GeneralPanel,
  KeybindingsPanel,
  ModelsProvidersPanel,
  ScheduledStandupsPanel,
  VoiceOfficePanel,
} from './WorkplacePanels.tsx'

export type CanonicalSettingsTab =
  | 'general'
  | 'appearance'
  | 'chat'
  | 'voice'
  | 'keybindings'
  | 'models'
  | 'standups'
  | 'devices'
  | 'bridges'
  | 'mcp'
  | 'access'
  | 'about'

export type SettingsTab =
  | CanonicalSettingsTab
  | 'account'
  | 'notifications'
  | 'node'
  | 'ai'

export type DockIconMode = 'branded' | 'minimal'

function normalizeSettingsTab(tab: SettingsTab): CanonicalSettingsTab {
  switch (tab) {
    case 'account':
      return 'access'
    case 'notifications':
      return 'general'
    case 'node':
      return 'mcp'
    case 'ai':
      return 'models'
    default:
      return tab
  }
}

type ModalListener = (tab: CanonicalSettingsTab | null) => void
const modalListeners = new Set<ModalListener>()
let activeModalTab: CanonicalSettingsTab | null = null

export function openSettingsModal(tab: SettingsTab = 'general') {
  activeModalTab = normalizeSettingsTab(tab)
  for (const fn of modalListeners) fn(activeModalTab)
}

export function closeSettingsModal() {
  activeModalTab = null
  for (const fn of modalListeners) fn(null)
}

type SettingsGroupHeading = 'Preferences' | 'Agents & Workplace' | 'Connections' | 'System'

type NavEntry = {
  id: CanonicalSettingsTab
  group: SettingsGroupHeading
  label: string
  keywords: string
  icon: typeof Settings2
}

export const SETTINGS_NAV_ITEMS: ReadonlyArray<NavEntry> = [
  // Preferences
  {
    id: 'general',
    group: 'Preferences',
    label: 'General',
    keywords: 'launch view startup desktop notifications default model enso effort workspace',
    icon: Settings2,
  },
  {
    id: 'appearance',
    group: 'Preferences',
    label: 'Appearance',
    keywords: 'theme zen clay light dark system density cozy compact width sidebar contrast solidness font typography animations dock icon',
    icon: Palette,
  },
  {
    id: 'chat',
    group: 'Preferences',
    label: 'Chat & Threads',
    keywords: 'enter to send effort bars word markdown math latex thread reply mattermost',
    icon: MessageSquareText,
  },
  {
    id: 'voice',
    group: 'Preferences',
    label: 'Voice & Office',
    keywords: 'roam virtual office audio video camera koe voice noise suppression krisp push to talk',
    icon: Mic,
  },
  {
    id: 'keybindings',
    group: 'Preferences',
    label: 'Keybindings',
    keywords: 'shortcuts keyboard hotkeys ctrl cmd quick switcher sidebar thread alt views',
    icon: Keyboard,
  },

  // Agents & Workplace
  {
    id: 'models',
    group: 'Agents & Workplace',
    label: 'Models & Providers',
    keywords: 'enso zen 6 coder ultra anthropic openai local bots @dev @cyber @ops @pm providers',
    icon: Bot,
  },
  {
    id: 'standups',
    group: 'Agents & Workplace',
    label: 'Scheduled Standups & Tasks',
    keywords: 'daily async standup digest ci alert routing incidents tasks schedule',
    icon: CalendarClock,
  },
  {
    id: 'devices',
    group: 'Agents & Workplace',
    label: 'Devices',
    keywords: 'phone mobile ios android download session desktop',
    icon: Smartphone,
  },

  // Connections
  {
    id: 'bridges',
    group: 'Connections',
    label: 'Bridges & Source Control',
    keywords: 'discord slack mattermost github linear webhooks federation',
    icon: GitBranch,
  },
  {
    id: 'mcp',
    group: 'Connections',
    label: 'MCP & ZAP',
    keywords: 'hip-0300 mcp servers local zap bus hanzod node 3690 blockchain 36963',
    icon: Server,
  },

  // System
  {
    id: 'access',
    group: 'System',
    label: 'Sharing & Access',
    keywords: 'invite link guest channels sso hanzo.id account billing pay sign out',
    icon: ShieldCheck,
  },
  {
    id: 'about',
    group: 'System',
    label: 'About',
    keywords: 'version 1.1.1 tauri v2 github license hanzo team',
    icon: Info,
  },
]

const NAV_GROUPS: readonly SettingsGroupHeading[] = [
  'Preferences',
  'Agents & Workplace',
  'Connections',
  'System',
]

export function SettingsModal(props: {
  user?: { name?: string; email?: string; owner?: string } | null
  orgName?: string
}) {
  const { t } = useI18n()
  const { current } = useSpace()
  const { updateSettings } = useTeamSettings()
  const [tab, setTab] = useState<CanonicalSettingsTab | null>(activeModalTab)
  const [filter, setFilter] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const fn: ModalListener = (next) => setTab(next)
    modalListeners.add(fn)
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __HANZO_OPEN_SETTINGS__?: typeof openSettingsModal }).__HANZO_OPEN_SETTINGS__ =
        openSettingsModal
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === ',') {
        e.preventDefault()
        openSettingsModal(activeModalTab ?? 'general')
        return
      }
      if (!activeModalTab) return
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null
        const inField =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        if (!inField) {
          e.preventDefault()
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        }
      } else if (e.key === 'Escape') {
        if (filter.trim()) {
          e.preventDefault()
          e.stopPropagation()
          setFilter('')
        } else {
          closeSettingsModal()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      modalListeners.delete(fn)
      window.removeEventListener('keydown', onKey)
    }
  }, [filter])

  useEffect(() => {
    const invoke = getTauriInvoke()
    if (!tab || !invoke) return
    invoke<string>('get_dock_icon_mode')
      .then((m) => updateSettings({ dockIcon: m === 'minimal' ? 'minimal' : 'branded' }))
      .catch(() => {})
  }, [tab, updateSettings])

  const activeSection: CanonicalSettingsTab = tab ?? 'general'
  const filteredNav = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return SETTINGS_NAV_ITEMS
    return SETTINGS_NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    )
  }, [filter])

  const activeMeta = SETTINGS_NAV_ITEMS.find((n) => n.id === activeSection) ?? SETTINGS_NAV_ITEMS[0]!
  const ActiveIcon = activeMeta.icon
  const userName = props.user?.name || 'Workspace Member'
  const orgPayHref = billingUrl(current?.org ?? props.user?.owner ?? 'hanzo')

  return (
    <Dialog open={tab !== null} onOpenChange={(open: boolean) => !open && closeSettingsModal()}>
      <DialogContent
        showCloseButton={false}
        data-slot="preferences-dialog"
        data-testid="hanzo-settings-modal"
        width="94vw"
        maxW={1020}
        height="86vh"
        maxH={760}
        p={0}
        gap={0}
        rounded={14}
        overflow="hidden"
        borderWidth={1}
        style={{
          backgroundColor: paint.settingsStage,
          borderColor: paint.settingsBorder,
        }}
      >
        <DialogTitle display="none">{t('Settings')}</DialogTitle>

        <XStack flex={1} minH={0} width="100%">
          {/* Left 232px Grouped Navigation Rail (matches Hanzo Dev SettingsSidebarNav) */}
          <YStack
            width={232}
            shrink={0}
            height="100%"
            borderRightWidth={1}
            style={{
              backgroundColor: paint.settingsNav,
              borderColor: paint.settingsBorder,
            }}
            data-testid="settings-sidebar-nav"
          >
            {/* Search settings + `/` shortcut */}
            <XStack px={10} pt={12} pb={8} shrink={0}>
              <XStack
                flex={1}
                height={32}
                px={9}
                gap={7}
                items="center"
                rounded={8}
                borderWidth={1}
                style={{
                  backgroundColor: paint.settingsCard,
                  borderColor: paint.settingsBorder,
                }}
              >
                <Search size={13} color={paint.mute} />
                <Input
                  ref={searchInputRef as never}
                  unstyled
                  value={filter}
                  onChange={(e: { target: { value: string } }) => setFilter(e.target.value)}
                  placeholder={t('Search settings')}
                  aria-label={t('Search settings')}
                  flex={1}
                  minW={0}
                  fontSize={12}
                  color="$color12"
                />
                {filter.trim() ? (
                  <Box
                    render={<button type="button" aria-label="Clear search" />}
                    onClick={() => {
                      setFilter('')
                      searchInputRef.current?.focus()
                    }}
                    cursor="pointer"
                    style={{ background: 'transparent', border: 'none', padding: 2, display: 'inline-flex' }}
                  >
                    <X size={12} color={paint.mute} />
                  </Box>
                ) : (
                  <KbdBadge keys="/" />
                )}
              </XStack>
            </XStack>

            {/* Grouped Navigation Items */}
            <YStack flex={1} minH={0} px={8} pb={10} gap={14} overflowY="auto">
              {filteredNav.length === 0 ? (
                <YStack py={20} px={8} items="center">
                  <SizableText fontSize={12} style={{ color: paint.dim }}>
                    No settings found
                  </SizableText>
                </YStack>
              ) : (
                NAV_GROUPS.map((grp) => {
                  const rows = filteredNav.filter((r) => r.group === grp)
                  if (rows.length === 0) return null
                  return (
                    <YStack key={grp} gap={2}>
                      <SizableText
                        fontSize={11}
                        fontWeight="600"
                        px={8}
                        py={2}
                        style={{ color: paint.dim, letterSpacing: 0.2 }}
                      >
                        {grp}
                      </SizableText>
                      {rows.map((row) => {
                        const Icon = row.icon
                        const isCurrent = row.id === activeSection
                        return (
                          <Box
                            key={row.id}
                            render={
                              <button
                                type="button"
                                aria-current={isCurrent ? 'page' : undefined}
                                data-testid={`settings-nav-${row.id}`}
                              />
                            }
                            onClick={() => setTab(row.id)}
                            px={9}
                            py={6.5}
                            rounded={7}
                            cursor="pointer"
                            style={{
                              border: 'none',
                              textAlign: 'left',
                              backgroundColor: isCurrent
                                ? paint.settingsRowActive
                                : 'transparent',
                            }}
                          >
                            <XStack items="center" gap={8} minW={0}>
                              <Icon
                                size={14}
                                color={isCurrent ? paint.accent : paint.mute}
                              />
                              <Text
                                fontSize={12.5}
                                fontWeight={isCurrent ? '600' : '500'}
                                numberOfLines={1}
                                style={{ color: isCurrent ? paint.ink : paint.mute, flex: 1 }}
                              >
                                {row.label}
                              </Text>
                            </XStack>
                          </Box>
                        )
                      })}
                    </YStack>
                  )
                })
              )}
            </YStack>

            {/* Bottom hanzo.id Identity & Billing Footer */}
            <XStack
              px={12}
              py={9}
              items="center"
              justify="space-between"
              gap={8}
              borderTopWidth={1}
              style={{ borderColor: paint.settingsBorder }}
            >
              <YStack flex={1} minW={0}>
                <Text fontSize={11.5} fontWeight="600" numberOfLines={1} style={{ color: paint.ink }}>
                  {userName}
                </Text>
                <Text fontSize={10.5} numberOfLines={1} style={{ color: paint.dim }}>
                  {`${props.orgName || 'Hanzo'} · hanzo.id`}
                </Text>
              </YStack>
              <Box
                render={<a href={orgPayHref} target="_blank" rel="noopener noreferrer" />}
                px={7}
                py={3}
                rounded={5}
                style={{
                  textDecoration: 'none',
                  border: `1px solid ${paint.settingsBorder}`,
                  backgroundColor: paint.settingsCard,
                }}
              >
                <Text fontSize={10.5} fontWeight="600" style={{ color: paint.mute }}>
                  Billing
                </Text>
              </Box>
            </XStack>
          </YStack>

          {/* Right Scrollable Content Column */}
          <YStack
            flex={1}
            minW={0}
            minH={0}
            height="100%"
            style={{ backgroundColor: paint.settingsStage }}
          >
            {/* 48px Crisp Top Section Bar */}
            <XStack
              height={48}
              px={22}
              items="center"
              justify="space-between"
              borderBottomWidth={1}
              shrink={0}
              style={{ borderColor: paint.settingsBorder }}
            >
              <XStack items="center" gap={8}>
                <ActiveIcon size={15} color={paint.accent} />
                <SizableText size={rung.row} fontWeight="600" style={{ color: paint.ink }}>
                  {activeMeta.label}
                </SizableText>
                <Text fontSize={11.5} style={{ color: paint.dim }}>
                  {`· ${activeMeta.group}`}
                </Text>
              </XStack>

              <Box
                render={<button type="button" aria-label={t('Close')} data-testid="settings-close-btn" />}
                onClick={closeSettingsModal}
                width={28}
                height={28}
                rounded={7}
                items="center"
                justify="center"
                cursor="pointer"
                style={{
                  border: `1px solid ${paint.settingsBorder}`,
                  backgroundColor: paint.settingsCard,
                  display: 'inline-flex',
                }}
              >
                <X size={14} color={paint.accent} />
              </Box>
            </XStack>

            {/* Scrollable Settings Cards Container */}
            <YStack flex={1} minH={0} p={24} overflowY="auto">
              <YStack width="100%" maxW={720} style={{ marginInline: 'auto' }}>
                {activeSection === 'general' ? <GeneralPanel /> : null}
                {activeSection === 'appearance' ? <AppearancePanel /> : null}
                {activeSection === 'chat' ? <ChatThreadsPanel /> : null}
                {activeSection === 'voice' ? <VoiceOfficePanel /> : null}
                {activeSection === 'keybindings' ? <KeybindingsPanel /> : null}
                {activeSection === 'models' ? <ModelsProvidersPanel /> : null}
                {activeSection === 'standups' ? <ScheduledStandupsPanel /> : null}
                {activeSection === 'devices' ? <DevicesPanel /> : null}
                {activeSection === 'bridges' ? <BridgesPanel /> : null}
                {activeSection === 'mcp' ? <McpZapPanel /> : null}
                {activeSection === 'access' ? <SharingAccessPanel onCloseModal={closeSettingsModal} /> : null}
                {activeSection === 'about' ? <AboutPanel /> : null}
              </YStack>
            </YStack>
          </YStack>
        </XStack>
      </DialogContent>
    </Dialog>
  )
}
