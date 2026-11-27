import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createWorkforceAgent,
  deleteWorkforceAgent,
  resetWorkforceStore,
  runWorkforceAgent,
} from '../agents/workforce.ts'
import {
  getWorkspace,
  hydrateWorkspaceFromBackend,
  resetWorkspaceStore,
  sendWorkspaceMessage,
} from './store.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC_ROOT = join(HERE, '..')

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full)
    }
  }
  return out
}

const FORBIDDEN_MOCK_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'hardcoded 24-agent org subtitle', pattern: /Your organization\s*·\s*24 agents/ },
  { label: 'canned botAutoReplyText switch mock', pattern: /\bbotAutoReplyText\b/ },
  { label: 'hardcoded fake authorId zach', pattern: /authorId\s*:\s*['"]zach['"]/ },
  { label: 'static SEED_ROSTER mock array', pattern: /\bSEED_ROSTER\b/ },
  { label: 'static SEED_CHANNELS mock array', pattern: /\bSEED_CHANNELS\b/ },
  { label: 'static SEED_MESSAGES mock array', pattern: /\bSEED_MESSAGES\b/ },
]

test('anti-mock regression guard: zero hardcoded mock workforce, channels, or replies anywhere in src/', () => {
  const files = collectSourceFiles(SRC_ROOT)
  assert.ok(files.length > 30, 'expected to scan full src/ tree')

  const violations: string[] = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const rule of FORBIDDEN_MOCK_PATTERNS) {
      if (rule.pattern.test(text)) {
        violations.push(`${relative(SRC_ROOT, file)}: matched ${rule.label}`)
      }
    }
  }
  assert.deepEqual(violations, [], `Mock regressions detected:\n${violations.join('\n')}`)
})

test('live-contract integration: hydration, @mention -> <@uuid> POST, and agent create/run/delete hit real endpoints', async () => {
  resetWorkspaceStore()
  resetWorkforceStore()

  const DEV_UUID = '1ec93266-92cd-529b-b1ea-393ea25cb45f'
  const HUMAN_UUID = '2d4d67ab-30f1-474e-b81f-f60461852259'
  const SPACE_UUID = '1b4e2a27-e93f-4e94-a162-4a879b7d7940'
  const CH_ID = 'ch-real-general'

  const calls: Array<{ method: string; url: string; body: unknown }> = []
  const prevFetch = globalThis.fetch
  const prevWindow = (globalThis as { window?: unknown }).window
  const prevStorage = (globalThis as { localStorage?: unknown }).localStorage

  const storageMap = new Map<string, string>()
  const fakeStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storageMap.set(k, String(v))
    },
    removeItem: (k: string) => {
      storageMap.delete(k)
    },
    clear: () => storageMap.clear(),
  }
  ;(globalThis as { localStorage?: unknown }).localStorage = fakeStorage
  ;(globalThis as { window?: unknown }).window = {
    location: { origin: 'https://hanzo.team', protocol: 'https:', host: 'hanzo.team', href: 'https://hanzo.team/' },
    localStorage: fakeStorage,
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    let parsedBody: unknown = null
    if (typeof init?.body === 'string' && init.body) {
      try {
        parsedBody = JSON.parse(init.body)
      } catch {
        parsedBody = init.body
      }
    }
    calls.push({ method, url, body: parsedBody })

    if (url.includes('/v1/team/members')) {
      return jsonResponse({
        members: [
          { id: HUMAN_UUID, name: 'Zach', bot: false, role: 'owner', active: true, presence: 'online', personRef: `person-${HUMAN_UUID}` },
          { id: DEV_UUID, name: 'dev', bot: true, role: 'member', active: true, presence: 'online', personRef: `person-${DEV_UUID}` },
        ],
      })
    }
    if (url.includes(`/v1/team/channels/${CH_ID}/messages`) && method === 'POST') {
      const payload = parsedBody as { space: string; text: string }
      return jsonResponse({
        id: 'msg-live-1',
        channel: CH_ID,
        author: HUMAN_UUID,
        text: payload.text,
        mentions: [DEV_UUID],
        createdOn: Date.now(),
        replies: 0,
        reactions: [],
        files: [],
      }, 201)
    }
    if (url.includes(`/v1/team/channels/${CH_ID}/messages`) && method === 'GET') {
      return jsonResponse({ messages: [] })
    }
    if (url.includes('/v1/team/channels') && method === 'GET') {
      return jsonResponse({
        channels: [
          { id: CH_ID, space: SPACE_UUID, name: 'general', topic: 'Live team chat', kind: 'public', direct: false, private: false, archived: false, members: [HUMAN_UUID, DEV_UUID] },
        ],
      })
    }
    if (url.includes('/v1/team/inbox')) return jsonResponse({ items: [], unread: 0 })
    if (url.includes('/v1/team/docs')) return jsonResponse({ docs: [], teamspaces: [] })
    if (url.includes('/v1/meet/health')) return jsonResponse({ ready: true, service: 'meet', status: 'ok' })
    if (url.includes('/v1/meet/session')) {
      return jsonResponse({ identity: HUMAN_UUID, name: 'Zach', ws: 'wss://live.hanzo.ai', spaces: [] })
    }
    if (url.includes('/v1/bot/members')) {
      return jsonResponse({ bots: [{ id: 'agent-dev', name: 'dev', userId: DEV_UUID, personRef: `person-${DEV_UUID}`, active: true }] })
    }
    if (url.endsWith('/v1/agents') && method === 'GET') {
      return jsonResponse({ agents: [{ id: 'agent-dev', name: 'dev', model: 'zen6-coder', status: 'ready' }] })
    }
    if (url.endsWith('/v1/agents') && method === 'POST') {
      const p = parsedBody as { name: string; model?: string }
      return jsonResponse({ id: 'agent-temp-1', name: p.name, model: p.model ?? 'zen6-coder', status: 'ready' }, 201)
    }
    if (url.includes('/v1/agents/agent-temp-1/run') && method === 'POST') {
      return jsonResponse({ id: 'run-1', agentId: 'agent-temp-1', status: 'ok', output: 'E2E_OK' })
    }
    if (url.includes('/v1/agents/agent-temp-1') && method === 'DELETE') {
      return jsonResponse(null, 204)
    }
    return jsonResponse({ error: `unexpected ${method} ${url}` }, 404)
  }) as typeof fetch

  try {
    await hydrateWorkspaceFromBackend({
      spaceUuid: SPACE_UUID,
      spaceSlug: 'hanzo',
      spaces: [{ uuid: SPACE_UUID, name: 'Hanzo', url: 'hanzo', org: 'hanzo', isDisabled: false }],
      current: { uuid: SPACE_UUID, name: 'Hanzo', url: 'hanzo', org: 'hanzo', isDisabled: false },
      accountId: HUMAN_UUID,
    })

    const snap = getWorkspace()
    assert.equal(snap.channels.length, 1)
    assert.equal(snap.channels[0]?.name, 'general')
    assert.equal(snap.roster.length, 2)
    assert.equal(snap.voiceServerHost, 'live.hanzo.ai')

    // Send a channel message mentioning @dev -> MUST encode to <@uuid>
    const sent = await sendWorkspaceMessage(CH_ID, '@dev Reply exactly: E2E_OK')
    assert.ok(sent)
    const postMsg = calls.find((c) => c.method === 'POST' && c.url.includes(`/v1/team/channels/${CH_ID}/messages`))
    assert.ok(postMsg, 'expected POST /v1/team/channels/:id/messages')
    assert.deepEqual(postMsg.body, {
      space: SPACE_UUID,
      text: `<@${DEV_UUID}> Reply exactly: E2E_OK`,
    })

    // Bot CRUD lifecycle hits real /v1/agents endpoints
    const created = await createWorkforceAgent({ name: 'contract-bot', model: 'zen6-coder', instructions: 'Test' })
    assert.equal(created.id, 'agent-temp-1')
    const run = await runWorkforceAgent(created.id, 'Reply exactly: E2E_OK')
    assert.equal(run.output, 'E2E_OK')
    await deleteWorkforceAgent(created.id)

    assert.ok(calls.some((c) => c.method === 'POST' && c.url.endsWith('/v1/agents')))
    assert.ok(calls.some((c) => c.method === 'POST' && c.url.includes('/v1/agents/agent-temp-1/run')))
    assert.ok(calls.some((c) => c.method === 'DELETE' && c.url.includes('/v1/agents/agent-temp-1')))
  } finally {
    globalThis.fetch = prevFetch
    ;(globalThis as { window?: unknown }).window = prevWindow
    ;(globalThis as { localStorage?: unknown }).localStorage = prevStorage
    resetWorkspaceStore()
    resetWorkforceStore()
  }
})
