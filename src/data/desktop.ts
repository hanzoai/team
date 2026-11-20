/** True inside the Hanzo desktop shell (Tauri or Electron), never in a browser tab. */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown; hanzoDesktop?: unknown }
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
