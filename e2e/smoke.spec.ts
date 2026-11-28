import { expect, test, type Page } from '@playwright/test'
import { body as zapBody, decode as zapDecode, encode as zapEncode, frame as zapFrame, Kind as ZapKind } from '../src/data/zap.ts'

const SPACE_UUID = '1b4e2a27-e93f-4e94-a162-4a879b7d7940'
const HUMAN_UUID = '2d4d67ab-30f1-474e-b81f-f60461852259'
const DEV_UUID = '1ec93266-92cd-529b-b1ea-393ea25cb45f'
const GENERAL_CH_ID = 'ch-general-1001'
const ENGINEERING_CH_ID = 'ch-engineering-1002'
const AGENT_THREAD_PARENT_ID = 'msg-agent-thread-1'

function makeSyntheticJwt(claims: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}.sig`
}

interface SmokeHarness {
  requests: Array<{ method: string; path: string; body: unknown }>
  pageErrors: string[]
  consoleErrors: string[]
}

async function setupSmokeHarness(page: Page): Promise<SmokeHarness> {
  const harness: SmokeHarness = {
    requests: [],
    pageErrors: [],
    consoleErrors: [],
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const accessToken = makeSyntheticJwt({
    iss: 'https://hanzo.id',
    aud: ['hanzo-app'],
    sub: HUMAN_UUID,
    name: 'Alice Engineer',
    preferred_username: 'alice',
    email: 'alice@hanzo.ai',
    owner: 'hanzo',
    iat: nowSec,
    exp: nowSec + 3600,
  })
  const expiresAtMs = String((nowSec + 3600) * 1000)

  await page.addInitScript(
    ({ token, expMs }) => {
      window.localStorage.setItem('hanzo_iam_access_token', token)
      window.localStorage.setItem('hanzo_iam_expires_at', expMs)
    },
    { token: accessToken, expMs: expiresAtMs },
  )

  page.on('pageerror', (err) => harness.pageErrors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text()
      if (/WebSocket|live\.hanzo\.ai|transactor/i.test(txt)) return
      harness.consoleErrors.push(txt)
    }
  })

  const agentThreadReplies: Array<Record<string, unknown>> = [
    {
      id: 'reply-agent-1',
      channel: GENERAL_CH_ID,
      thread: AGENT_THREAD_PARENT_ID,
      author: DEV_UUID,
      text: 'Peer tree verified: single @hanzo/gui 8.3.5 graph.',
      mentions: [],
      createdOn: Date.now() - 15_000,
      replies: 0,
      reactions: [],
      files: [],
    },
  ]

  const generalMessages: Array<Record<string, unknown>> = [
    {
      id: AGENT_THREAD_PARENT_ID,
      channel: GENERAL_CH_ID,
      author: DEV_UUID,
      text: 'Build check complete on Node 22; open thread for peer audit details.',
      mentions: [],
      createdOn: Date.now() - 60_000,
      replies: 1,
      reactions: [],
      files: [],
    },
  ]

  const engineeringMessages: Array<Record<string, unknown>> = [
    {
      id: 'msg-eng-1',
      channel: ENGINEERING_CH_ID,
      author: HUMAN_UUID,
      text: 'Engineering channel active — Vite production bundle verified.',
      mentions: [],
      createdOn: Date.now() - 30_000,
      replies: 0,
      reactions: [],
      files: [],
    },
  ]

  await page.routeWebSocket(/wss:\/\/live\.hanzo\.ai\/.*/, (ws) => {
    ws.onMessage(() => {
      /* noop */
    })
  })

  await page.routeWebSocket(/wss:\/\/api\.hanzo\.ai\/v1\/team\/transactor\/.*/, (ws) => {
    ws.onMessage((msg) => {
      const bytes = typeof msg === 'string' ? Buffer.from(msg) : new Uint8Array(msg)
      const env = zapDecode(bytes)
      if (!env) return
      const text = zapBody(env)
      if (text === 'ping') {
        ws.send(Buffer.from(zapEncode({ id: 0, kind: ZapKind.response, method: '', payload: new TextEncoder().encode('pong!') })))
        return
      }
      try {
        const rpc = JSON.parse(text) as { id?: number; method?: string }
        if (typeof rpc.id === 'number') {
          const result = rpc.method === 'findAll' ? [] : { version: '1.0', serverVersion: 'smoke' }
          ws.send(Buffer.from(zapFrame(rpc.id, ZapKind.response, rpc.method ?? '', { id: rpc.id, result })))
        }
      } catch {
        /* ignore */
      }
    })
  })

  await page.route(/https:\/\/hanzo\.id\/.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sub: HUMAN_UUID,
        name: 'Alice Engineer',
        preferred_username: 'alice',
        email: 'alice@hanzo.ai',
        owner: 'hanzo',
      }),
    })
  })

  await page.route(/https:\/\/api\.hanzo\.ai\/v1\/.*/, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    const method = req.method().toUpperCase()
    let body: unknown = null
    const raw = req.postData()
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        body = raw
      }
    }
    harness.requests.push({ method, path, body })

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: status === 204 ? '' : JSON.stringify(data),
      })

    if (path === '/v1/account/appearance') {
      return json({ font: 'default', density: 'default' })
    }

    if (path === '/v1/team/account' && method === 'POST') {
      const rpc = (body as { method?: string })?.method
      if (rpc === 'getUserWorkspaces') {
        return json({
          result: [{ uuid: SPACE_UUID, name: 'Hanzo', url: 'hanzo', org: 'hanzo', role: 'OWNER' }],
        })
      }
      if (rpc === 'selectWorkspace') {
        return json({
          result: {
            token: makeSyntheticJwt({ account: HUMAN_UUID, workspace: SPACE_UUID }),
            endpoint: 'wss://api.hanzo.ai/v1/team/transactor',
            workspace: SPACE_UUID,
            account: HUMAN_UUID,
          },
        })
      }
      return json({ result: {} })
    }

    if (path === '/v1/team/members') {
      return json({
        members: [
          {
            id: HUMAN_UUID,
            name: 'Alice Engineer',
            bot: false,
            role: 'owner',
            active: true,
            presence: 'online',
            personRef: `person-${HUMAN_UUID}`,
          },
          {
            id: DEV_UUID,
            name: 'dev',
            bot: true,
            role: 'member',
            active: true,
            presence: 'online',
            personRef: `person-${DEV_UUID}`,
          },
        ],
        degraded: [],
      })
    }

    if (path === '/v1/team/channels' && method === 'GET') {
      return json({
        channels: [
          {
            id: GENERAL_CH_ID,
            space: SPACE_UUID,
            name: 'general',
            topic: 'Company-wide announcements',
            kind: 'public',
            direct: false,
            private: false,
            archived: false,
            members: [HUMAN_UUID, DEV_UUID],
          },
          {
            id: ENGINEERING_CH_ID,
            space: SPACE_UUID,
            name: 'engineering',
            topic: 'Core build & runtime',
            kind: 'public',
            direct: false,
            private: false,
            archived: false,
            members: [HUMAN_UUID, DEV_UUID],
          },
        ],
      })
    }

    if (path === `/v1/team/channels/${GENERAL_CH_ID}/messages` && method === 'GET') {
      return json({ messages: generalMessages })
    }

    if (path === `/v1/team/channels/${ENGINEERING_CH_ID}/messages` && method === 'GET') {
      return json({ messages: engineeringMessages })
    }

    if (path === `/v1/team/messages/${AGENT_THREAD_PARENT_ID}/replies` && method === 'GET') {
      return json({ messages: agentThreadReplies })
    }

    if (path === `/v1/team/messages/${AGENT_THREAD_PARENT_ID}/replies` && method === 'POST') {
      const payload = body as { space: string; text: string }
      const created = {
        id: `reply-smoke-${agentThreadReplies.length + 1}`,
        channel: GENERAL_CH_ID,
        thread: AGENT_THREAD_PARENT_ID,
        author: HUMAN_UUID,
        text: payload.text,
        mentions: [],
        createdOn: Date.now(),
        replies: 0,
        reactions: [],
        files: [],
      }
      agentThreadReplies.push(created)
      return json(created, 201)
    }

    if (path === '/v1/integrations') {
      return json({ integrations: [] })
    }

    if (path === '/v1/team/inbox') {
      return json({ items: [], unread: 0 })
    }

    if (path === '/v1/team/docs') {
      return json({ teamspaces: [], docs: [] })
    }

    if (path === '/v1/meet/health') {
      return json({ ready: true, service: 'meet', status: 'ok' })
    }

    if (path === '/v1/meet/session') {
      return json({
        identity: HUMAN_UUID,
        name: 'Alice Engineer',
        ws: 'wss://live.hanzo.ai',
        spaces: [{ uuid: SPACE_UUID, name: 'Hanzo', url: 'hanzo', role: 'OWNER' }],
      })
    }

    if (path === '/v1/bot/members') {
      return json({
        bots: [
          {
            id: 'agent-dev-1',
            name: 'dev',
            userId: DEV_UUID,
            personRef: `person-${DEV_UUID}`,
            active: true,
          },
        ],
      })
    }

    if (path === '/v1/agents' && method === 'GET') {
      return json({
        agents: [
          {
            id: 'agent-dev-1',
            name: 'dev',
            model: 'zen6-coder',
            description: 'Engineering specialist',
            instructions: 'Help with code',
            status: 'ready',
            executionMode: 'one-shot',
          },
        ],
      })
    }

    return json({ ok: true })
  })

  return harness
}

test('workspace boot renders core layout, channels, and workforce roster with zero console/page errors', async ({ page }) => {
  const h = await setupSmokeHarness(page)

  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('home-v88-workspace')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('team-left-sidebar')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('workforce-roster-rhs')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-engineering')).toBeVisible({ timeout: 15_000 })

  expect(h.pageErrors).toEqual([])
  expect(h.consoleErrors).toEqual([])
})

test('channel switching navigates between #general and #engineering and updates active view', async ({ page }) => {
  const h = await setupSmokeHarness(page)

  await page.goto(`/chat/${GENERAL_CH_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('engineering-main-stage')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-engineering')).toBeVisible({ timeout: 15_000 })

  await expect(page.getByText('# general')).toBeVisible()
  await expect(page.getByText('Company-wide announcements').first()).toBeVisible()
  await expect(page.getByText('Build check complete on Node 22; open thread for peer audit details.')).toBeVisible()
  await expect(page.getByText('Engineering channel active')).toHaveCount(0)

  await page.getByTestId('sidebar-channel-engineering').click()
  await expect(page).toHaveURL(new RegExp(`/chat/${ENGINEERING_CH_ID}$`))

  await expect
    .poll(() =>
      h.requests.some((r) => r.method === 'GET' && r.path === `/v1/team/channels/${ENGINEERING_CH_ID}/messages`),
    )
    .toBe(true)

  await expect(page.getByText('# engineering')).toBeVisible()
  await expect(page.getByText('Core build & runtime').first()).toBeVisible()
  await expect(page.getByText('Engineering channel active — Vite production bundle verified.')).toBeVisible()
  await expect(page.getByText('Build check complete on Node 22; open thread for peer audit details.')).toHaveCount(0)

  await page.getByTestId('sidebar-channel-general').click()
  await expect(page).toHaveURL(new RegExp(`/chat/${GENERAL_CH_ID}$`))
  await expect(page.getByText('Build check complete on Node 22; open thread for peer audit details.')).toBeVisible()

  expect(h.pageErrors).toEqual([])
  expect(h.consoleErrors).toEqual([])
})

test('agent thread view opens conversation pane, loads replies, posts reply, and renders in /threads', async ({ page }) => {
  const h = await setupSmokeHarness(page)

  await page.goto(`/chat/${GENERAL_CH_ID}`, { waitUntil: 'domcontentloaded' })
  const openThreadBar = page.getByTestId(`open-thread-bar-${AGENT_THREAD_PARENT_ID}`)
  await expect(openThreadBar).toBeVisible({ timeout: 15_000 })
  await openThreadBar.click()

  const threadPane = page.getByTestId('mattermost-thread-rhs')
  await expect(threadPane).toBeVisible({ timeout: 10_000 })

  await expect
    .poll(() =>
      h.requests.some((r) => r.method === 'GET' && r.path === `/v1/team/messages/${AGENT_THREAD_PARENT_ID}/replies`),
    )
    .toBe(true)

  await expect(threadPane.getByText('Build check complete on Node 22; open thread for peer audit details.')).toBeVisible()
  await expect(threadPane.getByText('@dev')).toBeVisible()
  await expect(threadPane.getByText('Peer tree verified: single @hanzo/gui 8.3.5 graph.')).toBeVisible()
  await expect(threadPane.getByText('1 reply')).toBeVisible()

  const replyInput = page.getByTestId('thread-rhs-input')
  await replyInput.fill('Confirm smoke thread reply from Playwright.')
  await replyInput.press('Enter')

  await expect
    .poll(() =>
      h.requests.some((r) => r.method === 'POST' && r.path === `/v1/team/messages/${AGENT_THREAD_PARENT_ID}/replies`),
    )
    .toBe(true)

  await expect(threadPane.getByText('Confirm smoke thread reply from Playwright.')).toBeVisible()
  await expect(threadPane.getByText('2 replies')).toBeVisible()

  await page.getByTestId('close-thread-rhs').click()
  await expect(page.getByTestId('mattermost-thread-rhs')).toHaveCount(0)

  await page.getByTestId('nav-ws-threads').click()
  const threadsWorkspace = page.getByTestId('followed-threads-workspace')
  await expect(threadsWorkspace).toBeVisible({ timeout: 10_000 })
  await expect(threadsWorkspace.getByText('Build check complete on Node 22; open thread for peer audit details.').first()).toBeVisible()
  await expect(threadsWorkspace.getByText('Confirm smoke thread reply from Playwright.')).toBeVisible()

  expect(h.pageErrors).toEqual([])
  expect(h.consoleErrors).toEqual([])
})
