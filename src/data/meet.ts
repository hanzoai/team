/**
 * Real Hanzo Meet (`/v1/meet/*`) + LiveKit WebRTC (`livekit-client`) media plane.
 *
 * Connects the Virtual Office, Voice Huddles, and Bot/Team calls directly to
 * `wss://live.hanzo.ai` (resolved at runtime from `/v1/meet/session` & `/v1/meet/call`)
 * using signed LiveKit JWTs minted by `POST /v1/meet/getToken`.
 */
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
} from 'livekit-client'

import { meet } from './api.ts'
import { call, Refused } from './http.ts'
import { iam } from './iam.ts'

export interface MeetHealthDto {
  ready: boolean
  service: string
  status: string
}

export interface MeetSpaceDto {
  uuid: string
  name: string
  url: string
  role: string
}

export interface MeetSessionDto {
  identity: string
  name: string
  ws: string
  spaces: MeetSpaceDto[]
}

export interface MeetVenueDto {
  name: string
  ws: string
  ready: boolean
}

export interface MeetRecordDto {
  roomName?: string
  recording?: boolean
  egressId?: string
  file?: string
  [key: string]: unknown
}

export type LiveConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface LiveParticipant {
  identity: string
  name: string
  isLocal: boolean
  isSpeaking: boolean
  micEnabled: boolean
  cameraEnabled: boolean
  screenSharing: boolean
}

export interface LiveRoomSnapshot {
  status: LiveConnectionStatus
  roomId: string | null
  roomName: string | null
  wsUrl: string | null
  error: string | null
  participants: LiveParticipant[]
  micMuted: boolean
  deafened: boolean
  cameraOn: boolean
  screenSharing: boolean
}

export async function getMeetHealth(): Promise<MeetHealthDto> {
  return call<MeetHealthDto>(meet.health)
}

export async function getMeetSession(): Promise<MeetSessionDto> {
  return call<MeetSessionDto>(meet.session)
}

export async function resolveMeetCall(space: string, channel: string): Promise<MeetVenueDto> {
  const q = new URLSearchParams({ space, channel })
  return call<MeetVenueDto>(`${meet.call}?${q.toString()}`)
}

export async function getMeetRecording(roomName: string): Promise<MeetRecordDto> {
  const q = new URLSearchParams({ roomName })
  return call<MeetRecordDto>(`${meet.record}?${q.toString()}`)
}

/**
 * Mint a signed LiveKit join JWT via `POST /v1/meet/getToken`.
 *
 * Per `cloud/apps/meet/meet.go:604`, this endpoint returns the RAW JWT as `text/plain`
 * (not wrapped in JSON). We also unwrap JSON quotes defensively if a proxy wraps it.
 */
export async function mintMeetToken(
  roomName: string,
  participantName: string,
  id = '',
): Promise<string> {
  const token = await iam()
    .getValidAccessToken()
    .catch(() => null)

  const res = await fetch(meet.getToken, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/plain, application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      roomName,
      _id: id,
      participantName,
    }),
  })
  const raw = (await res.text()).trim()
  if (!res.ok) {
    let detail = raw
    try {
      const parsed = JSON.parse(raw) as { detail?: string; message?: string; error?: { message?: string } }
      detail = parsed.detail ?? parsed.message ?? parsed.error?.message ?? raw
    } catch {
      /* raw text */
    }
    throw new Refused(res.status, detail || res.statusText)
  }
  if (!raw) throw new Refused(res.status, 'Empty LiveKit token response')
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return String(JSON.parse(raw))
    } catch {
      return raw.slice(1, -1)
    }
  }
  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as { token?: string }
      if (typeof obj.token === 'string' && obj.token) return obj.token
    } catch {
      /* ignore */
    }
  }
  return raw
}

function toLiveParticipant(p: Participant, isLocal: boolean): LiveParticipant {
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isLocal,
    isSpeaking: p.isSpeaking,
    micEnabled: p.isMicrophoneEnabled,
    cameraEnabled: p.isCameraEnabled,
    screenSharing: p.isScreenShareEnabled,
  }
}

const ICE_SERVER_URL_RE = /^(stuns?|turns?):[^\s{}<>]+$/i
const SANITIZER_INSTALLED = Symbol.for('hanzo.team.rtcIceSanitizerInstalled')

/**
 * Validates a WebRTC STUN/TURN URL before Chrome's `RTCPeerConnection.setConfiguration`
 * sees it (guards against malformed server ICE entries like `turn:{10.42.0.30 }:3478`).
 */
export function isValidIceServerUrl(url: unknown): url is string {
  return typeof url === 'string' && ICE_SERVER_URL_RE.test(url)
}

/**
 * Strips malformed STUN/TURN URLs from an `RTCConfiguration` while preserving
 * all valid entries and credentials untouched.
 */
export function sanitizeRtcConfiguration<T extends RTCConfiguration | undefined>(config: T): T {
  if (!config || !Array.isArray(config.iceServers)) return config
  let changed = false
  const cleaned: RTCIceServer[] = []
  for (const server of config.iceServers) {
    if (!server) continue
    if (Array.isArray(server.urls)) {
      const validUrls = server.urls.filter(isValidIceServerUrl)
      if (validUrls.length !== server.urls.length) changed = true
      if (validUrls.length > 0) cleaned.push({ ...server, urls: validUrls })
    } else if (typeof server.urls === 'string') {
      if (isValidIceServerUrl(server.urls)) {
        cleaned.push(server)
      } else {
        changed = true
      }
    }
  }
  if (!changed) return config
  return { ...config, iceServers: cleaned } as T
}

/**
 * Idempotently guards `RTCPeerConnection.prototype.setConfiguration` against
 * malformed ICE URLs sent in LiveKit `JoinResponse` payloads.
 */
export function installRtcIceSanitizer(): void {
  if (typeof globalThis === 'undefined') return
  const RTCPC = (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection
  if (!RTCPC?.prototype?.setConfiguration) return
  const proto = RTCPC.prototype as RTCPeerConnection & { [SANITIZER_INSTALLED]?: boolean }
  if (proto[SANITIZER_INSTALLED]) return
  const original = proto.setConfiguration
  proto.setConfiguration = function patchedSetConfiguration(configuration?: RTCConfiguration): void {
    return original.call(this, sanitizeRtcConfiguration(configuration))
  }
  proto[SANITIZER_INSTALLED] = true
}

export class MeetClient {
  private room: Room | null = null
  private audioElements = new Map<string, HTMLMediaElement>()
  private listeners = new Set<(snap: LiveRoomSnapshot) => void>()
  private snap: LiveRoomSnapshot = {
    status: 'disconnected',
    roomId: null,
    roomName: null,
    wsUrl: null,
    error: null,
    participants: [],
    micMuted: false,
    deafened: false,
    cameraOn: false,
    screenSharing: false,
  }

  getSnapshot(): LiveRoomSnapshot {
    return this.snap
  }

  subscribe(fn: (snap: LiveRoomSnapshot) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(patch: Partial<LiveRoomSnapshot>): void {
    this.snap = { ...this.snap, ...patch }
    for (const fn of this.listeners) fn(this.snap)
  }

  private syncParticipants(): void {
    const room = this.room
    if (!room) {
      this.emit({ participants: [] })
      return
    }
    const local: LiveParticipant = toLiveParticipant(room.localParticipant, true)
    const remotes: LiveParticipant[] = Array.from(room.remoteParticipants.values()).map((rp) =>
      toLiveParticipant(rp, false),
    )
    this.emit({
      participants: [local, ...remotes],
      micMuted: !room.localParticipant.isMicrophoneEnabled,
      cameraOn: room.localParticipant.isCameraEnabled,
      screenSharing: room.localParticipant.isScreenShareEnabled,
    })
  }

  private attachAudio(track: RemoteTrack): void {
    if (track.kind !== Track.Kind.Audio || typeof document === 'undefined') return
    const sid = track.sid ?? `audio-${Date.now()}`
    if (this.audioElements.has(sid)) return
    const el = track.attach()
    el.muted = this.snap.deafened
    el.style.display = 'none'
    document.body.appendChild(el)
    this.audioElements.set(sid, el)
  }

  private detachAudio(track: RemoteTrack): void {
    const sid = track.sid
    if (sid) {
      const el = this.audioElements.get(sid)
      if (el) {
        track.detach(el)
        el.remove()
        this.audioElements.delete(sid)
        return
      }
    }
    for (const el of track.detach()) el.remove()
  }

  private clearAudio(): void {
    for (const el of this.audioElements.values()) el.remove()
    this.audioElements.clear()
  }

  async join(opts: {
    spaceUuid: string
    roomId: string
    participantName: string
    accountId?: string
    micMuted?: boolean
    cameraOn?: boolean
  }): Promise<void> {
    await this.leave()

    const micMuted = Boolean(opts.micMuted)
    const cameraOn = Boolean(opts.cameraOn)
    this.emit({
      status: 'connecting',
      roomId: opts.roomId,
      roomName: null,
      wsUrl: null,
      error: null,
      participants: [],
      micMuted,
      cameraOn,
      screenSharing: false,
    })

    try {
      const venue = await resolveMeetCall(opts.spaceUuid, opts.roomId)
      if (!venue.ready) {
        throw new Error('Meet voice/video service is not ready on this deployment.')
      }
      const wsUrl = venue.ws || (await getMeetSession().catch(() => null))?.ws || ''
      if (!wsUrl) {
        throw new Error('Meet media server URL (ws) is not configured.')
      }

      const token = await mintMeetToken(venue.name, opts.participantName, opts.accountId ?? '')

      installRtcIceSanitizer()

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })
      this.room = room

      room
        .on(RoomEvent.ConnectionStateChanged, (st: ConnectionState) => {
          if (st === ConnectionState.Connected) {
            this.emit({ status: 'connected', error: null })
            this.syncParticipants()
          } else if (st === ConnectionState.Reconnecting) {
            this.emit({ status: 'reconnecting' })
          } else if (st === ConnectionState.Disconnected) {
            this.clearAudio()
            this.emit({
              status: 'disconnected',
              roomId: null,
              roomName: null,
              participants: [],
              screenSharing: false,
              cameraOn: false,
            })
          }
        })
        .on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => this.syncParticipants())
        .on(RoomEvent.ParticipantDisconnected, (_p: RemoteParticipant) => this.syncParticipants())
        .on(RoomEvent.ActiveSpeakersChanged, () => this.syncParticipants())
        .on(RoomEvent.TrackMuted, () => this.syncParticipants())
        .on(RoomEvent.TrackUnmuted, () => this.syncParticipants())
        .on(RoomEvent.LocalTrackPublished, () => this.syncParticipants())
        .on(RoomEvent.LocalTrackUnpublished, () => this.syncParticipants())
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          this.attachAudio(track)
          this.syncParticipants()
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          this.detachAudio(track)
          this.syncParticipants()
        })
        .on(RoomEvent.MediaDevicesError, (err: Error) => {
          this.emit({ error: err.message || 'Microphone/camera access denied' })
        })

      await room.connect(wsUrl, token)
      this.emit({
        status: 'connected',
        roomId: opts.roomId,
        roomName: venue.name,
        wsUrl,
        error: null,
      })

      // Publish microphone / camera per user preferences; non-fatal if browser lacks media devices.
      if (!micMuted) {
        await room.localParticipant.setMicrophoneEnabled(true).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Microphone unavailable'
          this.emit({ micMuted: true, error: msg })
        })
      }
      if (cameraOn) {
        await room.localParticipant.setCameraEnabled(true).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Camera unavailable'
          this.emit({ cameraOn: false, error: msg })
        })
      }

      this.syncParticipants()
    } catch (err) {
      this.clearAudio()
      if (this.room) {
        await this.room.disconnect().catch(() => undefined)
        this.room = null
      }
      const message = err instanceof Error ? err.message : 'Failed to join voice room'
      this.emit({
        status: 'error',
        roomId: null,
        roomName: null,
        participants: [],
        error: message,
        screenSharing: false,
        cameraOn: false,
      })
    }
  }

  async leave(): Promise<void> {
    const room = this.room
    this.room = null
    this.clearAudio()
    if (room) {
      await room.disconnect().catch(() => undefined)
    }
    this.emit({
      status: 'disconnected',
      roomId: null,
      roomName: null,
      error: null,
      participants: [],
      screenSharing: false,
      cameraOn: false,
    })
  }

  async setMuted(muted: boolean): Promise<void> {
    this.emit({ micMuted: muted })
    if (!this.room) return
    try {
      await this.room.localParticipant.setMicrophoneEnabled(!muted)
      this.syncParticipants()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone toggle failed'
      this.emit({ error: msg })
    }
  }

  async setDeafened(deafened: boolean): Promise<void> {
    for (const el of this.audioElements.values()) {
      el.muted = deafened
    }
    this.emit({ deafened, ...(deafened ? { micMuted: true } : {}) })
    if (deafened && this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined)
      this.syncParticipants()
    }
  }

  async setCamera(enabled: boolean): Promise<void> {
    this.emit({ cameraOn: enabled })
    if (!this.room) return
    try {
      await this.room.localParticipant.setCameraEnabled(enabled)
      this.syncParticipants()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera toggle failed'
      this.emit({ cameraOn: false, error: msg })
    }
  }

  async setScreenShare(enabled: boolean): Promise<void> {
    this.emit({ screenSharing: enabled })
    if (!this.room) return
    try {
      await this.room.localParticipant.setScreenShareEnabled(enabled)
      this.syncParticipants()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screen share failed'
      this.emit({ screenSharing: false, error: msg })
    }
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant ?? null
  }
}

export const meetClient = new MeetClient()
