'use client'

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { isDesktopApp, isMacDesktop } from '~/data/desktop.ts'
import { openSettingsModal } from '~/settings/SettingsModal.tsx'
import { useHanzoPreferences } from '~/settings/preferences.ts'
import {
  selectGuildOrg,
  setAppearanceMode,
  setPhoneModalOpen,
  useWorkspace,
  type AppearanceMode,
} from '~/workspace/store.ts'
import { openConnectModal } from './ConnectOrgModal.tsx'

const CLOSE_HOVER = 'var(--state-error, #e5484d)'
const CLOSE_FG = 'var(--hanzo-close-fg, #ffffff)'

function menuPalette(isLight: boolean) {
  return isLight
    ? {
        bg: 'var(--hanzo-menu-bg-light, #ffffff)',
        fg: 'var(--hanzo-menu-fg-light, #09090b)',
        muted: 'var(--hanzo-menu-muted-light, #52525b)',
        hover: 'var(--hanzo-menu-hover-light, rgba(0, 0, 0, 0.06))',
        border: 'var(--hanzo-menu-border-light, rgba(0, 0, 0, 0.10))',
        shadow: 'var(--hanzo-menu-shadow-light, rgba(0, 0, 0, 0.14))',
      }
    : {
        bg: 'var(--hanzo-menu-bg, #121214)',
        fg: 'var(--hanzo-menu-fg, #fafafa)',
        muted: 'var(--hanzo-menu-muted, #a1a1aa)',
        hover: 'var(--hanzo-menu-hover, rgba(255, 255, 255, 0.08))',
        border: 'var(--hanzo-menu-border, rgba(255, 255, 255, 0.12))',
        shadow: 'var(--hanzo-menu-shadow, rgba(0, 0, 0, 0.72))',
      }
}

type TauriWin = {
  label?: string
  startDragging?: () => Promise<void>
  minimize?: () => Promise<void>
  toggleMaximize?: () => Promise<void>
  isMaximized?: () => Promise<boolean>
  close?: () => Promise<void>
}

function getTauriWindow(): TauriWin | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => TauriWin } } }
  try {
    return w.__TAURI__?.window?.getCurrentWindow?.() ?? null
  } catch {
    return null
  }
}

function invokeWindowCmd(cmd: string, extra?: Record<string, unknown>): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  const w = window as unknown as {
    __TAURI_INTERNALS__?: {
      invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown>
      metadata?: { currentWindow?: { label?: string }; currentWebview?: { windowLabel?: string } }
    }
    __TAURI__?: { core?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> } }
  }
  const label =
    getTauriWindow()?.label ||
    w.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ||
    w.__TAURI_INTERNALS__?.metadata?.currentWebview?.windowLabel ||
    'main'
  const payload = { label, ...extra }
  if (w.__TAURI_INTERNALS__?.invoke) return w.__TAURI_INTERNALS__.invoke(cmd, payload)
  if (w.__TAURI__?.core?.invoke) return w.__TAURI__.core.invoke(cmd, payload)
  return Promise.resolve(null)
}

export type TeamWindowMode = 'login' | 'workspace' | 'mini'

let lastWindowMode: TeamWindowMode | null = null

export function getTeamDesktopWindowMode(): TeamWindowMode {
  if (typeof document !== 'undefined') {
    const m = document.documentElement.dataset.windowMode
    if (m === 'login' || m === 'mini' || m === 'workspace') return m
  }
  return lastWindowMode ?? 'workspace'
}

export function setTeamDesktopWindowMode(mode: TeamWindowMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.windowMode = mode
  }
  if (!isDesktopApp() || lastWindowMode === mode) return
  lastWindowMode = mode
  void invokeWindowCmd('team_set_window_mode', { mode }).catch(() => {
    const size =
      mode === 'login'
        ? { width: 460, height: 640 }
        : mode === 'mini'
          ? { width: 340, height: 560 }
          : { width: 1440, height: 900 }
    const min =
      mode === 'login'
        ? { width: 400, height: 560 }
        : mode === 'mini'
          ? { width: 320, height: 420 }
          : { width: 900, height: 600 }
    void invokeWindowCmd('plugin:window|set_min_size', { value: { Logical: min } })
    void invokeWindowCmd('plugin:window|set_size', { value: { Logical: size } })
  })
}

const INTERACTIVE_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'a:not([data-tauri-drag-region])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="combobox"]',
  '[aria-haspopup]',
  '[contenteditable="true"]',
  '[data-tauri-drag-region="false"]',
  '[data-slot="window-controls"]',
  '[data-slot="desktop-app-menu"]',
  '[data-slot="desktop-app-menu-trigger"]',
].join(', ')

function isInteractive(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && typeof el.closest === 'function' && el.closest(INTERACTIVE_SELECTOR))
}

let lastDragMouseDown = 0

export function dragDesktopWindow(e: ReactMouseEvent) {
  if (e.button !== 0 || isInteractive(e.target)) return
  lastDragMouseDown = Date.now()
  if (e.detail && e.detail > 1) return
  const win = getTauriWindow()
  if (win?.startDragging) {
    void win.startDragging().catch(() => invokeWindowCmd('plugin:window|start_dragging'))
    return
  }
  void invokeWindowCmd('plugin:window|start_dragging')
}

export function toggleDesktopMaximize(e: ReactMouseEvent) {
  if (isInteractive(e.target)) return
  const el = e.target as HTMLElement | null
  if (Date.now() - lastDragMouseDown > 500 && el?.closest?.('[data-tauri-drag-region]')) return
  const win = getTauriWindow()
  if (win?.toggleMaximize) {
    void win.toggleMaximize().catch(() => invokeWindowCmd('plugin:window|toggle_maximize'))
    return
  }
  void invokeWindowCmd('plugin:window|toggle_maximize')
}

export function closeDesktopWindow() {
  const win = getTauriWindow()
  if (win?.close) void win.close().catch(() => invokeWindowCmd('plugin:window|close'))
  else void invokeWindowCmd('plugin:window|close')
}

function syncDocMaximized(max: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.maximized = max ? 'true' : 'false'
  }
}

const CTRL_BTN_BASE: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  transition: 'background-color 0.14s ease, color 0.14s ease',
}

export function DesktopWindowControls() {
  const { effectiveTheme } = useHanzoPreferences()
  const pal = menuPalette(effectiveTheme === 'light')
  const [mounted, setMounted] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [hovered, setHovered] = useState<'min' | 'max' | 'close' | null>(null)

  useEffect(() => {
    const show = isDesktopApp() && !isMacDesktop()
    setMounted(show)
    if (!show) return
    const sync = () => {
      const win = getTauriWindow()
      const p = win?.isMaximized ? win.isMaximized() : invokeWindowCmd('plugin:window|is_maximized')
      void Promise.resolve(p)
        .then((v) => {
          const next = Boolean(v)
          setMaximized(next)
          syncDocMaximized(next)
        })
        .catch(() => {})
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  if (!mounted) return null

  return (
    <div
      data-slot="window-controls"
      data-tauri-drag-region="false"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, userSelect: 'none' }}
    >
      <button
        type="button"
        aria-label="Minimize"
        data-tauri-drag-region="false"
        onMouseEnter={() => setHovered('min')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          const win = getTauriWindow()
          if (win?.minimize) void win.minimize().catch(() => invokeWindowCmd('plugin:window|minimize'))
          else void invokeWindowCmd('plugin:window|minimize')
        }}
        style={{
          ...CTRL_BTN_BASE,
          backgroundColor: hovered === 'min' ? pal.hover : 'transparent',
          color: hovered === 'min' ? pal.fg : pal.muted,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2" y1="6" x2="10" y2="6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        data-tauri-drag-region="false"
        onMouseEnter={() => setHovered('max')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => {
          const win = getTauriWindow()
          const act = win?.toggleMaximize
            ? win.toggleMaximize().catch(() => invokeWindowCmd('plugin:window|toggle_maximize'))
            : invokeWindowCmd('plugin:window|toggle_maximize')
          void Promise.resolve(act).then(() =>
            setMaximized((m) => {
              const next = !m
              syncDocMaximized(next)
              return next
            }),
          )
        }}
        style={{
          ...CTRL_BTN_BASE,
          backgroundColor: hovered === 'max' ? pal.hover : 'transparent',
          color: hovered === 'max' ? pal.fg : pal.muted,
        }}
      >
        {maximized ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3.5" y="1.5" width="6.5" height="6.5" rx="1" />
            <path d="M1.5 4.5v5a1 1 0 0 0 1 1h5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="2" width="8" height="8" rx="1.5" />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        data-tauri-drag-region="false"
        onMouseEnter={() => setHovered('close')}
        onMouseLeave={() => setHovered(null)}
        onClick={closeDesktopWindow}
        style={{
          ...CTRL_BTN_BASE,
          backgroundColor: hovered === 'close' ? CLOSE_HOVER : 'transparent',
          color: hovered === 'close' ? CLOSE_FG : pal.muted,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" strokeLinecap="round" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

const APP_MENU_NAV = [
  { label: 'Home Briefing', path: '/home' },
  { label: 'Engineering (#engineering)', path: '/chat/engineering' },
  { label: 'Office Virtual HQ', path: '/office' },
  { label: 'Inbox & Approvals', path: '/inbox' },
  { label: 'Work & Objectives', path: '/issues' },
  { label: 'Spaces & Artifacts', path: '/spaces' },
] as const

const APPEARANCE_MODES: readonly { id: AppearanceMode; label: string }[] = [
  { id: 'zen', label: 'Zen' },
  { id: 'clay', label: 'Clay' },
  { id: 'light', label: 'Light' },
]

export function DesktopAppMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { effectiveTheme } = useHanzoPreferences()
  const { orgs, activeOrgId, appearanceMode } = useWorkspace()
  const pal = menuPalette(effectiveTheme === 'light')
  const [open, setOpen] = useState(false)
  const [hoverTrigger, setHoverTrigger] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const isMac = isMacDesktop()

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        window.location.reload()
      }
      if (isDesktopApp() && e.altKey && e.key === 'F4') {
        e.preventDefault()
        closeDesktopWindow()
      }
    }
    document.addEventListener('mousedown', onDocDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (isMac) return null

  const rowStyle = (id: string): CSSProperties => ({
    width: '100%',
    height: 30,
    padding: '0 10px',
    borderRadius: 7,
    border: 'none',
    backgroundColor: hoverIdx === id ? pal.hover : 'transparent',
    color: pal.fg,
    fontSize: 12.5,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    textAlign: 'left',
  })

  return (
    <div ref={wrapRef} data-tauri-drag-region="false" style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label="Application menu"
        aria-haspopup="menu"
        aria-expanded={open}
        data-slot="desktop-app-menu-trigger"
        data-tauri-drag-region="false"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={() => setHoverTrigger(true)}
        onMouseLeave={() => setHoverTrigger(false)}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...CTRL_BTN_BASE,
          width: 26,
          height: 26,
          borderRadius: 6,
          backgroundColor: open || hoverTrigger ? pal.hover : 'transparent',
          color: open || hoverTrigger ? pal.fg : pal.muted,
        }}
      >
        <svg width="14" height="9" viewBox="0 0 19 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M1 1.5h17M1 9.5h10.7" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Application menu"
          data-slot="desktop-app-menu"
          data-tauri-drag-region="false"
          style={{
            position: 'fixed',
            top: 40,
            left: 8,
            minWidth: 248,
            padding: 6,
            borderRadius: 10,
            backgroundColor: pal.bg,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${pal.border}`,
            boxShadow: `0 16px 40px ${pal.shadow}`,
            zIndex: 200000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onMouseEnter={() => setHoverIdx('phone')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              setPhoneModalOpen(true)
            }}
            style={rowStyle('phone')}
          >
            <span>Get Hanzo on your phone</span>
            <span style={{ fontSize: 10.5, color: pal.muted }}>iOS · Android</span>
          </button>

          <div style={{ height: 1, margin: '4px 5px', backgroundColor: pal.border }} />

          <div style={{ padding: '2px 10px', fontSize: 10.5, fontWeight: 600, color: pal.muted, letterSpacing: '0.06em' }}>
            SWITCH ORGANIZATION
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '2px 8px 4px' }}>
            {orgs.map((o) => {
              const active = o.id === activeOrgId
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    selectGuildOrg(o.id)
                    setOpen(false)
                  }}
                  style={{
                    flex: 1,
                    height: 26,
                    borderRadius: 6,
                    border: `1px solid ${pal.border}`,
                    backgroundColor: active ? pal.hover : 'transparent',
                    color: active ? pal.fg : pal.muted,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {o.name}
                </button>
              )
            })}
            <button
              type="button"
              aria-label="Connect organization"
              onClick={() => {
                setOpen(false)
                openConnectModal('connect')
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: `1px solid ${pal.border}`,
                backgroundColor: 'transparent',
                color: pal.muted,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>

          <div style={{ padding: '2px 10px', fontSize: 10.5, fontWeight: 600, color: pal.muted, letterSpacing: '0.06em' }}>
            APPEARANCE
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '2px 8px 4px' }}>
            {APPEARANCE_MODES.map((m) => {
              const active = appearanceMode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAppearanceMode(m.id)}
                  style={{
                    flex: 1,
                    height: 26,
                    borderRadius: 6,
                    border: `1px solid ${pal.border}`,
                    backgroundColor: active ? pal.hover : 'transparent',
                    color: active ? pal.fg : pal.muted,
                    fontSize: 11.5,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          <div style={{ height: 1, margin: '4px 5px', backgroundColor: pal.border }} />

          {APP_MENU_NAV.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              onMouseEnter={() => setHoverIdx(item.path)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => {
                setOpen(false)
                onNavigate(item.path)
              }}
              style={rowStyle(item.path)}
            >
              <span>{item.label}</span>
            </button>
          ))}

          <div style={{ height: 1, margin: '4px 5px', backgroundColor: pal.border }} />
          <button
            type="button"
            role="menuitem"
            onMouseEnter={() => setHoverIdx('appearance')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              openSettingsModal('appearance')
            }}
            style={rowStyle('appearance')}
          >
            <span>Appearance &amp; Layout</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onMouseEnter={() => setHoverIdx('node')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              openSettingsModal('node')
            }}
            style={rowStyle('node')}
          >
            <span>Local Models &amp; Node</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onMouseEnter={() => setHoverIdx('account')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              openSettingsModal('account')
            }}
            style={rowStyle('account')}
          >
            <span>Account &amp; Usage</span>
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="app-menu-settings-item"
            onMouseEnter={() => setHoverIdx('settings')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              openSettingsModal('general')
            }}
            style={rowStyle('settings')}
          >
            <span>Settings</span>
            <span style={{ fontSize: 11, color: pal.muted }}>Ctrl+,</span>
          </button>
          <div style={{ height: 1, margin: '4px 5px', backgroundColor: pal.border }} />
          <button
            type="button"
            role="menuitem"
            onMouseEnter={() => setHoverIdx('reload')}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => {
              setOpen(false)
              window.location.reload()
            }}
            style={rowStyle('reload')}
          >
            <span>Reload window</span>
            <span style={{ fontSize: 11, color: pal.muted }}>Ctrl+R</span>
          </button>
          {isDesktopApp() ? (
            <button
              type="button"
              role="menuitem"
              onMouseEnter={() => setHoverIdx('quit')}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => {
                setOpen(false)
                closeDesktopWindow()
              }}
              style={rowStyle('quit')}
            >
              <span>Quit</span>
              <span style={{ fontSize: 11, color: pal.muted }}>Alt+F4</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
