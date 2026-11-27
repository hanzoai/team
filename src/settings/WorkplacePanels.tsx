import { Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { ExternalLink, Laptop, Smartphone } from 'lucide-react'

import { isMacDesktop } from '~/data/desktop.ts'
import { useSpace } from '~/data/space.tsx'
import { paint, round, rung } from '~/theme/theme.ts'
import { setComposerModel } from '~/workspace/store.ts'
import {
  DEFAULT_CHAT_PREFS,
  DEFAULT_TEAM_SETTINGS,
  useTeamSettings,
  type HanzoEffortPreference,
  type TeamDefaultModel,
  type TeamEffortDisplay,
  type TeamEnterToSend,
  type TeamKoeVoice,
  type TeamLaunchView,
  type TeamNoiseSuppression,
  type TeamStartupBehavior,
} from './preferences.ts'
import {
  KbdBadge,
  SegmentedChoice,
  SettingsRow,
  SettingsSectionCard,
  SettingsSelect,
  SettingsSwitch,
} from './settingsPrimitives.tsx'

export function GeneralPanel() {
  const { current } = useSpace()
  const { settings, chat, updateSettings, resetSetting, setChat } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  return (
    <YStack gap={22} width="100%" data-testid="settings-general-panel">
      <SettingsSectionCard
        title="General"
        description="Default launch destination, startup window state, desktop alerts, and AI router."
      >
        <SettingsRow
          title="Active organization"
          description="Guild workspace currently connected via X-Org-Id."
          control={
            <SizableText size={rung.body} fontWeight="600" style={{ color: paint.ink }}>
              {current?.name ?? 'Hanzo'}
            </SizableText>
          }
        />

        <SettingsRow
          title="Default launch view"
          description="Workspace stage opened when launching a new Hanzo Team window."
          modified={settings.defaultLaunchView !== d.defaultLaunchView}
          onReset={() => resetSetting('defaultLaunchView')}
          control={
            <SettingsSelect<TeamLaunchView>
              label="Default launch view"
              value={settings.defaultLaunchView}
              options={[
                { id: 'channels', label: 'Channels (#engineering)' },
                { id: 'home', label: 'Home' },
                { id: 'messages', label: 'Messages & Inbox' },
                { id: 'tasks', label: 'Tasks & Board' },
                { id: 'office', label: 'Office (Virtual HQ)' },
              ]}
              onChange={(defaultLaunchView) => updateSettings({ defaultLaunchView })}
            />
          }
        />

        <SettingsRow
          title="Startup behavior"
          description="Choose how Hanzo Team restores windows and huddles on launch."
          modified={settings.startupBehavior !== d.startupBehavior}
          onReset={() => resetSetting('startupBehavior')}
          control={
            <SegmentedChoice<TeamStartupBehavior>
              value={settings.startupBehavior}
              options={[
                { id: 'restore', label: 'Restore session' },
                { id: 'launch-view', label: 'Launch view' },
                { id: 'minimized', label: 'Minimized' },
              ]}
              onChange={(startupBehavior) => updateSettings({ startupBehavior })}
            />
          }
        />

        <SettingsRow
          title="Desktop notifications"
          description="Show native OS banners for @mentions, DM replies, and deploy sign-offs."
          modified={settings.desktopNotifications !== d.desktopNotifications}
          onReset={() => resetSetting('desktopNotifications')}
          control={
            <SettingsSwitch
              label="Desktop notifications"
              checked={settings.desktopNotifications}
              onChange={(desktopNotifications) => updateSettings({ desktopNotifications })}
            />
          }
        />

        <SettingsRow
          title="Default AI model"
          description="Primary model router used across channel composers, @mentions, and Home."
          badge="enso"
          modified={settings.defaultModel !== d.defaultModel}
          onReset={() => {
            resetSetting('defaultModel')
            setComposerModel('enso')
          }}
          control={
            <SegmentedChoice<TeamDefaultModel>
              value={settings.defaultModel}
              options={[
                { id: 'enso', label: 'enso' },
                { id: 'zen6-coder', label: 'zen6-coder' },
                { id: 'zen6-ultra', label: 'zen6-ultra' },
              ]}
              onChange={(defaultModel) => {
                updateSettings({ defaultModel })
                setComposerModel(defaultModel)
              }}
            />
          }
        />

        <SettingsRow
          last
          title="Reasoning effort"
          description="Default thinking depth for @dev, @cyber, @ops, and @pm turns."
          modified={chat.effort !== DEFAULT_CHAT_PREFS.effort}
          onReset={() => setChat({ effort: DEFAULT_CHAT_PREFS.effort })}
          control={
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
      </SettingsSectionCard>
    </YStack>
  )
}

export function ChatThreadsPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS
  const modLabel = isMacDesktop() ? '⌘+Enter' : 'Ctrl+Enter'

  return (
    <YStack gap={22} width="100%" data-testid="settings-chat-panel">
      <SettingsSectionCard
        title="Chat & Threads"
        description="Configure composer send behavior, reasoning effort badges, math typesetting, and Mattermost Thread RHS."
      >
        <SettingsRow
          title="Send message key"
          description="Send on Enter (Shift+Enter for newline) or require modifier+Enter."
          modified={settings.enterToSend !== d.enterToSend}
          onReset={() => resetSetting('enterToSend')}
          control={
            <SegmentedChoice<TeamEnterToSend>
              value={settings.enterToSend}
              options={[
                { id: 'enter', label: 'Enter to send' },
                { id: 'mod-enter', label: modLabel },
              ]}
              onChange={(enterToSend) => updateSettings({ enterToSend })}
            />
          }
        />

        <SettingsRow
          title="Effort display"
          description="Show reasoning effort in the composer as a word (Medium) or signal bars."
          modified={settings.effortDisplay !== d.effortDisplay}
          onReset={() => resetSetting('effortDisplay')}
          control={
            <SegmentedChoice<TeamEffortDisplay>
              value={settings.effortDisplay}
              options={[
                { id: 'word', label: 'Word (default)' },
                { id: 'bars', label: 'Bars' },
              ]}
              onChange={(effortDisplay) => updateSettings({ effortDisplay })}
            />
          }
        />

        <SettingsRow
          title="Render Markdown & math"
          description="Format GFM code diffs, executable checkboxes, and inline $x^2$ / LaTeX math expressions."
          modified={settings.renderMarkdownAndMath !== d.renderMarkdownAndMath}
          onReset={() => resetSetting('renderMarkdownAndMath')}
          control={
            <SettingsSwitch
              label="Render Markdown and math"
              checked={settings.renderMarkdownAndMath}
              onChange={(renderMarkdownAndMath) => updateSettings({ renderMarkdownAndMath })}
            />
          }
        />

        <SettingsRow
          last
          title="Auto-open right-hand thread on reply"
          description="Automatically focus the Mattermost right-hand Thread pane when replying to a message."
          modified={settings.autoOpenThreadOnReply !== d.autoOpenThreadOnReply}
          onReset={() => resetSetting('autoOpenThreadOnReply')}
          control={
            <SettingsSwitch
              label="Auto-open right-hand thread on reply"
              checked={settings.autoOpenThreadOnReply}
              onChange={(autoOpenThreadOnReply) => updateSettings({ autoOpenThreadOnReply })}
            />
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

export function VoiceOfficePanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  return (
    <YStack gap={22} width="100%" data-testid="settings-voice-panel">
      <SettingsSectionCard
        title="Voice & Virtual Office"
        description="Roam-style Virtual HQ drop-in defaults, Koe speech synthesis, and RTC noise suppression."
      >
        <SettingsRow
          title="Virtual office audio on join"
          description="Default microphone state when dropping into Eng Pairing, Lounge, or Theater."
          modified={settings.officeDefaultAudio !== d.officeDefaultAudio}
          onReset={() => resetSetting('officeDefaultAudio')}
          control={
            <SegmentedChoice<'live' | 'muted'>
              value={settings.officeDefaultAudio}
              options={[
                { id: 'live', label: 'Live mic' },
                { id: 'muted', label: 'Muted on join' },
              ]}
              onChange={(officeDefaultAudio) => updateSettings({ officeDefaultAudio })}
            />
          }
        />

        <SettingsRow
          title="Virtual office camera default"
          description="Start camera feed automatically when entering a Meeting Room."
          modified={settings.officeDefaultVideo !== d.officeDefaultVideo}
          onReset={() => resetSetting('officeDefaultVideo')}
          control={
            <SegmentedChoice<'off' | 'on'>
              value={settings.officeDefaultVideo}
              options={[
                { id: 'off', label: 'Camera off' },
                { id: 'on', label: 'Camera on' },
              ]}
              onChange={(officeDefaultVideo) => updateSettings({ officeDefaultVideo })}
            />
          }
        />

        <SettingsRow
          title="Koe voice profile"
          description="Low-latency neural voice for @vi briefings and spoken huddle agents."
          modified={settings.koeVoice !== d.koeVoice}
          onReset={() => resetSetting('koeVoice')}
          control={
            <SettingsSelect<TeamKoeVoice>
              label="Koe voice"
              value={settings.koeVoice}
              options={[
                { id: 'koe-nova', label: 'Koe Nova (default)' },
                { id: 'koe-alloy', label: 'Koe Alloy' },
                { id: 'koe-echo', label: 'Koe Echo' },
              ]}
              onChange={(koeVoice) => updateSettings({ koeVoice })}
            />
          }
        />

        <SettingsRow
          title="Noise suppression"
          description="Filter keyboard clicks and ambient background noise on WebRTC huddles."
          modified={settings.noiseSuppression !== d.noiseSuppression}
          onReset={() => resetSetting('noiseSuppression')}
          control={
            <SegmentedChoice<TeamNoiseSuppression>
              value={settings.noiseSuppression}
              options={[
                { id: 'krisp-ai', label: 'Krisp AI' },
                { id: 'standard', label: 'Standard' },
                { id: 'off', label: 'Off' },
              ]}
              onChange={(noiseSuppression) => updateSettings({ noiseSuppression })}
            />
          }
        />

        <SettingsRow
          last
          title="Push-to-talk"
          description="Hold Space while focused in Virtual Office to transmit voice."
          modified={settings.pushToTalk !== d.pushToTalk}
          onReset={() => resetSetting('pushToTalk')}
          control={
            <SettingsSwitch
              label="Push-to-talk"
              checked={settings.pushToTalk}
              onChange={(pushToTalk) => updateSettings({ pushToTalk })}
            />
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

export function KeybindingsPanel() {
  const mac = isMacDesktop()
  const bindings = [
    { label: 'Preferences & Settings', desc: 'Open unified Settings modal', keys: mac ? '⌘,' : 'Ctrl+,' },
    { label: 'Quick Switcher & Omnibox', desc: 'Jump to channel, person, doc, or @vi', keys: mac ? '⌘K' : 'Ctrl+K' },
    { label: 'Toggle Left Sidebar', desc: 'Collapse or expand workspace & channel rail', keys: mac ? '⌘B' : 'Ctrl+B' },
    { label: 'Toggle Right Thread Pane', desc: 'Open or collapse Mattermost Thread RHS', keys: mac ? '⌘.' : 'Ctrl+.' },
    { label: 'Switch Workspace Views', desc: 'Home (1) · Channels (2) · Inbox (3) · Threads (4) · Tasks (5) · Office (6)', keys: 'Alt+1..6' },
    { label: 'New Channel or Thread', desc: 'Jump to #engineering composer', keys: mac ? '⇧⌘O' : 'Ctrl+Shift+O' },
    { label: 'Search Settings', desc: 'Focus Settings search bar when modal is open', keys: '/' },
    { label: 'Keyboard Shortcuts Sheet', desc: 'Toggle quick shortcut reference drawer', keys: mac ? '⌘/' : 'Ctrl+/' },
  ] as const

  return (
    <YStack gap={22} width="100%" data-testid="settings-keybindings-panel">
      <SettingsSectionCard
        title="Keybindings"
        description="Global workspace navigation, pane toggles, and quick switcher shortcuts."
      >
        {bindings.map((b, idx) => (
          <SettingsRow
            key={b.label}
            last={idx === bindings.length - 1}
            title={b.label}
            description={b.desc}
            control={<KbdBadge keys={b.keys} />}
          />
        ))}
      </SettingsSectionCard>
    </YStack>
  )
}

export function ModelsProvidersPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  return (
    <YStack gap={22} width="100%" data-testid="settings-models-panel">
      <SettingsSectionCard
        title="Default Router & Channel Bots"
        description="Configure default Enso specialist routing and active @bot teammates in channels."
      >
        <SettingsRow
          title="Default workspace model"
          description="Dynamic Enso router dispatches code, architecture, and ops turns with sub-40ms TTFT."
          badge="Default"
          modified={settings.defaultModel !== d.defaultModel}
          onReset={() => {
            resetSetting('defaultModel')
            setComposerModel('enso')
          }}
          control={
            <SegmentedChoice<TeamDefaultModel>
              value={settings.defaultModel}
              options={[
                { id: 'enso', label: 'enso' },
                { id: 'zen6-coder', label: 'zen6-coder' },
                { id: 'zen6-ultra', label: 'zen6-ultra' },
              ]}
              onChange={(defaultModel) => {
                updateSettings({ defaultModel })
                setComposerModel(defaultModel)
              }}
            />
          }
        />

        <SettingsRow
          title="@dev — Systems & Full-Stack Bot"
          description="Executes inline tasks, inspects diffs, runs test suites, and stages release PRs."
          badge="zen6-coder"
          modified={settings.botDevEnabled !== d.botDevEnabled}
          onReset={() => resetSetting('botDevEnabled')}
          control={
            <SettingsSwitch
              label="Enable @dev bot"
              checked={settings.botDevEnabled}
              onChange={(botDevEnabled) => updateSettings({ botDevEnabled })}
            />
          }
        />

        <SettingsRow
          title="@cyber — Kai Zero-Trust Security Bot"
          description="Audits dependency lockfiles, MCP outbound gates, and supply-chain signatures."
          badge="zen6-ultra"
          modified={settings.botCyberEnabled !== d.botCyberEnabled}
          onReset={() => resetSetting('botCyberEnabled')}
          control={
            <SettingsSwitch
              label="Enable @cyber bot"
              checked={settings.botCyberEnabled}
              onChange={(botCyberEnabled) => updateSettings({ botCyberEnabled })}
            />
          }
        />

        <SettingsRow
          title="@ops — SRE & Incident Command Bot"
          description="Triages #incidents playbooks, monitors SFU latency, and executes rollback gates."
          badge="enso"
          modified={settings.botOpsEnabled !== d.botOpsEnabled}
          onReset={() => resetSetting('botOpsEnabled')}
          control={
            <SettingsSwitch
              label="Enable @ops bot"
              checked={settings.botOpsEnabled}
              onChange={(botOpsEnabled) => updateSettings({ botOpsEnabled })}
            />
          }
        />

        <SettingsRow
          last
          title="@pm — Roadmap & Sprint Coordination Bot"
          description="Syncs YAML objectives, Linear/Work Kanban cards, and daily async standups."
          badge="enso"
          modified={settings.botPmEnabled !== d.botPmEnabled}
          onReset={() => resetSetting('botPmEnabled')}
          control={
            <SettingsSwitch
              label="Enable @pm bot"
              checked={settings.botPmEnabled}
              onChange={(botPmEnabled) => updateSettings({ botPmEnabled })}
            />
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Model Providers"
        description="Unified cloud and on-device inference endpoints via Hanzo AI Gateway."
      >
        <SettingsRow
          title="Zen 6 (Hanzo AI Gateway)"
          description="enso, zen6-coder, and zen6-ultra via https://api.hanzo.ai/v1."
          badge="Primary"
          modified={settings.providerZen6Enabled !== d.providerZen6Enabled}
          onReset={() => resetSetting('providerZen6Enabled')}
          control={
            <SettingsSwitch
              label="Enable Zen 6 provider"
              checked={settings.providerZen6Enabled}
              onChange={(providerZen6Enabled) => updateSettings({ providerZen6Enabled })}
            />
          }
        />
        <SettingsRow
          title="Anthropic"
          description="Claude Opus 4.6 & Claude Sonnet 4.6 via organization gateway key."
          modified={settings.providerAnthropicEnabled !== d.providerAnthropicEnabled}
          onReset={() => resetSetting('providerAnthropicEnabled')}
          control={
            <SettingsSwitch
              label="Enable Anthropic provider"
              checked={settings.providerAnthropicEnabled}
              onChange={(providerAnthropicEnabled) => updateSettings({ providerAnthropicEnabled })}
            />
          }
        />
        <SettingsRow
          title="OpenAI"
          description="GPT-5 & o-series reasoning models via organization gateway key."
          modified={settings.providerOpenAiEnabled !== d.providerOpenAiEnabled}
          onReset={() => resetSetting('providerOpenAiEnabled')}
          control={
            <SettingsSwitch
              label="Enable OpenAI provider"
              checked={settings.providerOpenAiEnabled}
              onChange={(providerOpenAiEnabled) => updateSettings({ providerOpenAiEnabled })}
            />
          }
        />
        <SettingsRow
          last
          title="Local Private Inference (hanzod)"
          description="Zero-egress on-device MLX / GGUF models on http://127.0.0.1:3690/v1."
          badge="Local"
          modified={settings.providerLocalEnabled !== d.providerLocalEnabled}
          onReset={() => resetSetting('providerLocalEnabled')}
          control={
            <SettingsSwitch
              label="Enable Local provider"
              checked={settings.providerLocalEnabled}
              onChange={(providerLocalEnabled) => updateSettings({ providerLocalEnabled })}
            />
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

export function ScheduledStandupsPanel() {
  const { settings, updateSettings, resetSetting } = useTeamSettings()
  const d = DEFAULT_TEAM_SETTINGS

  return (
    <YStack gap={22} width="100%" data-testid="settings-standups-panel">
      <SettingsSectionCard
        title="Scheduled Standups & Tasks"
        description="Automated daily executive digests, async team check-ins, and CI alert routing."
      >
        <SettingsRow
          title="Daily async standup digest"
          description="Compile overnight PRs, resolved blockers, and active agent runs at 09:00 local time."
          modified={settings.dailyStandupEnabled !== d.dailyStandupEnabled}
          onReset={() => resetSetting('dailyStandupEnabled')}
          control={
            <SettingsSwitch
              label="Daily async standup digest"
              checked={settings.dailyStandupEnabled}
              onChange={(dailyStandupEnabled) => updateSettings({ dailyStandupEnabled })}
            />
          }
        />

        <SettingsRow
          title="Standup summary destination"
          description="Channel or direct briefing where @vi posts the morning digest."
          modified={settings.standupChannel !== d.standupChannel}
          onReset={() => resetSetting('standupChannel')}
          control={
            <SettingsSelect<'#general' | '#engineering' | 'dm-vi'>
              label="Standup destination"
              value={settings.standupChannel}
              options={[
                { id: '#general', label: '#general (default)' },
                { id: '#engineering', label: '#engineering' },
                { id: 'dm-vi', label: 'Direct message (@vi)' },
              ]}
              onChange={(standupChannel) => updateSettings({ standupChannel })}
            />
          }
        />

        <SettingsRow
          last
          title="CI & deployment alert routing"
          description="Route failing GitHub Actions checks, SEV alerts, and release approvals."
          modified={settings.ciAlertRouting !== d.ciAlertRouting}
          onReset={() => resetSetting('ciAlertRouting')}
          control={
            <SettingsSelect<'#incidents' | '#engineering' | 'inbox'>
              label="CI alert routing"
              value={settings.ciAlertRouting}
              options={[
                { id: '#incidents', label: '#incidents (default)' },
                { id: '#engineering', label: '#engineering' },
                { id: 'inbox', label: 'Inbox only' },
              ]}
              onChange={(ciAlertRouting) => updateSettings({ ciAlertRouting })}
            />
          }
        />
      </SettingsSectionCard>
    </YStack>
  )
}

export function DevicesPanel() {
  const openMobileDownload = () => {
    window.open('https://hanzo.ai/download#mobile', '_blank', 'noopener,noreferrer')
  }

  return (
    <YStack gap={22} width="100%" data-testid="settings-devices-panel">
      <SettingsSectionCard
        title="Get Hanzo on your phone"
        description="Approve agent deployments, join voice huddles, and review executive briefings on iOS & Android."
      >
        <SettingsRow
          last
          title="Get Hanzo on your phone"
          description="Download Hanzo Team for iOS & Android at https://hanzo.ai/download#mobile."
          badge="iOS · Android"
          control={
            <XStack items="center" gap={8}>
              <Button size="sm" variant="outline" rounded={round.field} onPress={openMobileDownload}>
                <XStack items="center" gap={6}>
                  <Smartphone size={13} color="var(--primary, #fafafa)" />
                  <SizableText size={rung.small} style={{ color: paint.ink }}>
                    iOS &amp; Android
                  </SizableText>
                  <ExternalLink size={11} color="var(--team-mute, #a1a1aa)" />
                </XStack>
              </Button>
            </XStack>
          }
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Active Sessions"
        description="Devices currently authenticated to this workspace."
      >
        <SettingsRow
          last
          title="Hanzo Team Desktop · v1.1.1"
          description="Current session · Encrypted local SQLite + ZAP transport active"
          badge="This device"
          control={<Laptop size={15} color="var(--team-speaking, #22c55e)" />}
        />
      </SettingsSectionCard>
    </YStack>
  )
}
