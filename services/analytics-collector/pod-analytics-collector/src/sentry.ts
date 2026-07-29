//
// Copyright © 2026 Hanzo AI Inc.
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

import { randomUUID } from 'crypto'
import { AnalyticEvent } from '@hanzo/analytics-collector'

// Forwards browser Error events to the Hanzo Sentry store ingest
// (POST <origin>/v1/sentry/<project>/store/?sentry_key=<key>), DSN-authenticated.
// The DSN is minted by POST /v1/sentry/projects and carries a revocable,
// KMS-derived public key: https://<key>@<host>/v1/sentry/<project>.

interface SentrySink {
  url: string
}

export function sentrySinkFromDSN (dsn: string | undefined): SentrySink | undefined {
  if (dsn === undefined || dsn.trim() === '') return undefined
  try {
    const u = new URL(dsn.trim())
    const key = u.username !== '' && u.password !== '' ? `${u.username}:${u.password}` : u.username
    if (key === '') return undefined
    return { url: `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}/store/?sentry_key=${key}` }
  } catch {
    return undefined
  }
}

export async function sendErrorToSentry (sink: SentrySink, event: AnalyticEvent): Promise<void> {
  const p = event.properties ?? {}
  const message = String(p.error_message ?? p.message ?? 'Unknown error')
  const type = String(p.error_type ?? 'Error')
  const stack = String(p.error_stack ?? p.stack ?? '')

  const body = {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: new Date(event.timestamp ?? Date.now()).toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: 'team-front',
    exception: { values: [{ type, value: message }] },
    user: event.distinct_id != null && event.distinct_id !== '' ? { id: String(event.distinct_id) } : undefined,
    extra: stack !== '' ? { stack } : undefined
  }

  const response = await fetch(sink.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    console.error(`Sentry store ingest error: ${response.status} ${response.statusText}`)
  }
}
