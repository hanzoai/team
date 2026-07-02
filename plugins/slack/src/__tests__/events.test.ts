//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { routeSlackEvent, slackEventKey, type SlackEventCallback } from '../events'

function evt (event: Record<string, unknown>, over: Partial<SlackEventCallback> = {}): SlackEventCallback {
  return {
    type: 'event_callback',
    team_id: 'T123',
    api_app_id: 'A1',
    event: event as SlackEventCallback['event'],
    event_id: 'Ev123',
    event_time: 1700000000,
    ...over
  }
}

describe('routeSlackEvent', () => {
  it('answers the url_verification challenge', () => {
    expect(routeSlackEvent({ type: 'url_verification', challenge: 'abc123' })).toEqual({
      kind: 'challenge',
      challenge: 'abc123'
    })
  })

  it('ignores url_verification with empty challenge', () => {
    expect(routeSlackEvent({ type: 'url_verification', challenge: '' } as any)).toEqual({ kind: 'ignore' })
  })

  it('relays a plain user message', () => {
    const p = evt({ type: 'message', channel: 'C1', user: 'U1', text: 'hello', ts: '1.2', team: 'T123' })
    expect(routeSlackEvent(p)).toEqual({
      kind: 'relay',
      teamId: 'T123',
      slackChannelId: 'C1',
      slackUserId: 'U1',
      text: 'hello',
      ts: '1.2'
    })
  })

  it('carries thread_ts through for threaded relays', () => {
    const p = evt({ type: 'message', channel: 'C1', user: 'U1', text: 'reply', ts: '2.0', thread_ts: '1.0' })
    const d = routeSlackEvent(p)
    expect(d).toMatchObject({ kind: 'relay', threadTs: '1.0' })
  })

  it('drops the bot echo (bot_id present) to prevent mirror loops', () => {
    const p = evt({ type: 'message', channel: 'C1', bot_id: 'B1', text: 'mirrored', ts: '3.0' })
    expect(routeSlackEvent(p)).toEqual({ kind: 'ack' })
  })

  it('drops message subtypes (edits/deletes/joins)', () => {
    for (const subtype of ['message_changed', 'message_deleted', 'channel_join']) {
      const p = evt({ type: 'message', channel: 'C1', user: 'U1', text: 'x', ts: '4.0', subtype })
      expect(routeSlackEvent(p)).toEqual({ kind: 'ack' })
    }
  })

  it('acks a message with no user or empty text', () => {
    expect(routeSlackEvent(evt({ type: 'message', channel: 'C1', text: 'x', ts: '5' }))).toEqual({ kind: 'ack' })
    expect(routeSlackEvent(evt({ type: 'message', channel: 'C1', user: 'U1', text: '', ts: '5' }))).toEqual({ kind: 'ack' })
  })

  it('acks non-message events (reaction_added etc.)', () => {
    expect(routeSlackEvent(evt({ type: 'reaction_added' }))).toEqual({ kind: 'ack' })
  })

  it('acks unknown top-level types and ignores malformed payloads', () => {
    expect(routeSlackEvent({ type: 'app_rate_limited' })).toEqual({ kind: 'ack' })
    expect(routeSlackEvent(null as any)).toEqual({ kind: 'ignore' })
    expect(routeSlackEvent({} as any)).toEqual({ kind: 'ignore' })
  })

  it('extracts a dedupe key for idempotent relay', () => {
    expect(slackEventKey(evt({ type: 'message', channel: 'C1', user: 'U1', text: 'h', ts: '1' }))).toBe('Ev123')
    expect(slackEventKey({ type: 'url_verification', challenge: 'x' })).toBe('')
  })
})
