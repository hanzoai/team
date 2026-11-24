/** True inside the Hanzo desktop shell (Tauri or Electron), never in a browser tab. */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
    hanzoDesktop?: unknown
    location?: { protocol?: string; hostname?: string; search?: string }
  }
  const protocol = w.location?.protocol ?? ''
  const hostname = (w.location?.hostname ?? '').toLowerCase()
  if (protocol === 'tauri:' || hostname === 'tauri.localhost') return true
  try {
    const q = new URLSearchParams(w.location?.search ?? '')
    if (q.get('desktop') === '1' || q.get('desktop') === 'true') return true
  } catch {
    /* ignore malformed query */
  }
  return Boolean(
    w.__TAURI__ ||
      w.__TAURI_INTERNALS__ ||
      w.hanzoDesktop ||
      document.documentElement.dataset.desktop === 'true' ||
      /\b(Tauri|Electron)\//.test(navigator.userAgent),
  )
}

/** Room the shell's overlay title bar keeps for the macOS traffic lights, top-left. */
export const DESKTOP_INSET = 80

/** Canonical web origin used when bundled Tauri serves from `tauri://localhost` or `http://tauri.localhost`. */
export const CANONICAL_TEAM_ORIGIN = 'https://hanzo.team'

export function resolveAppOrigin(
  loc: { readonly protocol?: string; readonly hostname?: string; readonly origin?: string } | undefined =
    typeof window !== 'undefined' ? window.location : undefined,
  fallback: string = CANONICAL_TEAM_ORIGIN,
): string {
  if (!loc?.origin || loc.origin === 'null') return fallback
  const protocol = loc.protocol ?? ''
  const hostname = (loc.hostname ?? '').toLowerCase()
  if (protocol === 'tauri:' || protocol === 'file:' || hostname === 'tauri.localhost') {
    return fallback
  }
  return loc.origin
}
