import { expect, test, type Page } from '@playwright/test'
import { body as zapBody, decode as zapDecode, encode as zapEncode, frame as zapFrame, Kind as ZapKind } from '../src/data/zap.ts'

const SPACE_UUID = '1b4e2a27-e93f-4e94-a162-4a879b7d7940'
const HUMAN_UUID = '2d4d67ab-30f1-474e-b81f-f60461852259'
const DEV_UUID = '1ec93266-92cd-529b-b1ea-393ea25cb45f'
const GENERAL_CH_ID = 'ch-general-1001'
const THREAD_PARENT_ID = 'msg-parent-1001'

function makeSyntheticJwt(claims: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}.sig`
}

interface ContractHarness {
  requests: Array<{ method: string; path: string; body: unknown }>
  livekitWsUrls: string[]
  pageErrors: string[]
  consoleErrors: string[]
}

async function setupContractHarness(page: Page): Promise<ContractHarness> {
  const harness: ContractHarness = {
    requests: [],
    livekitWsUrls: [],
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
      // Ignore expected WebSocket abort/close logs from intercepted mock WS in offline E2E
      if (/WebSocket|live\.hanzo\.ai|transactor/i.test(txt)) return
      harness.consoleErrors.push(txt)
    }
  })

  // Stateful mock backend implementing the exact live production API contract
  const agents = [
    {
      id: 'agent-dev-1',
      name: 'dev',
      model: 'zen6-coder',
      description: 'Engineering specialist',
      instructions: 'Help with code',
      status: 'ready',
      executionMode: 'one-shot',
    },
  ]

  const messages: Array<Record<string, unknown>> = [
    {
      id: THREAD_PARENT_ID,
      channel: GENERAL_CH_ID,
      author: DEV_UUID,
      text: 'Production build is green and live contract is active.',
      mentions: [],
      createdOn: Date.now() - 60_000,
      replies: 1,
      reactions: [],
      files: [],
    },
  ]

  // Intercept LiveKit WebSocket connection attempts from Room.connect()
  await page.routeWebSocket(/wss:\/\/live\.hanzo\.ai\/.*/, (ws) => {
    harness.livekitWsUrls.push(ws.url().split('?')[0]!)
    // Keep socket open briefly so Room.connect attempt is cleanly observed
    ws.onMessage(() => {
      /* noop */
    })
  })

  // Intercept transactor WebSocket and speak ZAP framing so `<Space>` settles cleanly offline
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
          const result = rpc.method === 'findAll' ? [] : { version: '1.0', serverVersion: 'e2e' }
          ws.send(Buffer.from(zapFrame(rpc.id, ZapKind.response, rpc.method ?? '', { id: rpc.id, result })))
        }
      } catch {
        /* ignore */
      }
    })
  })

  // Intercept IAM userinfo
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

  // Intercept all Hanzo Cloud `/v1/*` contract routes
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
            topic: 'Live engineering room',
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
      return json({ messages })
    }

    if (path === `/v1/team/channels/${GENERAL_CH_ID}/messages` && method === 'POST') {
      const payload = body as { space: string; text: string }
      const created = {
        id: `msg-${Date.now()}`,
        channel: GENERAL_CH_ID,
        author: HUMAN_UUID,
        text: payload.text,
        mentions: payload.text.includes(`<@${DEV_UUID}>`) ? [DEV_UUID] : [],
        createdOn: Date.now(),
        replies: 0,
        reactions: [],
        files: [],
      }
      messages.push(created)
      return json(created, 201)
    }

    if (path === `/v1/team/messages/${THREAD_PARENT_ID}/replies` && method === 'GET') {
      return json({
        messages: [
          {
            id: 'reply-1',
            channel: GENERAL_CH_ID,
            thread: THREAD_PARENT_ID,
            author: HUMAN_UUID,
            text: 'Confirmed live thread reply.',
            mentions: [],
            createdOn: Date.now() - 10_000,
            replies: 0,
            reactions: [],
            files: [],
          },
        ],
      })
    }

    if (path.startsWith('/v1/team/messages/') && path.endsWith('/replies') && method === 'POST') {
      const payload = body as { space: string; text: string }
      const threadId = path.split('/')[4] || THREAD_PARENT_ID
      return json(
        {
          id: `reply-${Date.now()}`,
          channel: GENERAL_CH_ID,
          thread: threadId,
          author: DEV_UUID,
          text: payload.text,
          mentions: [],
          createdOn: Date.now(),
          replies: 0,
          reactions: [],
          files: [],
        },
        201,
      )
    }

    if (path === '/v1/integrations') {
      return json({ integrations: [{ provider: 'github', active: true }] })
    }

    if (path === '/v1/team/inbox') {
      return json({
        items: [
          {
            id: 'inbox-1',
            space: SPACE_UUID,
            reason: 'mention',
            read: false,
            archived: false,
            createdOn: Date.now() - 30_000,
            channel: GENERAL_CH_ID,
            message: messages[0],
          },
        ],
        unread: 1,
      })
    }

    if (path === '/v1/team/docs') {
      return json({
        teamspaces: [{ id: 'ts-1', name: 'Engineering', private: false, archived: false }],
        docs: [
          {
            id: 'doc-1',
            space: SPACE_UUID,
            teamspace: 'ts-1',
            title: 'Architecture Spec',
            rank: 'a',
            author: HUMAN_UUID,
            createdOn: Date.now() - 120_000,
            modifiedOn: Date.now() - 60_000,
            comments: 2,
            collaborator: 'doc-collab-1',
          },
        ],
      })
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

    if (path === '/v1/meet/call') {
      return json({
        name: `${SPACE_UUID}:${url.searchParams.get('channel') || 'office-theater'}`,
        ws: 'wss://live.hanzo.ai',
        ready: true,
      })
    }

    if (path === '/v1/meet/getToken' && method === 'POST') {
      const lkToken = makeSyntheticJwt({
        sub: HUMAN_UUID,
        name: 'Alice Engineer',
        video: { roomJoin: true, room: (body as { roomName?: string })?.roomName || 'office-theater' },
        exp: nowSec + 3600,
      })
      return route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: lkToken,
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
      return json({ agents })
    }

    if (path === '/v1/agents' && method === 'POST') {
      const p = body as { name: string; model?: string; description?: string; instructions: string }
      const created = {
        id: 'agent-e2e-temp',
        name: p.name,
        model: p.model || 'zen6-coder',
        description: p.description || 'Temporary E2E agent',
        instructions: p.instructions,
        status: 'ready',
        executionMode: 'one-shot',
      }
      agents.push(created)
      return json(created, 201)
    }

    if (path === '/v1/agents/agent-dev-1/run' && method === 'POST') {
      return json({
        id: 'run-dev-collab-1',
        agentId: 'agent-dev-1',
        status: 'ok',
        output: 'Task completed on Zen worker.',
        durationMs: 38,
      })
    }

    if (path === '/v1/agents/agent-e2e-temp/run' && method === 'POST') {
      return json({
        id: 'run-e2e-1',
        agentId: 'agent-e2e-temp',
        status: 'ok',
        output: 'E2E_OK',
        durationMs: 42,
      })
    }

    if (path === '/v1/agents/agent-e2e-temp' && method === 'DELETE') {
      const idx = agents.findIndex((a) => a.id === 'agent-e2e-temp')
      if (idx >= 0) agents.splice(idx, 1)
      return json(null, 204)
    }

    return json({ ok: true })
  })

  return harness
}

test('all workspaces boot cleanly with real backend calls and zero hardcoded mocks', async ({ page }) => {
  const h = await setupContractHarness(page)

  // Visit Home, Office, Chat, Inbox, Spaces, Threads
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('home-v88-workspace')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })

  const homeText = await page.locator('body').innerText()
  expect(homeText).not.toContain('Your organization · 24 agents')
  expect(homeText).not.toContain('botAutoReplyText')
  expect(homeText).toContain('general')

  // Verify real hydration contract calls were issued
  const paths = new Set(h.requests.map((r) => `${r.method} ${r.path}`))
  expect(paths.has('POST /v1/team/account')).toBe(true)
  expect(paths.has('GET /v1/team/channels')).toBe(true)
  expect(paths.has('GET /v1/team/members')).toBe(true)
  expect(paths.has('GET /v1/team/inbox')).toBe(true)
  expect(paths.has('GET /v1/team/docs')).toBe(true)
  expect(paths.has('GET /v1/meet/health')).toBe(true)
  expect(paths.has('GET /v1/meet/session')).toBe(true)
  expect(paths.has('GET /v1/agents')).toBe(true)
  expect(paths.has('GET /v1/bot/members')).toBe(true)

  // Navigate every core workspace cleanly via client-side sidebar
  await page.getByTestId('nav-ws-office').click()
  await expect(page.getByTestId('office-roam-workspace')).toBeVisible()

  await page.getByTestId('sidebar-channel-general').click()
  await expect(page.getByTestId('engineering-main-stage')).toBeVisible()
  await expect(page.getByText('Production build is green')).toBeVisible()

  await page.getByTestId('nav-ws-inbox').click()
  await expect(page.getByTestId('inbox-workspace')).toBeVisible()

  await page.getByTestId('nav-ws-spaces').click()
  await expect(page.getByTestId('spaces-workspace')).toBeVisible()
  await expect(page.getByText('Architecture Spec').first()).toBeVisible()

  await page.getByTestId('nav-ws-threads').click()
  await expect(page.getByTestId('followed-threads-workspace')).toBeVisible()

  expect(h.pageErrors).toEqual([])
  expect(h.consoleErrors).toEqual([])
})

test('composer encodes @handle to <@uuid> and posts to /v1/team/channels/:id/messages', async ({ page }) => {
  const h = await setupContractHarness(page)

  await page.goto(`/chat/${GENERAL_CH_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('team-composer')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })

  const textarea = page.getByTestId('team-composer').locator('textarea')
  await textarea.fill('@dev check live contract')
  await page.getByTestId('composer-send-btn').click()

  await expect
    .poll(() =>
      h.requests.find(
        (r) => r.method === 'POST' && r.path === `/v1/team/channels/${GENERAL_CH_ID}/messages`,
      ),
    )
    .toBeTruthy()

  const posted = h.requests.find(
    (r) => r.method === 'POST' && r.path === `/v1/team/channels/${GENERAL_CH_ID}/messages`,
  )
  expect(posted?.body).toEqual({
    space: SPACE_UUID,
    text: `<@${DEV_UUID}> check live contract`,
  })

  // Rendered message decodes <@uuid> back into readable @dev
  await expect(page.getByText('@dev check live contract')).toBeVisible()
  expect(h.pageErrors).toEqual([])
})

test('office Take Stage & Drop In call /v1/meet/getToken and invoke LiveKit Room.connect()', async ({ page }) => {
  const h = await setupContractHarness(page)

  await page.goto('/office', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('office-theater-room')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('desk-card-dev')).toBeVisible({ timeout: 15_000 })

  // Click Take Stage
  await page.getByTestId('office-theater-room').getByText('Take Stage').click()

  await expect
    .poll(() => h.requests.some((r) => r.method === 'GET' && r.path === '/v1/meet/call'))
    .toBe(true)
  await expect
    .poll(() => h.requests.some((r) => r.method === 'POST' && r.path === '/v1/meet/getToken'))
    .toBe(true)
  await expect.poll(() => h.livekitWsUrls.length).toBeGreaterThan(0)
  expect(h.livekitWsUrls[0]).toContain('wss://live.hanzo.ai/')

  // Click Drop In on Meeting Room and verify another /v1/meet/getToken + LiveKit Room.connect()
  const tokensBefore = h.requests.filter((r) => r.method === 'POST' && r.path === '/v1/meet/getToken').length
  await page.getByTestId('office-meeting-room').getByText('Drop In').click()
  await expect
    .poll(() => h.requests.filter((r) => r.method === 'POST' && r.path === '/v1/meet/getToken').length)
    .toBeGreaterThan(tokensBefore)
  await expect.poll(() => h.livekitWsUrls.length).toBeGreaterThan(1)

  expect(h.pageErrors).toEqual([])
})

test('office bot lifecycle: create -> POST /v1/agents, run -> POST /v1/agents/:id/run, delete -> DELETE /v1/agents/:id', async ({ page }) => {
  const h = await setupContractHarness(page)

  await page.goto('/office', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('office-create-bot-btn')).toBeVisible({ timeout: 15_000 })

  // 1. Create bot via modal
  await page.getByTestId('office-create-bot-btn').click()
  await expect(page.getByTestId('create-bot-modal')).toBeVisible()
  await page.getByTestId('create-bot-name-input').fill('qa-e2e-bot')
  await page.getByTestId('create-bot-instructions-input').fill('Reply literally.')
  await page.getByTestId('create-bot-submit').click()

  await expect
    .poll(() => h.requests.some((r) => r.method === 'POST' && r.path === '/v1/agents'))
    .toBe(true)
  await expect(page.getByTestId('desk-card-qa-e2e-bot')).toBeVisible({ timeout: 10_000 })

  // 2. Run bot via Run modal
  await page.getByTestId('desk-run-qa-e2e-bot').click()
  await expect(page.getByTestId('run-bot-modal')).toBeVisible()
  await page.getByTestId('run-bot-prompt-input').fill('Reply exactly: E2E_OK')
  await page.getByTestId('run-bot-submit').click()

  await expect
    .poll(() => h.requests.some((r) => r.method === 'POST' && r.path === '/v1/agents/agent-e2e-temp/run'))
    .toBe(true)
  await expect(page.getByTestId('run-bot-result')).toContainText('E2E_OK')
  await page.getByTestId('run-bot-modal').getByText('Close').click()

  // 3. Delete bot via desk Delete button
  await page.getByTestId('desk-delete-qa-e2e-bot').click()
  await expect
    .poll(() => h.requests.some((r) => r.method === 'DELETE' && r.path === '/v1/agents/agent-e2e-temp'))
    .toBe(true)
  await expect(page.getByTestId('desk-card-qa-e2e-bot')).toHaveCount(0)
  expect(h.pageErrors).toEqual([])
})

test('mobile viewport (390x844) /office collapses right elevator pane so main stage is not squished', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const h = await setupContractHarness(page)

  await page.goto('/office', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('office-theater-room')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('office-skyscraper-elevator')).toHaveCount(0)

  const theaterBox = await page.getByTestId('office-theater-room').boundingBox()
  expect(theaterBox).toBeTruthy()
  expect(theaterBox!.width).toBeGreaterThan(240)
  expect(h.pageErrors).toEqual([])
  await ctx.close()
})

test('unauthenticated /login renders Zen near-black (#090909) with zero seeded demo data', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto('/login?from=logout', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Sign in to Hanzo Team')).toBeVisible({ timeout: 15_000 })

  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('TEAM-101')
  expect(bodyText).not.toContain('Alice Engineer')
  expect(bodyText).not.toContain('Your organization · 24 agents')

  const groundVar = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--team-ground').trim(),
  )
  expect(groundVar).toBe('#090909')
  await ctx.close()
})

test('Zen Dark theme persistence, honest Bridges status, zero TEAM-101 demo issues, and executable Bot runId collaboration', async ({ page }) => {
  const h = await setupContractHarness(page)

  // 1. Tracker /issues never falls back to seeded TEAM-101..106 demo issues
  await page.goto('/issues', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })
  const issuesText = await page.locator('body').innerText()
  expect(issuesText).not.toContain('TEAM-101')

  // 2. Settings -> Appearance persists theme preset across reload; Bridges shows live /v1/integrations status
  const cookieClose = page.getByRole('button', { name: 'Close and use essential cookies only' })
  if (await cookieClose.isVisible().catch(() => false)) await cookieClose.click()
  await page.getByRole('button', { name: 'Settings (Ctrl+,)' }).click()
  await expect(page.getByTestId('hanzo-settings-modal')).toBeVisible()
  await page.getByTestId('settings-nav-appearance').click()
  await page.getByTestId('theme-card-clay').click()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-appearance')))
    .toBe('clay')

  await page.getByTestId('settings-nav-bridges').click()
  await expect(page.getByTestId('bridge-status-slack')).toContainText('Not connected')
  await expect(page.getByTestId('bridge-status-github')).toContainText('Connected')
  await page.getByTestId('settings-close-btn').click()

  // Reload and verify theme choice persisted in localStorage
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('sidebar-channel-general')).toBeVisible({ timeout: 15_000 })
  const persistedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-appearance'))
  expect(persistedTheme).toBe('clay')

  // Switch back to Zen Dark
  await page.getByRole('button', { name: 'Settings (Ctrl+,)' }).click()
  await page.getByTestId('settings-nav-appearance').click()
  await page.getByTestId('theme-card-zen').click()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-appearance')))
    .toBe('zen')
  await page.getByTestId('settings-close-btn').click()

  // 3. Post executable checkbox task in #general -> Run @dev -> runs /v1/agents/agent-dev-1/run and displays shared runId
  await page.getByTestId('sidebar-channel-general').click()
  const textarea = page.getByTestId('team-composer').locator('textarea')
  await textarea.fill('- [ ] @dev Verify Zen collaboration contract')
  await page.getByTestId('composer-send-btn').click()

  const runDevBtn = page.getByRole('button', { name: 'Run @dev' }).first()
  await expect(runDevBtn).toBeVisible({ timeout: 10_000 })
  await runDevBtn.click()

  await expect
    .poll(() => h.requests.some((r) => r.method === 'POST' && r.path === '/v1/agents/agent-dev-1/run'))
    .toBe(true)
  await expect
    .poll(() =>
      h.requests.some(
        (r) =>
          r.method === 'POST' &&
          r.path.startsWith('/v1/team/messages/') &&
          r.path.endsWith('/replies') &&
          JSON.stringify(r.body).includes('run-dev-collab-1'),
      ),
    )
    .toBe(true)
  await expect(page.getByText('run · run-dev-collab-1')).toBeVisible({ timeout: 10_000 })
  expect(h.pageErrors).toEqual([])
})
