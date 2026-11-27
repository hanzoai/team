import { Box, Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { v1 } from '~/data/api.ts'
import { brand } from '~/data/brand.ts'
import { call } from '~/data/http.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { paint, round, rung } from '~/theme/theme.ts'
import { billingUrl, DEFAULT_TEAM_SETTINGS, useTeamSettings } from './preferences.ts'
import {
  getTauriInvoke,
  SettingsRow,
  SettingsSectionCard,
  SettingsSwitch,
} from './settingsPrimitives.tsx'

interface IntegrationDto {
  id?: string
  provider?: string
  kind?: string
  type?: string
  connected?: boolean
  active?: boolean
  status?: string
  teamName?: string
}

const INTEGRATION_SPECS = [
  {
    key: 'discord',
    group: 'chat',
    title: 'Discord Guild Bridge',
    description: 'Bi-directional channel, huddle presence, and webhook relay with Discord servers.',
  },
  {
    key: 'slack',
    group: 'chat',
    title: 'Slack Connect Bridge',
    description: 'Mirror shared customer and partner channels via verified Slack OAuth installation.',
  },
  {
    key: 'mattermost',
    group: 'chat',
    title: 'Mattermost Federation',
    description: 'Synchronize playbooks, slash commands, and simultaneous Thread RHS streams.',
  },
  {
    key: 'github',
    group: 'scm',
    title: 'GitHub Webhooks',
    description: 'Stream pull requests, CI runs, and release candidate gates into workspace channels.',
  },
  {
    key: 'linear',
    group: 'scm',
    title: 'Linear & Hanzo Work Sync',
    description: 'Two-way status sync between external Linear issues and Hanzo Work Kanban boards.',
  },
] as const

type IntegrationLoadState = 'loading' | 'ready' | 'unauthenticated' | 'unavailable'

export function BridgesPanel() {
  const { standing, guest } = useSession()
  const { current } = useSpace()
  const [loadState, setLoadState] = useState<IntegrationLoadState>(
    standing !== 'in' || guest ? 'unauthenticated' : 'loading',
  )
  const [connectedProviders, setConnectedProviders] = useState<ReadonlySet<string>>(new Set())
  const [statusError, setStatusError] = useState<string | null>(null)

  const refreshIntegrations = async () => {
    if (standing !== 'in' || guest) {
      setLoadState('unauthenticated')
      setConnectedProviders(new Set())
      setStatusError(null)
      return
    }
    setLoadState('loading')
    setStatusError(null)
    try {
      const res = await call<{ integrations?: IntegrationDto[] } | IntegrationDto[]>(v1('integrations'))
      const rows = Array.isArray(res) ? res : Array.isArray(res?.integrations) ? res.integrations : []
      const active = new Set<string>()
      for (const row of rows) {
        const provider = (row.provider || row.kind || row.type || row.id || '').trim().toLowerCase()
        const isLive = row.connected === true || row.active === true || row.status === 'connected' || row.status === 'active'
        if (provider && isLive) active.add(provider)
      }
      setConnectedProviders(active)
      setLoadState('ready')
    } catch (err) {
      setConnectedProviders(new Set())
      setLoadState('unavailable')
      setStatusError(err instanceof Error ? err.message : 'Integration service unavailable')
    }
  }

  useEffect(() => {
    void refreshIntegrations()
  }, [standing, guest, current?.uuid])

  const openIntegrationsConsole = () => {
    const org = current?.org ? `?org=${encodeURIComponent(current.org)}` : ''
    window.open(`https://console.hanzo.ai/integrations${org}`, '_blank', 'noopener,noreferrer')
  }

  const renderStatusControl = (providerKey: string) => {
    const isConnected = loadState === 'ready' && connectedProviders.has(providerKey)
    const label =
      loadState === 'unauthenticated'
        ? 'Sign in required'
        : loadState === 'loading'
          ? 'Checking…'
          : loadState === 'unavailable'
            ? 'Unavailable'
            : isConnected
              ? 'Connected'
              : 'Not connected'
    const dotColor = isConnected ? paint.speaking : loadState === 'unavailable' ? paint.alert : paint.dim

    return (
      <XStack items="center" gap={10}>
        <XStack items="center" gap={6}>
          <Box width={7} height={7} rounded={999} style={{ backgroundColor: dotColor }} />
          <SizableText
            size={rung.small}
            fontWeight="600"
            style={{ color: isConnected ? paint.speaking : loadState === 'unavailable' ? paint.alert : paint.mute }}
            data-testid={`bridge-status-${providerKey}`}
          >
            {label}
          </SizableText>
        </XStack>
        <Button size="sm" variant="outline" rounded={round.field} onPress={openIntegrationsConsole}>
          <XStack items="center" gap={5}>
            <SizableText size={rung.small} style={{ color: paint.ink }}>
              {isConnected ? 'Manage' : 'Connect'}
            </SizableText>
            <ExternalLink size={11} color={paint.mute} />
          </XStack>
        </Button>
      </XStack>
    )
  }

  const chatRows = INTEGRATION_SPECS.filter((s) => s.group === 'chat')
  const scmRows = INTEGRATION_SPECS.filter((s) => s.group === 'scm')

  return (
    <YStack gap={22} width="100%" data-testid="settings-bridges-panel">
      {statusError ? (
        <XStack
          px={14}
          py={10}
          rounded={12}
          borderWidth={1}
          items="center"
          justify="space-between"
          style={{ backgroundColor: paint.settingsCard, borderColor: paint.settingsBorder }}
        >
          <SizableText fontSize={12} style={{ color: paint.alert }}>
            {`Live integration directory unavailable: ${statusError}`}
          </SizableText>
          <Button size="sm" variant="outline" rounded={round.field} onPress={() => void refreshIntegrations()}>
            <RefreshCw size={12} color={paint.accent} />
          </Button>
        </XStack>
      ) : null}

      <SettingsSectionCard
        title="Chat Bridges"
        description="Server-verified message, thread, and reaction relays (`/v1/integrations`). Status reflects real organization installs, never a local toggle."
      >
        {chatRows.map((spec, idx) => (
          <SettingsRow
            key={spec.key}
            last={idx === chatRows.length - 1}
            title={spec.title}
            description={spec.description}
            control={renderStatusControl(spec.key)}
          />
        ))}
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Source Control & Issue Webhooks"
        description="Verified webhook installations streaming pull requests, CI checks, and issue transitions."
      >
        {scmRows.map((spec, idx) => (
          <SettingsRow
            key={spec.key}
            last={idx === scmRows.length - 1}
            title={spec.title}
            description={spec.description}
            control={renderStatusControl(spec.key)}
          />
        ))}
      </SettingsSectionCard>
    </YStack>
  )
}

const MCP_SERVERS = [
  { id: 'hanzo-mcp', name: 'hanzo-mcp (HIP-0300 Core)', transport: 'zap://127.0.0.1:9651', tools: 'AST, shell, memory & search via local hanzod' },
  { id: 'github-mcp', name: 'github', transport: 'stdio · Kai gated', tools: 'PRs, reviews, releases & workflow runs' },
  { id: 'linear-mcp', name: 'linear', transport: 'stdio · OAuth', tools: 'Issues, cycles & roadmap sync' },
  { id: 'postgres-mcp', name: 'postgres / base', transport: 'local socket', tools: 'Read-only schema & query inspector' },
] as const

export function McpZapPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null)
  const [nodeVersion, setNodeVersion] = useState<string>('hanzod :3690')
  const [blockHeight, setBlockHeight] = useState<string>('Unavailable')
  const [busy, setBusy] = useState(false)

  const refreshTelemetry = async () => {
    setBusy(true)
    const invoke = getTauriInvoke()
    try {
      if (invoke) {
        const status = await invoke<{ running?: boolean; version?: string }>('team_hanzod_status')
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
        } else {
          setBlockHeight('Unavailable')
        }
      } else {
        setBlockHeight('Unavailable')
      }
    } catch {
      setBlockHeight('Unavailable')
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
    <YStack gap={22} width="100%" data-testid="settings-mcp-panel">
      <SettingsSectionCard
        title="Local ZAP Bus & Hanzo Node"
        description="Zero-Copy Agent Protocol (ZAP) local IPC bus and embedded hanzod daemon."
      >
        <SettingsRow
          title="Allow local ZAP bus preference (zap://127.0.0.1:9651)"
          description={
            nodeOnline
              ? 'Local daemon reachable — zero-copy IPC active.'
              : 'Preference only — start local hanzod daemon below to establish a live ZAP bus.'
          }
          badge="HIP-0300"
          modified={settings.mcpZapBusEnabled !== d.mcpZapBusEnabled}
          onReset={() => resetSetting('mcpZapBusEnabled')}
          control={
            <SettingsSwitch
              label="Allow local ZAP bus"
              checked={settings.mcpZapBusEnabled}
              onChange={(mcpZapBusEnabled) => updateSettings({ mcpZapBusEnabled })}
            />
          }
        />

        <SettingsRow
          title="Hanzo Node daemon (127.0.0.1:3690)"
          description={
            nodeOnline === null
              ? 'Checking local daemon health…'
              : nodeOnline
                ? `Online · ${nodeVersion}`
                : 'Offline · Local hanzod daemon is not running on 127.0.0.1:3690'
          }
          control={
            <XStack items="center" gap={8}>
              <Box
                width={8}
                height={8}
                rounded={999}
                style={{
                  backgroundColor: nodeOnline ? paint.speaking : paint.dim,
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
                  <SizableText size={rung.small} style={{ color: paint.ink }}>
                    {nodeOnline ? 'Stop node' : 'Start node'}
                  </SizableText>
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                rounded={round.field}
                disabled={busy}
                onPress={() => void refreshTelemetry()}
              >
                <RefreshCw size={12} color={paint.accent} />
              </Button>
            </XStack>
          }
        />

        <SettingsRow
          last
          title="Hanzo Network Mainnet Telemetry"
          description="Chain ID 36963 · Sovereign AI L1 RPC (https://rpc.hanzo.ai)"
          control={
            <SizableText size={rung.small} fontWeight="600" style={{ color: blockHeight === 'Unavailable' ? paint.dim : paint.ink, fontFamily: 'var(--font-mono)' }}>
              {blockHeight}
            </SizableText>
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="HIP-0300 Local MCP Transports"
        description={
          nodeOnline
            ? 'Connected through your active local hanzod node.'
            : 'Offline — local MCP stdio/socket transports require an active local hanzod daemon.'
        }
      >
        {MCP_SERVERS.map((srv, idx) => (
          <SettingsRow
            key={srv.id}
            last={idx === MCP_SERVERS.length - 1}
            title={srv.name}
            description={srv.tools}
            badge={srv.transport}
            control={
              <SizableText
                size={rung.small}
                fontWeight="600"
                style={{ color: nodeOnline ? paint.speaking : paint.dim }}
              >
                {nodeOnline === null ? 'Checking…' : nodeOnline ? 'Online' : 'Offline'}
              </SizableText>
            }
          />
        ))}
      </SettingsSectionCard>
    </YStack>
  )
}

export function SharingAccessPanel({ onCloseModal }: { onCloseModal: () => void }) {
  const { who, guest, depart, leave } = useSession()
  const { current } = useSpace()
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS
  const [copied, setCopied] = useState(false)

  const orgSlug = current?.org ?? 'hanzo'
  const inviteUrl = `https://hanzo.team/invite/${orgSlug}`

  const copyInvite = () => {
    void navigator.clipboard?.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <YStack gap={22} width="100%" data-testid="settings-access-panel">
      <SettingsSectionCard
        title="Sharing & Workspace Access"
        description="Manage organization invite links, guest channel boundaries, and hanzo.id SSO."
      >
        <SettingsRow
          title="Workspace invite link"
          description={inviteUrl}
          control={
            <Button size="sm" variant="outline" rounded={round.field} onPress={copyInvite}>
              <XStack items="center" gap={5}>
                {copied ? (
                  <Check size={12} color={paint.speaking} />
                ) : (
                  <Copy size={12} color={paint.accent} />
                )}
                <SizableText size={rung.small} style={{ color: paint.ink }}>
                  {copied ? 'Copied' : 'Copy link'}
                </SizableText>
              </XStack>
            </Button>
          }
        />

        <SettingsRow
          title="Single Sign-On via hanzo.id"
          description="Require verified Hanzo IAM passkey, OIDC, or GitHub SSO for organization members."
          badge="hanzo.id"
          modified={settings.ssoEnforced !== d.ssoEnforced}
          onReset={() => resetSetting('ssoEnforced')}
          control={
            <SettingsSwitch
              label="Require SSO via hanzo.id"
              checked={settings.ssoEnforced}
              onChange={(ssoEnforced) => updateSettings({ ssoEnforced })}
            />
          }
        />

        <SettingsRow
          last
          title="External guest channels"
          description="Allow single-channel external collaborators without exposing full org roster or Memory."
          modified={settings.guestChannelsAllowed !== d.guestChannelsAllowed}
          onReset={() => resetSetting('guestChannelsAllowed')}
          control={
            <SettingsSwitch
              label="Allow guest channels"
              checked={settings.guestChannelsAllowed}
              onChange={(guestChannelsAllowed) => updateSettings({ guestChannelsAllowed })}
            />
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Identity & Billing"
        description="Unified identity and seat billing across Hanzo Team, Hanzo Bot, and Hanzo Cloud."
      >
        <SettingsRow
          title={guest ? 'Local Guest Workspace' : (who?.label || who?.name || 'Signed in')}
          description={guest ? 'Offline local scratch mode — sign in with hanzo.id to access live workspaces and bots.' : (who?.email ?? current?.org ?? 'hanzo.id')}
          control={
            <XStack items="center" gap={8}>
              {guest ? (
                <Button
                  size="sm"
                  variant="outline"
                  rounded={round.field}
                  onPress={() => {
                    onCloseModal()
                    leave()
                  }}
                >
                  <SizableText size={rung.small} style={{ color: paint.ink }}>
                    Sign in (hanzo.id)
                  </SizableText>
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" rounded={round.field} onPress={() => void depart('another')}>
                    <SizableText size={rung.small} style={{ color: paint.ink }}>
                      Switch account
                    </SizableText>
                  </Button>
                  <Button size="sm" variant="outline" rounded={round.field} onPress={leave}>
                    <SizableText size={rung.small} style={{ color: paint.ink }}>
                      Sign out
                    </SizableText>
                  </Button>
                </>
              )}
            </XStack>
          }
        />

        <SettingsRow
          last
          title="Usage & Billing"
          description="Inspect Enso / Zen 6 compute credits, seats, and organization invoices."
          control={
            <Button
              size="sm"
              variant="outline"
              rounded={round.field}
              onPress={() => window.open(billingUrl(guest ? null : current?.org), '_blank', 'noopener,noreferrer')}
            >
              <XStack items="center" gap={5}>
                <SizableText size={rung.small} style={{ color: paint.ink }}>
                  Open Billing
                </SizableText>
                <ExternalLink size={11} color={paint.mute} />
              </XStack>
            </Button>
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

export function AboutPanel() {
  return (
    <YStack gap={22} width="100%" data-testid="settings-about-panel">
      <SettingsSectionCard
        title={`Hanzo ${brand.title}`}
        description="Unified channels, simultaneous threads, issues, Spaces, Virtual HQ, and AI teammates."
      >
        <SettingsRow
          title="Version"
          description="Hanzo Team Desktop & Web Unified Workspace"
          badge="Stable"
          control={
            <SizableText size={rung.body} fontWeight="600" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
              Hanzo Team v1.1.5
            </SizableText>
          }
        />

        <SettingsRow
          title="Desktop Runtime"
          description="Frameless native shell with W3C 12px RGBA compositor corners & embedded hanzod"
          control={
            <SizableText size={rung.small} fontWeight="600" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
              Tauri v2
            </SizableText>
          }
        />

        <SettingsRow
          title="Source Repository"
          description="Open-source MIT / Apache-2.0 workspace client on GitHub"
          control={
            <Button
              size="sm"
              variant="outline"
              rounded={round.field}
              onPress={() => window.open('https://github.com/hanzoai/team', '_blank', 'noopener,noreferrer')}
            >
              <XStack items="center" gap={5}>
                <SizableText size={rung.small} style={{ color: paint.ink }}>
                  GitHub (hanzoai/team)
                </SizableText>
                <ExternalLink size={11} color={paint.mute} />
              </XStack>
            </Button>
          }
        />

        <SettingsRow
          last
          title="Hanzo AI Inc."
          description="© 2026 Hanzo AI Inc. · Techstars '17 · Sovereign AI Infrastructure"
          control={
            <Button
              size="sm"
              variant="outline"
              rounded={round.field}
              onPress={() => window.open('https://hanzo.ai/team', '_blank', 'noopener,noreferrer')}
            >
              <SizableText size={rung.small} style={{ color: paint.ink }}>
                hanzo.ai/team
              </SizableText>
            </Button>
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}
