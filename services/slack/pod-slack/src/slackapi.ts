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

import type { SlackToken } from './tokens'

const SLACK_API = 'https://slack.com/api'

export interface SlackOAuthResult {
  ok: boolean
  access_token?: string
  token_type?: string
  scope?: string
  bot_user_id?: string
  app_id?: string
  team?: { id: string, name: string }
  error?: string
}

/**
 * Exchange an OAuth `code` for a bot token via oauth.v2.access. The client
 * secret is supplied per-call from KMS-sourced config — never hardcoded.
 */
export async function exchangeCode (
  params: { clientId: string, clientSecret: string, code: string, redirectUri: string },
  fetchImpl: typeof fetch = fetch
): Promise<SlackToken> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri
  })
  const res = await fetchImpl(`${SLACK_API}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  })
  const data = (await res.json()) as SlackOAuthResult
  if (!data.ok || data.access_token === undefined || data.team === undefined || data.bot_user_id === undefined) {
    throw new Error(`slack oauth failed: ${data.error ?? 'unknown'}`)
  }
  return {
    accessToken: data.access_token,
    botUserId: data.bot_user_id,
    teamId: data.team.id,
    teamName: data.team.name,
    scope: data.scope ?? '',
    appId: data.app_id ?? ''
  }
}

/** Post a message to a Slack channel (outgoing: Hanzo bot activity -> Slack). */
export async function postMessage (
  token: SlackToken,
  channel: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ channel, text })
  })
  const data = (await res.json()) as { ok: boolean, error?: string }
  if (!data.ok) {
    throw new Error(`slack chat.postMessage failed: ${data.error ?? 'unknown'}`)
  }
}
