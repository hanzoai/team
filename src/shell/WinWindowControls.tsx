import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
  '[data-tauri-drag-region="false"]',
  '[data-slot="window-controls"]',
].join(', ')

type TauriWin = {
  minimize?: () => Promise<void>
  toggleMaximize?: () => Promise<void>
  close?: () => Promise<void>
  isMaximized?: () => Promise<boolean>
  startDragging?: () => Promise<void>
}

function getWin(): TauriWin | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    __TAURI__?: { window?: { getCurrentWindow?: () => TauriWin } }
  }
  try {
    return w.__TAURI__?.window?.getCurrentWindow?.() ?? null
  } catch {
    return null
  }
}

function invokeWin(cmd: string): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  const w = window as unknown as {
    __TAURI_INTERNALS__?: {
      invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown>
      metadata?: { currentWindow?: { label?: string } }
    }
  }
  const label = w.__TAURI_INTERNALS__?.metadata?.currentWindow?.label || 'main'
  return w.__TAURI_INTERNALS__?.invoke?.(cmd, { label }) ?? Promise.resolve(false)
}

export function isFramelessDesktop(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  const isTauri = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__)
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)
  return isTauri && !isMac
}

function isInteractive(target: EventTarget | null): boolean {
  const el = target as Element | null
  return Boolean(el && typeof el.closest === 'function' && el.closest(INTERACTIVE_SELECTOR))
}

let lastDragDownAt = 0

export function startWindowDrag(e: MouseEvent<HTMLElement>): void {
  if (!isFramelessDesktop()) return
  if (e.button !== 0 || isInteractive(e.target)) return
  lastDragDownAt = Date.now()
  if (e.detail > 1) return
  const win = getWin()
  if (win?.startDragging) {
    void win.startDragging().catch(() => {})
    return
  }
  void invokeWin('plugin:window|start_dragging').catch(() => {})
}

export function toggleMaximizeWindow(e: MouseEvent<HTMLElement>): void {
  if (!isFramelessDesktop()) return
  if (isInteractive(e.target)) return
  if (Date.now() - lastDragDownAt > 500 && (e.target as Element | null)?.closest?.('[data-tauri-drag-region]')) {
    return
  }
  const win = getWin()
  if (win?.toggleMaximize) {
    void win.toggleMaximize().catch(() => {})
    return
  }
  void invokeWin('plugin:window|toggle_maximize').catch(() => {})
}

export function WinWindowControls() {
  const [maximized, setMaximized] = useState(false)
  const [hoverClose, setHoverClose] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const active = isFramelessDesktop()

  useEffect(() => {
    if (!active || typeof document === 'undefined') return
    document.documentElement.dataset.desktopFrameless = 'true'
    const sync = () => {
      const win = getWin()
      const p = win?.isMaximized ? win.isMaximized() : invokeWin('plugin:window|is_maximized')
      void Promise.resolve(p)
        .then((val) => {
          const next = Boolean(val)
          setMaximized(next)
          document.documentElement.dataset.maximized = next ? 'true' : 'false'
        })
        .catch(() => {})
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [active])

  if (!active) return null

  const onMin = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const win = getWin()
    if (win?.minimize) void win.minimize().catch(() => invokeWin('plugin:window|minimize'))
    else void invokeWin('plugin:window|minimize').catch(() => {})
  }

  const onMax = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const win = getWin()
    if (win?.toggleMaximize) await win.toggleMaximize().catch(() => invokeWin('plugin:window|toggle_maximize'))
    else await invokeWin('plugin:window|toggle_maximize').catch(() => {})
    const p = win?.isMaximized ? win.isMaximized() : invokeWin('plugin:window|is_maximized')
    void Promise.resolve(p)
      .then((val) => {
        const next = Boolean(val)
        setMaximized(next)
        document.documentElement.dataset.maximized = next ? 'true' : 'false'
      })
      .catch(() => {})
  }

  const onClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const win = getWin()
    if (win?.close) void win.close().catch(() => invokeWin('plugin:window|close'))
    else void invokeWin('plugin:window|close').catch(() => {})
  }

  const baseBtn = {
    width: 34,
    height: 26,
    borderRadius: 7,
    border: 0,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundClip: 'padding-box',
    transition: 'background-color 120ms ease, color 120ms ease',
  } as const

  return (
    <div
      data-slot="window-controls"
      data-tauri-drag-region="false"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        marginLeft: 6,
        flexShrink: 0,
        WebkitAppRegion: 'no-drag',
      } as CSSProperties}
    >
      <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={onMin}
        onMouseEnter={() => setHoverIdx(0)}
        onMouseLeave={() => setHoverIdx(null)}
        style={{
          ...baseBtn,
          backgroundColor: hoverIdx === 0 ? 'var(--team-hover, rgba(255,255,255,0.08))' : 'transparent',
          color: hoverIdx === 0 ? 'var(--team-ink, #f4f4f5)' : 'var(--team-mute, #a1a1aa)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={(e) => void onMax(e)}
        onMouseEnter={() => setHoverIdx(1)}
        onMouseLeave={() => setHoverIdx(null)}
        style={{
          ...baseBtn,
          backgroundColor: hoverIdx === 1 ? 'var(--team-hover, rgba(255,255,255,0.08))' : 'transparent',
          color: hoverIdx === 1 ? 'var(--team-ink, #f4f4f5)' : 'var(--team-mute, #a1a1aa)',
        }}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <rect x="2.7" y="1.3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.15" />
            <path d="M1.3 3.4v4.3a1 1 0 0 0 1 1h4.3" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={onClose}
        onMouseEnter={() => setHoverClose(true)}
        onMouseLeave={() => setHoverClose(false)}
        style={{
          ...baseBtn,
          backgroundColor: hoverClose ? 'var(--team-window-close, #e81123)' : 'transparent',
          color: hoverClose ? 'var(--team-window-close-ink, #ffffff)' : 'var(--team-mute, #a1a1aa)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
