//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Minimal, strictly-typed view of the Slack Events API payloads we act on.
 * @see https://api.slack.com/apis/connections/events-api
 */

export interface SlackUrlVerification {
  type: 'url_verification'
  challenge: string
}

export interface SlackMessageEvent {
  type: 'message'
  channel: string
  user?: string
  text?: string
  ts: string
  team?: string
  // present on edits / bot messages / joins — used to skip non-user messages
  subtype?: string
  bot_id?: string
  thread_ts?: string
}

export interface SlackEventCallback {
  type: 'event_callback'
  team_id: string
  api_app_id: string
  event: SlackMessageEvent | { type: string, [k: string]: unknown }
  event_id: string
  event_time: number
  authorizations?: Array<{ team_id: string, user_id: string, is_bot: boolean }>
}

export type SlackEnvelopePayload = SlackUrlVerification | SlackEventCallback | { type: string }

/** Decision the webhook layer must make about an inbound Slack payload. */
export type SlackRouteDecision =
  | { kind: 'challenge', challenge: string }
  | { kind: 'ack' } // valid but nothing to relay (bot echo, subtype, non-message)
  | { kind: 'relay', teamId: string, slackChannelId: string, slackUserId: string, text: string, ts: string, threadTs?: string }
  | { kind: 'ignore' } // malformed / unsupported

/**
 * Decide what to do with a (already signature-verified) Slack payload.
 *
 * Pure function — no I/O. The webhook handler verifies the signature first, then
 * calls this to route. We drop the bot's own messages (bot_id/subtype) so a
 * mirrored message never loops back into Slack (echo-loop prevention).
 */
export function routeSlackEvent (payload: SlackEnvelopePayload): SlackRouteDecision {
  if (payload == null || typeof (payload as { type?: unknown }).type !== 'string') {
    return { kind: 'ignore' }
  }

  if (payload.type === 'url_verification') {
    const challenge = (payload as SlackUrlVerification).challenge
    return typeof challenge === 'string' && challenge !== ''
      ? { kind: 'challenge', challenge }
      : { kind: 'ignore' }
  }

  if (payload.type !== 'event_callback') {
    return { kind: 'ack' }
  }

  const cb = payload as SlackEventCallback
  const ev = cb.event
  if (ev == null || ev.type !== 'message') {
    return { kind: 'ack' }
  }

  const msg = ev as SlackMessageEvent
  // Skip bot messages (including our own mirror) and non-plain subtypes
  // (message_changed, message_deleted, channel_join, etc.).
  if (msg.bot_id !== undefined || (msg.subtype !== undefined && msg.subtype !== '')) {
    return { kind: 'ack' }
  }
  if (msg.user === undefined || msg.user === '' || msg.text === undefined || msg.text === '') {
    return { kind: 'ack' }
  }

  return {
    kind: 'relay',
    teamId: cb.team_id,
    slackChannelId: msg.channel,
    slackUserId: msg.user,
    text: msg.text,
    ts: msg.ts,
    ...(msg.thread_ts !== undefined ? { threadTs: msg.thread_ts } : {})
  }
}

/**
 * Slack delivers each event with a stable `event_id` and may retry on timeout.
 * Callers keep a bounded seen-set to make relay idempotent; this extracts the
 * dedupe key (empty string if absent, which callers treat as non-dedupable).
 */
export function slackEventKey (payload: SlackEnvelopePayload): string {
  if ((payload as SlackEventCallback)?.type === 'event_callback') {
    const cb = payload as SlackEventCallback
    return cb.event_id ?? ''
  }
  return ''
}
