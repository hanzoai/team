import { Box, Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { Check, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { brand } from '~/data/brand.ts'
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

export function BridgesPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  return (
    <YStack gap={22} width="100%" data-testid="settings-bridges-panel">
      <SettingsSectionCard
        title="Chat Bridges"
        description="Bi-directional message, thread, and reaction relays with external chat networks."
      >
        <SettingsRow
          title="Discord Guild Bridge"
          description="Sync channels, voice huddle presence, and webhooks with Discord servers."
          badge="Connected"
          modified={settings.bridgeDiscord !== d.bridgeDiscord}
          onReset={() => resetSetting('bridgeDiscord')}
          control={
            <SettingsSwitch
              label="Enable Discord bridge"
              checked={settings.bridgeDiscord}
              onChange={(bridgeDiscord) => updateSettings({ bridgeDiscord })}
            />
          }
        />

        <SettingsRow
          title="Slack Connect Bridge"
          description="Mirror shared customer & partner channels into #revenue and #general."
          badge="Connected"
          modified={settings.bridgeSlack !== d.bridgeSlack}
          onReset={() => resetSetting('bridgeSlack')}
          control={
            <SettingsSwitch
              label="Enable Slack bridge"
              checked={settings.bridgeSlack}
              onChange={(bridgeSlack) => updateSettings({ bridgeSlack })}
            />
          }
        />

        <SettingsRow
          last
          title="Mattermost Federation"
          description="Synchronize playbooks, slash commands, and simultaneous Thread RHS streams."
          badge="Active"
          modified={settings.bridgeMattermost !== d.bridgeMattermost}
          onReset={() => resetSetting('bridgeMattermost')}
          control={
            <SettingsSwitch
              label="Enable Mattermost bridge"
              checked={settings.bridgeMattermost}
              onChange={(bridgeMattermost) => updateSettings({ bridgeMattermost })}
            />
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Source Control & Issue Webhooks"
        description="Stream pull requests, CI runs, and issue transitions directly into channels."
      >
        <SettingsRow
          title="GitHub (hanzoai & hanzo-inc)"
          description="Post PR diffs, release candidate cards, and Actions check gates to #engineering."
          badge="Webhook"
          modified={settings.webhookGithub !== d.webhookGithub}
          onReset={() => resetSetting('webhookGithub')}
          control={
            <SettingsSwitch
              label="Enable GitHub webhooks"
              checked={settings.webhookGithub}
              onChange={(webhookGithub) => updateSettings({ webhookGithub })}
            />
          }
        />

        <SettingsRow
          last
          title="Linear & Hanzo Work Sync"
          description="Two-way status sync between Linear issues and Hanzo Work Kanban boards."
          badge="Webhook"
          modified={settings.webhookLinear !== d.webhookLinear}
          onReset={() => resetSetting('webhookLinear')}
          control={
            <SettingsSwitch
              label="Enable Linear webhooks"
              checked={settings.webhookLinear}
              onChange={(webhookLinear) => updateSettings({ webhookLinear })}
            />
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

const MCP_SERVERS = [
  { id: 'hanzo-mcp', name: 'hanzo-mcp (HIP-0300 Core)', transport: 'zap://127.0.0.1:9651', tools: '58 tools · AST, shell, memory, search' },
  { id: 'github-mcp', name: 'github', transport: 'stdio · Kai gated', tools: 'PRs, reviews, releases & workflow runs' },
  { id: 'linear-mcp', name: 'linear', transport: 'stdio · OAuth', tools: 'Issues, cycles & roadmap sync' },
  { id: 'postgres-mcp', name: 'postgres / base', transport: 'local socket', tools: 'Read-only schema & query inspector' },
] as const

export function McpZapPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null)
  const [nodeVersion, setNodeVersion] = useState<string>('hanzod :3690')
  const [blockHeight, setBlockHeight] = useState<string>('—')
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
        }
      }
    } catch {
      /* ignore */
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
          title="Local ZAP Bus (zap://127.0.0.1:9651)"
          description="Sub-millisecond zero-copy tool calls between Hanzo Team, Hanzo Dev, and @bots."
          badge="HIP-0300"
          modified={settings.mcpZapBusEnabled !== d.mcpZapBusEnabled}
          onReset={() => resetSetting('mcpZapBusEnabled')}
          control={
            <SettingsSwitch
              label="Enable local ZAP bus"
              checked={settings.mcpZapBusEnabled}
              onChange={(mcpZapBusEnabled) => updateSettings({ mcpZapBusEnabled })}
            />
          }
        />

        <SettingsRow
          title="Hanzo Node daemon (127.0.0.1:3690)"
          description={nodeOnline ? `Online · ${nodeVersion}` : 'Standby · Starts automatically on local tool or model turn'}
          control={
            <XStack items="center" gap={8}>
              <Box
                width={8}
                height={8}
                rounded={999}
                style={{
                  backgroundColor: nodeOnline
                    ? 'var(--team-speaking, #22c55e)'
                    : 'var(--team-dim, #71717a)',
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
                <RefreshCw size={12} color="var(--primary, #fafafa)" />
              </Button>
            </XStack>
          }
        />

        <SettingsRow
          last
          title="Hanzo Network Mainnet Telemetry"
          description="Chain ID 36963 · Sovereign AI L1 RPC (https://rpc.hanzo.ai)"
          control={
            <SizableText size={rung.small} fontWeight="600" style={{ color: paint.ink, fontFamily: 'var(--font-mono)' }}>
              {blockHeight}
            </SizableText>
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="HIP-0300 MCP Servers"
        description="Model Context Protocol servers exposed to channel @bots and executable tasks."
      >
        {MCP_SERVERS.map((srv, idx) => (
          <SettingsRow
            key={srv.id}
            last={idx === MCP_SERVERS.length - 1}
            title={srv.name}
            description={srv.tools}
            badge={srv.transport}
            control={
              <SizableText size={rung.small} fontWeight="600" style={{ color: paint.speaking }}>
                Ready
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
                  <Check size={12} color="var(--team-speaking, #22c55e)" />
                ) : (
                  <Copy size={12} color="var(--primary, #fafafa)" />
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
        description="Unified identity and seat billing across Hanzo Team, Hanzo Dev, and Hanzo Cloud."
      >
        <SettingsRow
          title={guest ? 'Local Workspace' : (who?.label || who?.name || 'Signed in')}
          description={guest ? 'Sign in with hanzo.id to sync channels, issues, Spaces, and cloud credits.' : (who?.email ?? current?.org ?? 'hanzo.id')}
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
                <ExternalLink size={11} color="var(--team-mute, #a1a1aa)" />
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
              Hanzo Team v1.1.1
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
                <ExternalLink size={11} color="var(--team-mute, #a1a1aa)" />
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
