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

export const HANZO_APPEARANCE_KEY = 'hanzo.appearance'
export const HANZO_CHAT_PREFS_KEY = 'hanzo.chat.preferences'

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

type Listener = () => void
const listeners = new Set<Listener>()

const emit = () => {
  for (const fn of listeners) fn()
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

export function resolveEffectiveTheme(theme: HanzoThemePreference): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function fontScaleFor(font: HanzoFontPreference): string {
  if (font === 'compact') return '0.92'
  if (font === 'large') return '1.08'
  return '1'
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
      if (e.key === HANZO_APPEARANCE_KEY || e.key === HANZO_CHAT_PREFS_KEY) {
        applyAppearanceToDocument(readAppearancePreferences())
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
  return {
    appearance,
    chat,
    effectiveTheme: resolveEffectiveTheme(appearance.theme),
    setAppearance: writeAppearancePreferences,
    setChat: writeChatPreferences,
  }
}
