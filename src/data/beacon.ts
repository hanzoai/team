/**
 * Ensures analytics beacons (`POST /v1/event` and `GET /v1/project/tags`) carry
 * `keepalive: true` so rapid page transitions or OAuth redirects do not abort
 * in-flight requests and spam `net::ERR_ABORTED` in browser DevTools.
 */

const KEEPALIVE_MAX_BYTES = 60 * 1024
let installed = false

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function isEventBeaconUrl(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://hanzo.team')
    return parsed.pathname === '/v1/event' || parsed.pathname === '/v1/project/tags'
  } catch {
    return url.includes('/v1/event') || url.includes('/v1/project/tags')
  }
}

function bodyWithinKeepaliveLimit(body: BodyInit | null | undefined): boolean {
  if (body == null) return true
  if (typeof body === 'string') return body.length <= KEEPALIVE_MAX_BYTES
  if (body instanceof Blob) return body.size <= KEEPALIVE_MAX_BYTES
  if (body instanceof ArrayBuffer) return body.byteLength <= KEEPALIVE_MAX_BYTES
  if (ArrayBuffer.isView(body)) return body.byteLength <= KEEPALIVE_MAX_BYTES
  return false
}

export function installEventBeaconKeepalive(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return
  installed = true
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = extractUrl(input)
    if (isEventBeaconUrl(url) && init?.keepalive === undefined && bodyWithinKeepaliveLimit(init?.body)) {
      return nativeFetch(input, { ...init, keepalive: true })
    }
    return nativeFetch(input, init)
  }
}
