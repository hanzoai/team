import { useEffect, useState } from 'react'

export type HanzoThemePreference = 'system' | 'light' | 'dark'
export type HanzoDensityPreference = 'compact' | 'default' | 'spacious'
export type HanzoFontPreference = 'compact' | 'default' | 'large'
export type HanzoAccentPreference = 'ink' | 'iris' | 'jade' | 'amber' | 'coral' | 'plum'

export type HanzoAppearancePreferences = {
  theme: HanzoThemePreference
  density: HanzoDensityPreference
  font: HanzoFontPreference
  accent?: HanzoAccentPreference
}

export type HanzoEffortPreference = 'low' | 'medium' | 'high'
export type HanzoApprovalMode = 'auto' | 'manual'

export type HanzoChatPreferences = {
  effort: HanzoEffortPreference
  approvalMode: HanzoApprovalMode
  allowThirdPartyModels: boolean
  spokenLanguage: string
}

export type TeamLaunchView = 'channels' | 'home' | 'messages' | 'tasks' | 'office'
export type TeamStartupBehavior = 'restore' | 'launch-view' | 'minimized'
export type TeamThemePreset = 'zen' | 'clay' | 'zen-light'
export type TeamMessageDensity = 'cozy' | 'compact'
export type TeamChatWidth = 'comfortable' | 'wide' | 'full'
export type TeamSidebarWidth = 'compact' | 'default' | 'wide'
export type TeamRightPaneDefault = 'open' | 'collapsed'
export type TeamUiFont = 'Zen' | 'Inter' | 'System'
export type TeamCodeFont = 'Zen Mono' | 'JetBrains Mono' | 'System Mono'
export type TeamDockIconMode = 'branded' | 'minimal'
export type TeamEnterToSend = 'enter' | 'mod-enter'
export type TeamEffortDisplay = 'word' | 'bars'
export type TeamDefaultModel = 'enso' | 'zen6-coder' | 'zen6-ultra'
export type TeamKoeVoice = 'koe-nova' | 'koe-alloy' | 'koe-echo'
export type TeamNoiseSuppression = 'krisp-ai' | 'standard' | 'off'

export type HanzoTeamSettings = {
  // General
  defaultLaunchView: TeamLaunchView
  startupBehavior: TeamStartupBehavior
  desktopNotifications: boolean
  defaultModel: TeamDefaultModel

  // Appearance & Layout (Hanzo Dev Unified)
  themePreset: TeamThemePreset
  colorMode: HanzoThemePreference
  messageDensity: TeamMessageDensity
  chatWidth: TeamChatWidth
  sidebarWidth: TeamSidebarWidth
  rightPaneDefault: TeamRightPaneDefault
  appearanceContrast: number
  surfaceSolidness: number
  uiFont: TeamUiFont
  codeFont: TeamCodeFont
  fontSizePx: number
  panelAnimationMs: number
  dockIcon: TeamDockIconMode

  // Chat & Threads
  enterToSend: TeamEnterToSend
  effortDisplay: TeamEffortDisplay
  renderMarkdownAndMath: boolean
  autoOpenThreadOnReply: boolean

  // Voice & Office
  officeDefaultAudio: 'live' | 'muted'
  officeDefaultVideo: 'off' | 'on'
  koeVoice: TeamKoeVoice
  noiseSuppression: TeamNoiseSuppression
  pushToTalk: boolean

  // Agents & Workplace
  botDevEnabled: boolean
  botCyberEnabled: boolean
  botOpsEnabled: boolean
  botPmEnabled: boolean
  providerZen6Enabled: boolean
  providerAnthropicEnabled: boolean
  providerOpenAiEnabled: boolean
  providerLocalEnabled: boolean
  dailyStandupEnabled: boolean
  standupChannel: '#general' | '#engineering' | 'dm-vi'
  ciAlertRouting: '#incidents' | '#engineering' | 'inbox'

  // Connections & Access
  bridgeDiscord: boolean
  bridgeSlack: boolean
  bridgeMattermost: boolean
  webhookGithub: boolean
  webhookLinear: boolean
  mcpZapBusEnabled: boolean
  guestChannelsAllowed: boolean
  ssoEnforced: boolean
}

export const HANZO_APPEARANCE_KEY = 'hanzo.appearance'
export const HANZO_CHAT_PREFS_KEY = 'hanzo.chat.preferences'
export const HANZO_TEAM_SETTINGS_KEY = 'hanzo.team.settings.v1'

export const MIN_APPEARANCE_CONTRAST = 75
export const MAX_APPEARANCE_CONTRAST = 125
export const MIN_SURFACE_SOLIDNESS = 70
export const MAX_SURFACE_SOLIDNESS = 100
export const MIN_FONT_SIZE_PX = 12
export const MAX_FONT_SIZE_PX = 16
export const MIN_PANEL_ANIMATION_MS = 0
export const MAX_PANEL_ANIMATION_MS = 250

const VALID_THEMES = new Set<HanzoThemePreference>(['system', 'light', 'dark'])
const VALID_DENSITIES = new Set<HanzoDensityPreference>(['compact', 'default', 'spacious'])
const VALID_FONTS = new Set<HanzoFontPreference>(['compact', 'default', 'large'])
const VALID_ACCENTS = new Set<HanzoAccentPreference>(['ink', 'iris', 'jade', 'amber', 'coral', 'plum'])
const VALID_EFFORTS = new Set<HanzoEffortPreference>(['low', 'medium', 'high'])
const VALID_APPROVALS = new Set<HanzoApprovalMode>(['auto', 'manual'])

export const DEFAULT_APPEARANCE: HanzoAppearancePreferences = {
  theme: 'dark',
  density: 'default',
  font: 'default',
}

export const DEFAULT_CHAT_PREFS: HanzoChatPreferences = {
  effort: 'medium',
  approvalMode: 'auto',
  allowThirdPartyModels: true,
  spokenLanguage: 'auto',
}

export const DEFAULT_TEAM_SETTINGS: HanzoTeamSettings = {
  defaultLaunchView: 'channels',
  startupBehavior: 'restore',
  desktopNotifications: true,
  defaultModel: 'enso',

  themePreset: 'zen',
  colorMode: 'dark',
  messageDensity: 'cozy',
  chatWidth: 'comfortable',
  sidebarWidth: 'default',
  rightPaneDefault: 'open',
  appearanceContrast: 100,
  surfaceSolidness: 100,
  uiFont: 'Zen',
  codeFont: 'Zen Mono',
  fontSizePx: 14,
  panelAnimationMs: 150,
  dockIcon: 'branded',

  enterToSend: 'enter',
  effortDisplay: 'word',
  renderMarkdownAndMath: true,
  autoOpenThreadOnReply: true,

  officeDefaultAudio: 'live',
  officeDefaultVideo: 'off',
  koeVoice: 'koe-nova',
  noiseSuppression: 'krisp-ai',
  pushToTalk: false,

  botDevEnabled: true,
  botCyberEnabled: true,
  botOpsEnabled: true,
  botPmEnabled: true,
  providerZen6Enabled: true,
  providerAnthropicEnabled: true,
  providerOpenAiEnabled: true,
  providerLocalEnabled: true,
  dailyStandupEnabled: true,
  standupChannel: '#general',
  ciAlertRouting: '#incidents',

  bridgeDiscord: false,
  bridgeSlack: false,
  bridgeMattermost: false,
  webhookGithub: false,
  webhookLinear: false,
  mcpZapBusEnabled: false,
  guestChannelsAllowed: false,
  ssoEnforced: true,
}

type Listener = () => void
const listeners = new Set<Listener>()

const emit = () => {
  for (const fn of listeners) fn()
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' ? Math.round(val) : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function pickOne<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val) ? (val as T) : fallback
}

function pickBool(val: unknown, fallback: boolean): boolean {
  return typeof val === 'boolean' ? val : fallback
}

export function parseAppearancePreferences(raw: unknown): HanzoAppearancePreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APPEARANCE }
  const obj = raw as Record<string, unknown>
  const theme = VALID_THEMES.has(obj.theme as HanzoThemePreference)
    ? (obj.theme as HanzoThemePreference)
    : DEFAULT_APPEARANCE.theme
  const density = VALID_DENSITIES.has(obj.density as HanzoDensityPreference)
    ? (obj.density as HanzoDensityPreference)
    : DEFAULT_APPEARANCE.density
  const font = VALID_FONTS.has(obj.font as HanzoFontPreference)
    ? (obj.font as HanzoFontPreference)
    : DEFAULT_APPEARANCE.font
  const accent = VALID_ACCENTS.has(obj.accent as HanzoAccentPreference)
    ? (obj.accent as HanzoAccentPreference)
    : undefined
  return accent ? { theme, density, font, accent } : { theme, density, font }
}

export function parseChatPreferences(raw: unknown): HanzoChatPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHAT_PREFS }
  const obj = raw as Record<string, unknown>
  return {
    effort: VALID_EFFORTS.has(obj.effort as HanzoEffortPreference)
      ? (obj.effort as HanzoEffortPreference)
      : DEFAULT_CHAT_PREFS.effort,
    approvalMode: VALID_APPROVALS.has(obj.approvalMode as HanzoApprovalMode)
      ? (obj.approvalMode as HanzoApprovalMode)
      : DEFAULT_CHAT_PREFS.approvalMode,
    allowThirdPartyModels:
      typeof obj.allowThirdPartyModels === 'boolean'
        ? obj.allowThirdPartyModels
        : DEFAULT_CHAT_PREFS.allowThirdPartyModels,
    spokenLanguage:
      typeof obj.spokenLanguage === 'string' && obj.spokenLanguage.trim()
        ? obj.spokenLanguage.trim()
        : DEFAULT_CHAT_PREFS.spokenLanguage,
  }
}

export function parseTeamSettings(raw: unknown): HanzoTeamSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TEAM_SETTINGS }
  const o = raw as Record<string, unknown>
  const d = DEFAULT_TEAM_SETTINGS
  return {
    defaultLaunchView: pickOne(o.defaultLaunchView, ['channels', 'home', 'messages', 'tasks', 'office'], d.defaultLaunchView),
    startupBehavior: pickOne(o.startupBehavior, ['restore', 'launch-view', 'minimized'], d.startupBehavior),
    desktopNotifications: pickBool(o.desktopNotifications, d.desktopNotifications),
    defaultModel: pickOne(o.defaultModel, ['enso', 'zen6-coder', 'zen6-ultra'], d.defaultModel),

    themePreset: pickOne(o.themePreset, ['zen', 'clay', 'zen-light'], d.themePreset),
    colorMode: pickOne(o.colorMode, ['dark', 'light', 'system'], d.colorMode),
    messageDensity: pickOne(o.messageDensity, ['cozy', 'compact'], d.messageDensity),
    chatWidth: pickOne(o.chatWidth, ['comfortable', 'wide', 'full'], d.chatWidth),
    sidebarWidth: pickOne(o.sidebarWidth, ['compact', 'default', 'wide'], d.sidebarWidth),
    rightPaneDefault: pickOne(o.rightPaneDefault, ['open', 'collapsed'], d.rightPaneDefault),
    appearanceContrast: clampInt(o.appearanceContrast, MIN_APPEARANCE_CONTRAST, MAX_APPEARANCE_CONTRAST, d.appearanceContrast),
    surfaceSolidness: clampInt(o.surfaceSolidness, MIN_SURFACE_SOLIDNESS, MAX_SURFACE_SOLIDNESS, d.surfaceSolidness),
    uiFont: pickOne(o.uiFont, ['Zen', 'Inter', 'System'], d.uiFont),
    codeFont: pickOne(o.codeFont, ['Zen Mono', 'JetBrains Mono', 'System Mono'], d.codeFont),
    fontSizePx: clampInt(o.fontSizePx, MIN_FONT_SIZE_PX, MAX_FONT_SIZE_PX, d.fontSizePx),
    panelAnimationMs: clampInt(o.panelAnimationMs, MIN_PANEL_ANIMATION_MS, MAX_PANEL_ANIMATION_MS, d.panelAnimationMs),
    dockIcon: pickOne(o.dockIcon, ['branded', 'minimal'], d.dockIcon),

    enterToSend: pickOne(o.enterToSend, ['enter', 'mod-enter'], d.enterToSend),
    effortDisplay: pickOne(o.effortDisplay, ['word', 'bars'], d.effortDisplay),
    renderMarkdownAndMath: pickBool(o.renderMarkdownAndMath, d.renderMarkdownAndMath),
    autoOpenThreadOnReply: pickBool(o.autoOpenThreadOnReply, d.autoOpenThreadOnReply),

    officeDefaultAudio: pickOne(o.officeDefaultAudio, ['live', 'muted'], d.officeDefaultAudio),
    officeDefaultVideo: pickOne(o.officeDefaultVideo, ['off', 'on'], d.officeDefaultVideo),
    koeVoice: pickOne(o.koeVoice, ['koe-nova', 'koe-alloy', 'koe-echo'], d.koeVoice),
    noiseSuppression: pickOne(o.noiseSuppression, ['krisp-ai', 'standard', 'off'], d.noiseSuppression),
    pushToTalk: pickBool(o.pushToTalk, d.pushToTalk),

    botDevEnabled: pickBool(o.botDevEnabled, d.botDevEnabled),
    botCyberEnabled: pickBool(o.botCyberEnabled, d.botCyberEnabled),
    botOpsEnabled: pickBool(o.botOpsEnabled, d.botOpsEnabled),
    botPmEnabled: pickBool(o.botPmEnabled, d.botPmEnabled),
    providerZen6Enabled: pickBool(o.providerZen6Enabled, d.providerZen6Enabled),
    providerAnthropicEnabled: pickBool(o.providerAnthropicEnabled, d.providerAnthropicEnabled),
    providerOpenAiEnabled: pickBool(o.providerOpenAiEnabled, d.providerOpenAiEnabled),
    providerLocalEnabled: pickBool(o.providerLocalEnabled, d.providerLocalEnabled),
    dailyStandupEnabled: pickBool(o.dailyStandupEnabled, d.dailyStandupEnabled),
    standupChannel: pickOne(o.standupChannel, ['#general', '#engineering', 'dm-vi'], d.standupChannel),
    ciAlertRouting: pickOne(o.ciAlertRouting, ['#incidents', '#engineering', 'inbox'], d.ciAlertRouting),

    bridgeDiscord: pickBool(o.bridgeDiscord, d.bridgeDiscord),
    bridgeSlack: pickBool(o.bridgeSlack, d.bridgeSlack),
    bridgeMattermost: pickBool(o.bridgeMattermost, d.bridgeMattermost),
    webhookGithub: pickBool(o.webhookGithub, d.webhookGithub),
    webhookLinear: pickBool(o.webhookLinear, d.webhookLinear),
    mcpZapBusEnabled: pickBool(o.mcpZapBusEnabled, d.mcpZapBusEnabled),
    guestChannelsAllowed: pickBool(o.guestChannelsAllowed, d.guestChannelsAllowed),
    ssoEnforced: pickBool(o.ssoEnforced, d.ssoEnforced),
  }
}

export function readAppearancePreferences(): HanzoAppearancePreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_APPEARANCE }
  try {
    const raw = window.localStorage.getItem(HANZO_APPEARANCE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }
    return parseAppearancePreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function readChatPreferences(): HanzoChatPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_CHAT_PREFS }
  try {
    const raw = window.localStorage.getItem(HANZO_CHAT_PREFS_KEY)
    if (!raw) return { ...DEFAULT_CHAT_PREFS }
    return parseChatPreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CHAT_PREFS }
  }
}

export function readTeamSettings(): HanzoTeamSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_TEAM_SETTINGS }
  try {
    const raw = window.localStorage.getItem(HANZO_TEAM_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_TEAM_SETTINGS }
    return parseTeamSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_TEAM_SETTINGS }
  }
}

export function resolveEffectiveTheme(theme: HanzoThemePreference): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function sidebarWidthPxFor(w: TeamSidebarWidth): number {
  if (w === 'compact') return 216
  if (w === 'wide') return 288
  return 248
}

export function chatMaxWidthCssFor(w: TeamChatWidth): string {
  if (w === 'full') return '100%'
  if (w === 'wide') return '1200px'
  return '920px'
}

export function launchPathFor(view: TeamLaunchView): string {
  switch (view) {
    case 'home':
      return '/home'
    case 'messages':
      return '/inbox'
    case 'tasks':
      return '/issues'
    case 'office':
      return '/office'
    case 'channels':
    default:
      return '/chat/engineering'
  }
}

const HANZO_PAY_URL = 'https://hanzo.ai/pay'

/** Build the Hanzo Pay billing URL, scoping to `?org=` when an active org is present. */
export function billingUrl(org?: string | null): string {
  const clean = org?.trim()
  if (!clean || clean === 'local') return HANZO_PAY_URL
  return `${HANZO_PAY_URL}?org=${encodeURIComponent(clean)}`
}

export function fontScaleFor(font: HanzoFontPreference): string {
  if (font === 'compact') return '0.92'
  if (font === 'large') return '1.08'
  return '1'
}

function uiFontStackFor(font: TeamUiFont): string {
  if (font === 'Inter') return "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  if (font === 'System') return "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
  return "'Zen', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif"
}

function codeFontStackFor(font: TeamCodeFont): string {
  if (font === 'JetBrains Mono') return "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
  if (font === 'System Mono') return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  return "'Zen Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
}

export function applyAppearanceToDocument(prefs: HanzoAppearancePreferences): 'light' | 'dark' {
  const resolved = resolveEffectiveTheme(prefs.theme)
  if (typeof document === 'undefined') return resolved
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.density = prefs.density
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.style.setProperty('--hanzo-font-scale', fontScaleFor(prefs.font))
  if (prefs.accent) root.dataset.accent = prefs.accent
  const bg = window.getComputedStyle(root).getPropertyValue('--background').trim()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && bg) meta.setAttribute('content', bg)
  return resolved
}

export function applyTeamSettingsToDocument(settings: HanzoTeamSettings): 'light' | 'dark' {
  const effectiveMode: 'light' | 'dark' =
    settings.themePreset === 'zen-light'
      ? 'light'
      : settings.colorMode === 'system'
        ? resolveEffectiveTheme('system')
        : settings.colorMode
  if (typeof document === 'undefined') return effectiveMode
  const root = document.documentElement
  const appearanceAttr =
    effectiveMode === 'light' ? 'light' : settings.themePreset === 'clay' ? 'clay' : 'zen'

  root.dataset.appearance = appearanceAttr
  root.dataset.theme = effectiveMode
  root.dataset.messageDensity = settings.messageDensity
  root.dataset.chatWidth = settings.chatWidth
  root.dataset.customContrast = settings.appearanceContrast !== 100 ? 'true' : 'false'
  root.classList.toggle('dark', effectiveMode === 'dark')
  root.classList.toggle('light', effectiveMode === 'light')
  root.style.colorScheme = effectiveMode

  root.style.setProperty('--team-contrast', `${settings.appearanceContrast}%`)
  root.style.setProperty('--team-solidness', (settings.surfaceSolidness / 100).toFixed(2))
  root.style.setProperty('--team-panel-anim-ms', `${settings.panelAnimationMs}ms`)
  root.style.setProperty('--font-sans', uiFontStackFor(settings.uiFont))
  root.style.setProperty('--font-mono', codeFontStackFor(settings.codeFont))
  root.style.setProperty('--team-font-size-px', `${settings.fontSizePx}px`)
  root.style.setProperty('--hanzo-font-scale', (settings.fontSizePx / 14).toFixed(3))
  root.style.setProperty('--team-chat-max-w', chatMaxWidthCssFor(settings.chatWidth))
  root.style.setProperty('--team-sidebar-w', `${sidebarWidthPxFor(settings.sidebarWidth)}px`)

  return effectiveMode
}

export function writeAppearancePreferences(patch: Partial<HanzoAppearancePreferences>): HanzoAppearancePreferences {
  const next = parseAppearancePreferences({ ...readAppearancePreferences(), ...patch })
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HANZO_APPEARANCE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage quota errors
    }
  }
  applyAppearanceToDocument(next)
  emit()
  return next
}

export function writeChatPreferences(patch: Partial<HanzoChatPreferences>): HanzoChatPreferences {
  const next = parseChatPreferences({ ...readChatPreferences(), ...patch })
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HANZO_CHAT_PREFS_KEY, JSON.stringify(next))
    } catch {
      // ignore storage quota errors
    }
  }
  emit()
  return next
}

export function writeTeamSettings(patch: Partial<HanzoTeamSettings>): HanzoTeamSettings {
  const current = readTeamSettings()
  const merged = { ...current, ...patch }
  // Sync themePreset <-> colorMode coherently
  if (patch.themePreset === 'zen-light' && patch.colorMode === undefined) {
    merged.colorMode = 'light'
  } else if ((patch.themePreset === 'zen' || patch.themePreset === 'clay') && patch.colorMode === undefined && current.colorMode === 'light') {
    merged.colorMode = 'dark'
  } else if (patch.colorMode === 'light' && patch.themePreset === undefined) {
    merged.themePreset = 'zen-light'
  } else if (patch.colorMode === 'dark' && patch.themePreset === undefined && current.themePreset === 'zen-light') {
    merged.themePreset = 'zen'
  }

  const next = parseTeamSettings(merged)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HANZO_TEAM_SETTINGS_KEY, JSON.stringify(next))
      window.localStorage.setItem(
        'hanzo.team.appearance_mode',
        next.themePreset === 'zen-light' || next.colorMode === 'light'
          ? 'light'
          : next.themePreset === 'clay'
            ? 'clay'
            : 'zen',
      )
      window.localStorage.setItem('hanzo.team.notifs', next.desktopNotifications ? 'on' : 'off')
      const prevApp = readAppearancePreferences()
      window.localStorage.setItem(
        HANZO_APPEARANCE_KEY,
        JSON.stringify({
          ...prevApp,
          theme: next.colorMode,
          density: next.messageDensity === 'compact' ? 'compact' : 'default',
        }),
      )
    } catch {
      // ignore storage quota errors
    }
  }
  applyTeamSettingsToDocument(next)
  emit()
  return next
}

export function resetTeamSetting<K extends keyof HanzoTeamSettings>(key: K): HanzoTeamSettings {
  return writeTeamSettings({ [key]: DEFAULT_TEAM_SETTINGS[key] } as Partial<HanzoTeamSettings>)
}

/**
 * Syncs the caller's IAM account appearance (`GET /v1/account/appearance`) when signed in,
 * strictly validating every field before merging into local preferences.
 */
export async function syncAccountAppearance(token?: string | null): Promise<void> {
  if (!token || typeof fetch !== 'function') return
  try {
    const res = await fetch('https://api.hanzo.ai/v1/account/appearance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) return
    const body: unknown = await res.json()
    if (!body || typeof body !== 'object') return
    const obj = body as Record<string, unknown>
    const patch: Partial<HanzoAppearancePreferences> = {}
    if (VALID_FONTS.has(obj.font as HanzoFontPreference)) patch.font = obj.font as HanzoFontPreference
    if (VALID_DENSITIES.has(obj.density as HanzoDensityPreference)) patch.density = obj.density as HanzoDensityPreference
    if (VALID_ACCENTS.has(obj.accent as HanzoAccentPreference)) patch.accent = obj.accent as HanzoAccentPreference
    if (Object.keys(patch).length > 0) writeAppearancePreferences(patch)
  } catch {
    // non-fatal network or parse failure
  }
}

export function useHanzoPreferences() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    listeners.add(bump)
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === HANZO_APPEARANCE_KEY ||
        e.key === HANZO_CHAT_PREFS_KEY ||
        e.key === HANZO_TEAM_SETTINGS_KEY
      ) {
        applyTeamSettingsToDocument(readTeamSettings())
        bump()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(bump)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const appearance = readAppearancePreferences()
  const chat = readChatPreferences()
  const settings = readTeamSettings()
  const effectiveTheme: 'light' | 'dark' =
    settings.themePreset === 'zen-light'
      ? 'light'
      : resolveEffectiveTheme(settings.colorMode)

  return {
    appearance,
    chat,
    settings,
    effectiveTheme,
    setAppearance: writeAppearancePreferences,
    setChat: writeChatPreferences,
    updateSettings: writeTeamSettings,
    resetSetting: resetTeamSetting,
  }
}

export function useTeamSettings() {
  return useHanzoPreferences()
}
