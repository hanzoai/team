import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  installRtcIceSanitizer,
  isValidIceServerUrl,
  sanitizeRtcConfiguration,
} from './meet.ts'

test('isValidIceServerUrl accepts valid STUN/TURN URLs and rejects malformed Go-struct URLs', () => {
  assert.equal(isValidIceServerUrl('turns:turn.hanzo.ai:443?transport=tcp'), true)
  assert.equal(isValidIceServerUrl('turn:turn.hanzo.ai:3478?transport=udp'), true)
  assert.equal(isValidIceServerUrl('stun:stun.l.google.com:19302'), true)
  assert.equal(isValidIceServerUrl('stuns:stun.hanzo.ai:5349'), true)

  // Production regression: live.hanzo.ai returned Go struct `{10.42.0.30 }` inside TURN URL
  assert.equal(isValidIceServerUrl('turn:{10.42.0.30 }:3478?transport=udp'), false)
  assert.equal(isValidIceServerUrl('turn:10.42.0.30 :3478'), false)
  assert.equal(isValidIceServerUrl('https://live.hanzo.ai'), false)
  assert.equal(isValidIceServerUrl(''), false)
  assert.equal(isValidIceServerUrl(null), false)
})

test('sanitizeRtcConfiguration strips malformed ICE URLs while preserving valid TURN/STUN entries and credentials', () => {
  const input: RTCConfiguration = {
    iceServers: [
      {
        urls: ['turn:{10.42.0.30 }:3478?transport=udp', 'turns:turn.hanzo.ai:443?transport=tcp'],
        username: 'lk-user',
        credential: 'lk-cred',
      },
      {
        urls: 'turn:{bad host}:3478',
      },
    ],
  }

  const out = sanitizeRtcConfiguration(input)
  assert.ok(out)
  assert.equal(out.iceServers?.length, 1)
  assert.deepEqual(out.iceServers?.[0], {
    urls: ['turns:turn.hanzo.ai:443?transport=tcp'],
    username: 'lk-user',
    credential: 'lk-cred',
  })

  // Valid configuration is returned unchanged by reference
  const clean: RTCConfiguration = {
    iceServers: [{ urls: ['turns:turn.hanzo.ai:443?transport=tcp'] }],
  }
  assert.equal(sanitizeRtcConfiguration(clean), clean)
})

test('installRtcIceSanitizer idempotently wraps RTCPeerConnection.prototype.setConfiguration', () => {
  const prev = (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection
  const seen: Array<RTCConfiguration | undefined> = []

  class FakeRTCPeerConnection {
    setConfiguration(cfg?: RTCConfiguration): void {
      seen.push(cfg)
    }
  }

  ;(globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = FakeRTCPeerConnection
  try {
    installRtcIceSanitizer()
    installRtcIceSanitizer() // idempotent second call

    const pc = new FakeRTCPeerConnection()
    pc.setConfiguration({
      iceServers: [
        { urls: ['turn:{10.42.0.30 }:3478?transport=udp', 'turns:turn.hanzo.ai:443?transport=tcp'] },
      ],
    })

    assert.equal(seen.length, 1)
    assert.deepEqual(seen[0]?.iceServers, [{ urls: ['turns:turn.hanzo.ai:443?transport=tcp'] }])
  } finally {
    ;(globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = prev
  }
})
