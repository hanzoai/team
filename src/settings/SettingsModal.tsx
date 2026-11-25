import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '@hanzo/i18n/react'
import { Box, Button, Dialog, DialogContent, DialogTitle, Input, SizableText, Text, XStack, YStack } from '@hanzo/ui'
import {
  Bell,
  ChartNoAxesColumn,
  Check,
  Cpu,
  Info,
  Keyboard,
  Palette,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react'

import { brand } from '~/data/brand.ts'
import { isMacDesktop } from '~/data/desktop.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { TEAM_SHORTCUTS } from '~/shell/unified.ts'
import { paint, round, rung } from '~/theme/theme.ts'
import {
  useHanzoPreferences,
  type HanzoDensityPreference,
  type HanzoEffortPreference,
  type HanzoFontPreference,
  type HanzoThemePreference,
} from './preferences.ts'

export type SettingsTab =
  | 'general'
  | 'account'
  | 'appearance'
  | 'notifications'
  | 'node'
  | 'ai'
  | 'keybindings'
  | 'about'

export type DockIconMode = 'branded' | 'minimal'

type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>

interface TauriWindowLike {
  __TAURI__?: { core?: { invoke?: TauriInvoke } }
  __TAURI_INTERNALS__?: { invoke?: TauriInvoke }
}

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as TauriWindowLike
  return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null
}

type ModalListener = (tab: SettingsTab | null) => void
const modalListeners = new Set<ModalListener>()
let activeModalTab: SettingsTab | null = null

export function openSettingsModal(tab: SettingsTab = 'general') {
  activeModalTab = tab === 'ai' ? 'node' : tab
  for (const fn of modalListeners) fn(activeModalTab)
}

export function closeSettingsModal() {
  activeModalTab = null
  for (const fn of modalListeners) fn(null)
}

type NavEntry = {
  id: Exclude<SettingsTab, 'ai'>
  group: 'Workspace' | 'Compute & AI' | 'System'
  label: string
  keywords: string
  icon: typeof Settings
}

const NAV_ITEMS: ReadonlyArray<NavEntry> = [
  { id: 'general', group: 'Workspace', label: 'General', keywords: 'language effort dock icon workspace', icon: Settings },
  { id: 'account', group: 'Workspace', label: 'Account & Usage', keywords: 'account billing usage credits org sign out', icon: ChartNoAxesColumn },
  { id: 'appearance', group: 'Workspace', label: 'Appearance', keywords: 'theme dark light system font density', icon: Palette },
  { id: 'notifications', group: 'Workspace', label: 'Notifications', keywords: 'mentions alerts badges sound', icon: Bell },
  { id: 'node', group: 'Compute & AI', label: 'Local Models & Node', keywords: 'hanzod local ai inference blockchain validator 36963 rpc', icon: Cpu },
  { id: 'keybindings', group: 'System', label: 'Keybindings', keywords: 'shortcuts keyboard hotkeys ctrl', icon: Keyboard },
  { id: 'about', group: 'System', label: 'About', keywords: 'version hanzo team license', icon: Info },
]

function SettingsGroupCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <YStack gap={8} width="100%">
      <YStack gap={2} px={2}>
        <SizableText size={rung.body} fontWeight="600" color={paint.ink}>
          {title}
        </SizableText>
        {description ? (
          <SizableText size={rung.small} color={paint.mute}>
            {description}
          </SizableText>
        ) : null}
      </YStack>
      <YStack
        rounded={12}
        borderWidth={1}
        overflow="hidden"
        style={{ backgroundColor: 'var(--surface-1, #0f0f12)', borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))' }}
      >
        {children}
      </YStack>
    </YStack>
  )
}

function SettingsRowItem({
  title,
  description,
  last = false,
  right,
}: {
  title: string
  description?: string
  last?: boolean
  right?: ReactNode
}) {
  return (
    <XStack
      px={16}
      py={13}
      gap={16}
      items="center"
      justify="space-between"
      borderBottomWidth={last ? 0 : 1}
      style={{ borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))' }}
    >
      <YStack gap={2} flex={1} minW={0}>
        <SizableText size={rung.body} fontWeight="500" color={paint.ink}>
          {title}
        </SizableText>
        {description ? (
          <SizableText size={rung.small} color={paint.mute}>
            {description}
          </SizableText>
        ) : null}
      </YStack>
      {right ? <XStack shrink={0} items="center" gap={6}>{right}</XStack> : null}
    </XStack>
  )
}

function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <XStack
      p={3}
      gap={3}
      rounded={9}
      borderWidth={1}
      style={{ backgroundColor: 'var(--surface-2, #141418)', borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))' }}
    >
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <Box
            key={opt.id}
            render={<button type="button" aria-pressed={active} />}
            onClick={() => onChange(opt.id)}
            px={10}
            py={4}
            rounded={6}
            cursor="pointer"
            style={{
              backgroundColor: active ? 'var(--secondary, #222227)' : 'transparent',
              border: 'none',
            }}
          >
            <XStack items="center" gap={5}>
              <Text fontSize={12} fontWeight={active ? '600' : '500'} color={active ? '$color12' : '$color10'}>
                {opt.label}
              </Text>
              {active ? <Check size={11} color="var(--primary, #fafafa)" /> : null}
            </XStack>
          </Box>
        )
      })}
    </XStack>
  )
}

function NodeAndBlockchainSection() {
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null)
  const [nodeVersion, setNodeVersion] = useState<string>('hanzod :3690')
  const [blockHeight, setBlockHeight] = useState<string>('—')
  const [chainRpcStatus, setChainRpcStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [busy, setBusy] = useState(false)

  const refreshTelemetry = async () => {
    setBusy(true)
    const invoke = getTauriInvoke()
    try {
      if (invoke) {
        const status = await invoke<{ running?: boolean; endpoint?: string; version?: string }>('team_hanzod_status')
        setNodeOnline(Boolean(status?.running))
        if (status?.version) setNodeVersion(status.version)
      } else {
        const res = await fetch('http://127.0.0.1:3690/health', { method: 'GET' }).catch(() => null)
        setNodeOnline(Boolean(res?.ok))
      }
    } catch {
      setNodeOnline(false)
    }

    try {
      const rpcRes = await fetch('https://rpc.hanzo.ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      }).catch(() => null)
      if (rpcRes?.ok) {
        const body = (await rpcRes.json()) as { result?: string }
        if (typeof body.result === 'string' && body.result.startsWith('0x')) {
          setBlockHeight(`#${parseInt(body.result, 16).toLocaleString()}`)
          setChainRpcStatus('online')
        } else {
          setChainRpcStatus('offline')
        }
      } else {
        setChainRpcStatus('offline')
      }
    } catch {
      setChainRpcStatus('offline')
    }
    setBusy(false)
  }

  useEffect(() => {
    void refreshTelemetry()
  }, [])

  const toggleLocalNode = async (up: boolean) => {
    const invoke = getTauriInvoke()
    if (!invoke) return
    setBusy(true)
    try {
      await invoke(up ? 'team_hanzod_cluster_up' : 'team_hanzod_cluster_down')
    } catch {
      /* non-fatal */
    }
    await refreshTelemetry()
  }

  return (
    <YStack gap={20} width="100%">
      <SettingsGroupCard
        title="Hanzo Node & Local Private AI"
        description="On-device OpenAI-compatible inference router and embedded hanzod worker daemon."
      >
        <SettingsRowItem
          title="Hanzo Node daemon (127.0.0.1:3690)"
          description={nodeOnline ? `Online · ${nodeVersion}` : 'Stopped · Local inference starts on demand'}
          right={
            <XStack items="center" gap={8}>
              <Box
                width={8}
                height={8}
                rounded={999}
                style={{
                  backgroundColor: nodeOnline
                    ? 'var(--state-success, #22c55e)'
                    : 'var(--text-tertiary, #71717a)',
                }}
              />
              {getTauriInvoke() ? (
                <Button
                  size="sm"
                  variant="outline"
                  rounded={round.field}
                  disabled={busy}
                  onPress={() => void toggleLocalNode(!nodeOnline)}
                >
                  <SizableText size={rung.small} color={paint.ink}>
                    {nodeOnline ? 'Stop node' : 'Start node'}
                  </SizableText>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" rounded={round.field} disabled={busy} onPress={() => void refreshTelemetry()}>
                <RefreshCw size={12} color="var(--primary, #fafafa)" />
              </Button>
            </XStack>
          }
        />
        <SettingsRowItem
          last
          title="Local Private AI Inference"
          description="Routes Zen / GGUF / MLX models locally via http://127.0.0.1:3690/v1 with zero cloud data egress."
          right={
            <SizableText size={rung.small} fontWeight="600" color={paint.mute}>
              127.0.0.1:3690/v1
            </SizableText>
          }
        />
      </SettingsGroupCard>

      <SettingsGroupCard
        title="Blockchain Validator Console"
        description="Hanzo Network Mainnet Sovereign AI L1 telemetry and validator RPC endpoint."
      >
        <SettingsRowItem
          title="Network & Chain ID"
          description="Hanzo Mainnet (Chain ID 36963 · Sovereign AI EVM)"
          right={
            <SizableText size={rung.small} fontWeight="600" color={paint.ink}>
              36963
            </SizableText>
          }
        />
        <SettingsRowItem
          last
          title="Live Block Height (eth_blockNumber)"
          description="Queried directly from https://rpc.hanzo.ai JSON-RPC"
          right={
            <XStack items="center" gap={8}>
              <Box
                width={8}
                height={8}
                rounded={999}
                style={{
                  backgroundColor:
                    chainRpcStatus === 'online'
                      ? 'var(--state-success, #22c55e)'
                      : 'var(--text-tertiary, #71717a)',
                }}
              />
              <SizableText size={rung.small} fontWeight="600" color={paint.ink}>
                {blockHeight}
              </SizableText>
            </XStack>
          }
        />
      </SettingsGroupCard>
    </YStack>
  )
}

export function SettingsModal(_props: {
  user?: { name?: string; email?: string; owner?: string } | null
  orgName?: string
}) {
  const { t } = useI18n()
  const { who, guest, depart, leave } = useSession()
  const { current } = useSpace()
  const { appearance, chat, setAppearance, setChat } = useHanzoPreferences()
  const [tab, setTab] = useState<SettingsTab | null>(activeModalTab)
  const [filter, setFilter] = useState('')
  const [dockMode, setDockMode] = useState<DockIconMode>('branded')
  const [desktopNotifs, setDesktopNotifs] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem('hanzo.team.notifs') !== 'off'
    } catch {
      return true
    }
  })

  useEffect(() => {
    const fn: ModalListener = (next) => setTab(next)
    modalListeners.add(fn)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettingsModal(activeModalTab ?? 'general')
      } else if (e.key === 'Escape' && activeModalTab) {
        closeSettingsModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      modalListeners.delete(fn)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    const invoke = getTauriInvoke()
    if (!tab || !invoke) return
    invoke<string>('get_dock_icon_mode')
      .then((m) => setDockMode(m === 'minimal' ? 'minimal' : 'branded'))
      .catch(() => {})
  }, [tab])

  const activeSection: Exclude<SettingsTab, 'ai'> = tab === 'ai' || !tab ? 'general' : tab
  const filteredNav = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return NAV_ITEMS
    return NAV_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.keywords.includes(q),
    )
  }, [filter])

  const groups = ['Workspace', 'Compute & AI', 'System'] as const
  const activeMeta = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0]

  return (
    <Dialog open={tab !== null} onOpenChange={(open: boolean) => !open && closeSettingsModal()}>
      <DialogContent
        data-slot="preferences-dialog"
        width="94vw"
        maxW={960}
        height="84vh"
        maxH={720}
        p={0}
        gap={0}
        rounded={14}
        overflow="hidden"
        borderWidth={1}
        style={{
          backgroundColor: 'var(--pane-fill, #0f0f12)',
          borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))',
        }}
      >
        <DialogTitle display="none">{t('Settings')}</DialogTitle>
        <XStack flex={1} minH={0} width="100%">
          {/* Left SettingsSidebarNav (matches Hanzo Dev SettingsSidebarNav) */}
          <YStack
            width={236}
            shrink={0}
            height="100%"
            borderRightWidth={1}
            style={{
              backgroundColor: 'var(--side-fill, #09090b)',
              borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))',
            }}
          >
            <XStack px={12} pt={12} pb={8} shrink={0}>
              <XStack
                flex={1}
                height={32}
                px={10}
                gap={7}
                items="center"
                rounded={8}
                borderWidth={1}
                style={{
                  backgroundColor: 'var(--surface-1, #0f0f12)',
                  borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))',
                }}
              >
                <Search size={13} color="var(--text-secondary, #a1a1aa)" />
                <Input
                  unstyled
                  value={filter}
                  onChange={(e: { target: { value: string } }) => setFilter(e.target.value)}
                  placeholder={t('Search settings')}
                  aria-label={t('Search settings')}
                  flex={1}
                  minW={0}
                  fontSize={12.5}
                  color="$color12"
                />
              </XStack>
            </XStack>

            <YStack flex={1} minH={0} px={8} pb={12} gap={12} overflowY="auto">
              {groups.map((grp) => {
                const rows = filteredNav.filter((r) => r.group === grp)
                if (rows.length === 0) return null
                return (
                  <YStack key={grp} gap={2}>
                    <SizableText size={rung.small} fontWeight="600" color={paint.mute} px={8} py={3}>
                      {grp}
                    </SizableText>
                    {rows.map((row) => {
                      const Icon = row.icon
                      const isCurrent = row.id === activeSection
                      return (
                        <Box
                          key={row.id}
                          render={<button type="button" />}
                          onClick={() => setTab(row.id)}
                          px={10}
                          py={7}
                          rounded={8}
                          cursor="pointer"
                          style={{
                            border: 'none',
                            textAlign: 'left',
                            backgroundColor: isCurrent
                              ? 'var(--shell-row-active, #24242a)'
                              : 'transparent',
                          }}
                        >
                          <XStack items="center" gap={9}>
                            <Icon
                              size={15}
                              color={
                                isCurrent
                                  ? 'var(--primary, #fafafa)'
                                  : 'var(--text-secondary, #a1a1aa)'
                              }
                            />
                            <SizableText
                              size={rung.body}
                              fontWeight={isCurrent ? '600' : '500'}
                              color={isCurrent ? paint.ink : paint.mute}
                            >
                              {row.label}
                            </SizableText>
                          </XStack>
                        </Box>
                      )
                    })}
                  </YStack>
                )
              })}
            </YStack>
          </YStack>

          {/* Right Grouped Content Pane */}
          <YStack flex={1} minW={0} minH={0} height="100%">
            <XStack
              height={48}
              px={20}
              items="center"
              justify="space-between"
              borderBottomWidth={1}
              shrink={0}
              style={{ borderColor: 'var(--pane-edge, rgba(255, 255, 255, 0.08))' }}
            >
              <SizableText size={rung.row} fontWeight="600" color={paint.ink}>
                {activeMeta.label}
              </SizableText>
              <Box
                render={<button type="button" aria-label={t('Close')} />}
                onClick={closeSettingsModal}
                width={28}
                height={28}
                rounded={7}
                items="center"
                justify="center"
                cursor="pointer"
                style={{
                  border: '1px solid var(--pane-edge, rgba(255, 255, 255, 0.08))',
                  backgroundColor: 'var(--surface-2, #141418)',
                  display: 'inline-flex',
                }}
              >
                <X size={14} color="var(--primary, #fafafa)" />
              </Box>
            </XStack>

            <YStack flex={1} minH={0} p={24} gap={20} overflowY="auto">
              {activeSection === 'general' ? (
                <>
                  <SettingsGroupCard title="Workspace" description="Default workspace and AI teammate behavior.">
                    <SettingsRowItem
                      title="Active workspace"
                      description="Organization space currently open in this window."
                      right={
                        <SizableText size={rung.body} fontWeight="600" color={paint.ink}>
                          {current?.name ?? 'Local Workspace'}
                        </SizableText>
                      }
                    />
                    <SettingsRowItem
                      last={!getTauriInvoke()}
                      title="AI teammate reasoning effort"
                      description="Default reasoning depth for @hanzo and channel bots."
                      right={
                        <SegmentedChoice<HanzoEffortPreference>
                          value={chat.effort}
                          options={[
                            { id: 'low', label: 'Low' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'high', label: 'High' },
                          ]}
                          onChange={(effort) => setChat({ effort })}
                        />
                      }
                    />
                    {getTauriInvoke() ? (
                      <SettingsRowItem
                        last
                        title="Dock icon"
                        description="Choose between the branded squircle and minimal Dock icon."
                        right={
                          <SegmentedChoice<DockIconMode>
                            value={dockMode}
                            options={[
                              { id: 'branded', label: 'Branded' },
                              { id: 'minimal', label: 'Minimal' },
                            ]}
                            onChange={(next) => {
                              setDockMode(next)
                              void getTauriInvoke()?.('set_dock_icon_mode', { mode: next })
                            }}
                          />
                        }
                      />
                    ) : null}
                  </SettingsGroupCard>
                </>
              ) : null}

              {activeSection === 'account' ? (
                <>
                  <SettingsGroupCard title="Hanzo Account" description="Unified identity across Hanzo Team, Hanzo Dev, and Hanzo Cloud.">
                    <SettingsRowItem
                      title={guest ? 'Local Workspace (Not signed in)' : (who?.label || who?.name || 'Signed in')}
                      description={guest ? 'Sign in with Hanzo to sync channels, issues, docs, and cloud usage.' : (who?.email ?? current?.org ?? 'Hanzo IAM')}
                      right={
                        <XStack items="center" gap={8}>
                          {guest ? (
                            <Button size="sm" rounded={round.pill} bg={paint.ink} onPress={() => { closeSettingsModal(); leave() }}>
                              <SizableText size={rung.small} color={paint.ground} fontWeight="600">
                                Sign in
                              </SizableText>
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" rounded={round.pill} onPress={() => void depart('another')}>
                                <SizableText size={rung.small} color={paint.ink}>Switch account</SizableText>
                              </Button>
                              <Button size="sm" variant="outline" rounded={round.pill} onPress={leave}>
                                <SizableText size={rung.small} color={paint.ink}>Sign out</SizableText>
                              </Button>
                            </>
                          )}
                        </XStack>
                      }
                    />
                    <SettingsRowItem
                      last
                      title="Usage & Billing"
                      description="View AI compute credits, seat usage, and invoices for this organization."
                      right={
                        <Button
                          size="sm"
                          variant="outline"
                          rounded={round.field}
                          onPress={() => window.open('https://billing.hanzo.ai', '_blank', 'noopener,noreferrer')}
                        >
                          <SizableText size={rung.small} color={paint.ink}>Open Billing</SizableText>
                        </Button>
                      }
                    />
                  </SettingsGroupCard>
                </>
              ) : null}

              {activeSection === 'appearance' ? (
                <SettingsGroupCard title="Theme & Typography" description="Customize color mode, layout density, and font scale.">
                  <SettingsRowItem
                    title="Appearance mode"
                    description="Pure black dark mode, crisp light mode, or follow OS."
                    right={
                      <SegmentedChoice<HanzoThemePreference>
                        value={appearance.theme}
                        options={[
                          { id: 'dark', label: 'Dark' },
                          { id: 'light', label: 'Light' },
                          { id: 'system', label: 'System' },
                        ]}
                        onChange={(theme) => setAppearance({ theme })}
                      />
                    }
                  />
                  <SettingsRowItem
                    title="Density"
                    description="Adjust row spacing in channels and issue boards."
                    right={
                      <SegmentedChoice<HanzoDensityPreference>
                        value={appearance.density}
                        options={[
                          { id: 'compact', label: 'Compact' },
                          { id: 'default', label: 'Default' },
                          { id: 'spacious', label: 'Spacious' },
                        ]}
                        onChange={(density) => setAppearance({ density })}
                      />
                    }
                  />
                  <SettingsRowItem
                    last
                    title="Font size"
                    description="Scale interface typography across all panes."
                    right={
                      <SegmentedChoice<HanzoFontPreference>
                        value={appearance.font}
                        options={[
                          { id: 'compact', label: 'Small' },
                          { id: 'default', label: 'Default' },
                          { id: 'large', label: 'Large' },
                        ]}
                        onChange={(font) => setAppearance({ font })}
                      />
                    }
                  />
                </SettingsGroupCard>
              ) : null}

              {activeSection === 'notifications' ? (
                <SettingsGroupCard title="Notifications" description="Control desktop alerts for direct messages and @mentions.">
                  <SettingsRowItem
                    last
                    title="Desktop notifications"
                    description="Show native alerts when mentioned in a channel or issue."
                    right={
                      <SegmentedChoice<'on' | 'off'>
                        value={desktopNotifs ? 'on' : 'off'}
                        options={[
                          { id: 'on', label: 'Enabled' },
                          { id: 'off', label: 'Muted' },
                        ]}
                        onChange={(val) => {
                          const next = val === 'on'
                          setDesktopNotifs(next)
                          try {
                            window.localStorage.setItem('hanzo.team.notifs', val)
                          } catch {
                            /* ignore */
                          }
                        }}
                      />
                    }
                  />
                </SettingsGroupCard>
              ) : null}

              {activeSection === 'node' ? <NodeAndBlockchainSection /> : null}

              {activeSection === 'keybindings' ? (
                <SettingsGroupCard title="Keyboard Shortcuts" description="Workspace navigation and window controls.">
                  {TEAM_SHORTCUTS.map((s, idx) => (
                    <SettingsRowItem
                      key={s.action}
                      last={idx === TEAM_SHORTCUTS.length - 1}
                      title={s.label}
                      right={
                        <SizableText size={rung.small} fontWeight="600" color={paint.mute}>
                          {isMacDesktop() ? s.mac : s.pc}
                        </SizableText>
                      }
                    />
                  ))}
                </SettingsGroupCard>
              ) : null}

              {activeSection === 'about' ? (
                <SettingsGroupCard title={`Hanzo ${brand.title}`} description="Unified channels, issues, docs, and AI teammates.">
                  <SettingsRowItem
                    title="Version"
                    description="Desktop & Web Unified Workspace"
                    right={<SizableText size={rung.body} fontWeight="600" color={paint.ink}>1.0.5</SizableText>}
                  />
                  <SettingsRowItem
                    last
                    title="Hanzo AI"
                    description="© 2026 Hanzo AI Inc."
                    right={
                      <Button
                        size="sm"
                        variant="outline"
                        rounded={round.field}
                        onPress={() => window.open('https://hanzo.ai/team', '_blank', 'noopener,noreferrer')}
                      >
                        <SizableText size={rung.small} color={paint.ink}>hanzo.ai/team</SizableText>
                      </Button>
                    }
                  />
                </SettingsGroupCard>
              ) : null}
            </YStack>
          </YStack>
        </XStack>
      </DialogContent>
    </Dialog>
  )
}
