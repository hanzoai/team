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

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Slack request signing version prefix. Slack computes
 *   v0=HMAC_SHA256(signingSecret, `v0:${timestamp}:${rawBody}`)
 * and sends it in `X-Slack-Signature` with `X-Slack-Request-Timestamp`.
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
const SIG_VERSION = 'v0'

/** Reject requests whose timestamp is older/newer than this (replay window). */
export const MAX_TIMESTAMP_SKEW_SEC = 60 * 5 // 5 minutes

export interface SlackVerifyInput {
  signingSecret: string
  /** X-Slack-Signature header, e.g. 'v0=abc...' */
  signature: string
  /** X-Slack-Request-Timestamp header (unix seconds, as string) */
  timestamp: string
  /** The exact raw request body bytes (must be the un-parsed payload). */
  rawBody: string
  /** Current unix time in seconds; injectable for tests. */
  now?: number
}

/**
 * Verify a Slack request signature with constant-time comparison and a strict
 * anti-replay timestamp window. Returns true only if the HMAC matches AND the
 * timestamp is fresh. Never throws on bad input — returns false.
 */
export function verifySlackSignature (input: SlackVerifyInput): boolean {
  const { signingSecret, signature, timestamp, rawBody } = input
  if (signingSecret === '' || signature === '' || timestamp === '') return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || !Number.isInteger(ts)) return false

  const now = input.now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > MAX_TIMESTAMP_SKEW_SEC) return false

  const expected = `${SIG_VERSION}=${createHmac('sha256', signingSecret)
    .update(`${SIG_VERSION}:${timestamp}:${rawBody}`)
    .digest('hex')}`

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  // length check first — timingSafeEqual throws on length mismatch
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** OAuth CSRF `state`: workspace + nonce + expiry, HMAC-signed with the app secret. */
export const OAUTH_STATE_TTL_SEC = 60 * 10 // 10 minutes

/**
 * Build a signed OAuth `state` value binding the initiating workspace so the
 * callback cannot be replayed/forged for another workspace (CSRF defense).
 * Format: base64url(`${workspace}.${exp}.${nonce}`).`hmac`
 */
export function signOAuthState (secret: string, workspace: string, now?: number): string {
  const exp = (now ?? Math.floor(Date.now() / 1000)) + OAUTH_STATE_TTL_SEC
  const nonce = randomBytes(16).toString('hex')
  const payload = Buffer.from(`${workspace}.${exp}.${nonce}`).toString('base64url')
  const mac = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${mac}`
}

/**
 * Verify a signed OAuth `state`. Returns the bound workspace on success, or
 * undefined if the MAC is invalid or the state has expired. Constant-time MAC.
 */
export function verifyOAuthState (secret: string, state: string, now?: number): string | undefined {
  const dot = state.lastIndexOf('.')
  if (dot <= 0) return undefined
  const payload = state.slice(0, dot)
  const mac = state.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return undefined
  const macOk: boolean = timingSafeEqual(a, b)
  if (!macOk) return undefined
  const decoded = Buffer.from(payload, 'base64url').toString('utf8')
  const [workspace, expStr] = decoded.split('.')
  const exp = Number(expStr)
  if (workspace === undefined || workspace === '' || !Number.isFinite(exp)) return undefined
  if ((now ?? Math.floor(Date.now() / 1000)) > exp) return undefined
  return workspace
}
