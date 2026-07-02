//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { createHmac } from 'node:crypto'
import {
  verifySlackSignature,
  MAX_TIMESTAMP_SKEW_SEC,
  signOAuthState,
  verifyOAuthState,
  OAUTH_STATE_TTL_SEC
} from '../verify'

const SECRET = 'slack-signing-secret'

function sign (secret: string, timestamp: string, rawBody: string): string {
  return `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`
}

describe('verifySlackSignature', () => {
  const now = 1_700_000_000
  const ts = String(now)
  const body = JSON.stringify({ type: 'event_callback', event: { type: 'message' } })

  it('accepts a valid, fresh signature', () => {
    const sig = sign(SECRET, ts, body)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: ts, rawBody: body, now })).toBe(true)
  })

  it('rejects a wrong signing secret', () => {
    const sig = sign('wrong-secret', ts, body)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: ts, rawBody: body, now })).toBe(false)
  })

  it('rejects a tampered body (signature no longer matches)', () => {
    const sig = sign(SECRET, ts, body)
    const tampered = body + 'x'
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: ts, rawBody: tampered, now })).toBe(false)
  })

  it('rejects a replayed request outside the timestamp window', () => {
    const sig = sign(SECRET, ts, body)
    const later = now + MAX_TIMESTAMP_SKEW_SEC + 1
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: ts, rawBody: body, now: later })).toBe(false)
  })

  it('accepts within the window boundary', () => {
    const sig = sign(SECRET, ts, body)
    const edge = now + MAX_TIMESTAMP_SKEW_SEC
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: ts, rawBody: body, now: edge })).toBe(true)
  })

  it('rejects a future-dated timestamp beyond skew', () => {
    const future = now + MAX_TIMESTAMP_SKEW_SEC + 10
    const sig = sign(SECRET, String(future), body)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sig, timestamp: String(future), rawBody: body, now })).toBe(false)
  })

  it('rejects empty / malformed inputs without throwing', () => {
    expect(verifySlackSignature({ signingSecret: '', signature: 'v0=x', timestamp: ts, rawBody: body, now })).toBe(false)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: '', timestamp: ts, rawBody: body, now })).toBe(false)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: 'v0=x', timestamp: 'not-a-number', rawBody: body, now })).toBe(false)
    expect(verifySlackSignature({ signingSecret: SECRET, signature: 'v0=x', timestamp: '1.5', rawBody: body, now })).toBe(false)
  })

  it('rejects a signature of the right shape but wrong length (no length-oracle throw)', () => {
    expect(verifySlackSignature({ signingSecret: SECRET, signature: 'v0=deadbeef', timestamp: ts, rawBody: body, now })).toBe(false)
  })
})

describe('OAuth state (CSRF)', () => {
  const now = 1_700_000_000

  it('round-trips the bound workspace', () => {
    const state = signOAuthState(SECRET, 'ws-42', now)
    expect(verifyOAuthState(SECRET, state, now)).toBe('ws-42')
  })

  it('rejects a forged/wrong-secret state', () => {
    const state = signOAuthState('other', 'ws-42', now)
    expect(verifyOAuthState(SECRET, state, now)).toBeUndefined()
  })

  it('rejects a tampered payload (workspace swap)', () => {
    const state = signOAuthState(SECRET, 'ws-42', now)
    const [, mac] = [state.slice(0, state.lastIndexOf('.')), state.slice(state.lastIndexOf('.') + 1)]
    const forged = Buffer.from('ws-evil.9999999999.deadbeef').toString('base64url') + '.' + mac
    expect(verifyOAuthState(SECRET, forged, now)).toBeUndefined()
  })

  it('rejects an expired state', () => {
    const state = signOAuthState(SECRET, 'ws-42', now)
    expect(verifyOAuthState(SECRET, state, now + OAUTH_STATE_TTL_SEC + 1)).toBeUndefined()
  })

  it('rejects malformed state without throwing', () => {
    expect(verifyOAuthState(SECRET, 'garbage', now)).toBeUndefined()
    expect(verifyOAuthState(SECRET, '', now)).toBeUndefined()
    expect(verifyOAuthState(SECRET, '.', now)).toBeUndefined()
  })

  it('produces a fresh nonce each call (states differ)', () => {
    expect(signOAuthState(SECRET, 'ws-42', now)).not.toBe(signOAuthState(SECRET, 'ws-42', now))
  })
})
