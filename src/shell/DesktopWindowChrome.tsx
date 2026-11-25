'use client'

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { isDesktopApp, isMacDesktop } from '~/data/desktop.ts'

const MENU_BG = 'var(--hanzo-menu-bg, #121214)'
const MENU_FG = 'var(--hanzo-menu-fg, #fafafa)'
const MENU_MUTED = 'var(--hanzo-menu-muted, #a1a1aa)'
const MENU_HOVER = 'var(--hanzo-menu-hover, rgba(255, 255, 255, 0.08))'
const MENU_BORDER = 'var(--hanzo-menu-border, rgba(255, 255, 255, 0.12))'
const MENU_SHADOW = 'var(--hanzo-menu-shadow, rgba(0, 0, 0, 0.68))'
const CLOSE_HOVER = 'var(--state-error, #e5484d)'

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

function invokeWindowCmd(cmd: string): Promise<unknown> {
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
  if (w.__TAURI_INTERNALS__?.invoke) return w.__TAURI_INTERNALS__.invoke(cmd, { label })
  if (w.__TAURI__?.core?.invoke) return w.__TAURI__.core.invoke(cmd, { label })
  return Promise.resolve(null)
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

const CTRL_BTN_BASE: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: MENU_MUTED,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  transition: 'background-color 0.14s ease, color 0.14s ease',
}

export function DesktopWindowControls() {
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
        .then((v) => setMaximized(Boolean(v)))
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
          backgroundColor: hovered === 'min' ? MENU_HOVER : 'transparent',
          color: hovered === 'min' ? MENU_FG : MENU_MUTED,
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
          void Promise.resolve(act).then(() => setMaximized((m) => !m))
        }}
        style={{
          ...CTRL_BTN_BASE,
          backgroundColor: hovered === 'max' ? MENU_HOVER : 'transparent',
          color: hovered === 'max' ? MENU_FG : MENU_MUTED,
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
          color: hovered === 'close' ? MENU_FG : MENU_MUTED,
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
  { label: 'Home', path: '/' },
  { label: 'Channels', path: '/chat' },
  { label: 'Issues', path: '/issues' },
  { label: 'Docs', path: '/docs' },
] as const

export function DesktopAppMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const active = isDesktopApp() && !isMacDesktop()

  useEffect(() => {
    if (!active) return
    const onDocDown = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        window.location.reload()
      }
      if (e.altKey && e.key === 'F4') {
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
  }, [active, open])

  if (!active) return null

  const rowStyle = (id: string): CSSProperties => ({
    width: '100%',
    height: 32,
    padding: '0 10px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: hoverIdx === id ? MENU_HOVER : 'transparent',
    color: MENU_FG,
    fontSize: 13,
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
        onClick={() => setOpen((v) => !v)}
        style={{
          ...CTRL_BTN_BASE,
          borderRadius: 8,
          backgroundColor: open ? MENU_HOVER : 'transparent',
          color: open ? MENU_FG : MENU_MUTED,
        }}
      >
        <svg width="15" height="9" viewBox="0 0 19 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M1 1h17M1 10h10.7" />
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
            left: 10,
            minWidth: 212,
            padding: 6,
            borderRadius: 10,
            backgroundColor: MENU_BG,
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            border: `1px solid ${MENU_BORDER}`,
            boxShadow: `0 16px 40px ${MENU_SHADOW}`,
            zIndex: 200000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
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
          <div style={{ height: 1, margin: '4px 4px', backgroundColor: MENU_BORDER }} />
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
            <span style={{ fontSize: 11, color: MENU_MUTED }}>Ctrl+R</span>
          </button>
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
            <span style={{ fontSize: 11, color: MENU_MUTED }}>Alt+F4</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
