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

import { type MeasureContext } from '@hanzoteam/core'
import { extractToken } from '@hanzoteam/server-client'
import { MAX_TIMESTAMP_SKEW_SEC, routeSlackEvent, slackEventKey, verifySlackSignature } from '@hanzoteam/slack'
import cors from 'cors'
import express, { type Express, type Request, type Response } from 'express'
import { type Server } from 'http'

import config from './config'
import { type SlackController } from './controller'
import { SeenSet } from './dedupe'

export function createServer (ctx: MeasureContext, controller: SlackController): Express {
  const app = express()
  app.use(cors())

  // Capture the RAW body for the events webhook so HMAC is over exact bytes.
  const rawJson = express.json({
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf8')
    }
  })

  // Dedupe TTL == the signature freshness window: an event_id is retained at
  // least as long as its request signature stays valid, so a replayed request
  // is either caught here or rejected by verifySlackSignature (stale timestamp).
  const seen = new SeenSet(MAX_TIMESTAMP_SKEW_SEC * 1000)

  app.get('/v1/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // --- Slack Events API webhook (INCOMING) ---
  app.post('/v1/slack/events', rawJson, (req: Request & { rawBody?: string }, res: Response) => {
    void (async () => {
      const ok: boolean = verifySlackSignature({
        signingSecret: config.SlackSigningSecret,
        signature: String(req.header('x-slack-signature') ?? ''),
        timestamp: String(req.header('x-slack-request-timestamp') ?? ''),
        rawBody: req.rawBody ?? ''
      })
      if (!ok) {
        res.status(401).end()
        return
      }

      const decision = routeSlackEvent(req.body)
      switch (decision.kind) {
        case 'challenge':
          res.status(200).send(decision.challenge)
          return
        case 'relay': {
          // Ack Slack immediately (3s budget), relay asynchronously & idempotently.
          res.status(200).end()
          // Test-and-set dedupe synchronously BEFORE the await so two concurrent
          // Slack retries of the same event_id cannot both proceed to relay.
          const key = slackEventKey(req.body)
          if (seen.seenAndAdd(key)) return
          try {
            await controller.relayIncoming(decision)
          } catch (err) {
            ctx.error('slack relay failed', { err })
          }
          return
        }
        case 'ack':
          res.status(200).end()
          return
        default:
          res.status(400).end()
      }
    })()
  })

  // --- OAuth initiate (admin, IAM JWT): returns the Slack authorize URL ---
  app.get('/v1/slack/connect', (req: Request, res: Response) => {
    void (async () => {
      const token = extractToken(req.headers)
      if (token === undefined) {
        res.status(401).end()
        return
      }
      const scopes = String(req.query.scopes ?? 'chat:write,channels:history,channels:read')
      try {
        const url = await controller.initiateConnect(token, scopes)
        res.status(200).json({ url })
      } catch (err) {
        ctx.error('slack connect init failed', { err })
        res.status(403).json({ error: 'forbidden' })
      }
    })()
  })

  // --- OAuth callback (from Slack redirect): authorized by signed `state` ---
  app.get('/v1/slack/oauth', (req: Request, res: Response) => {
    void (async () => {
      const code = String(req.query.code ?? '')
      const state = String(req.query.state ?? '')
      if (code === '' || state === '') {
        res.status(400).json({ error: 'missing code or state' })
        return
      }
      try {
        await controller.connectWorkspace(code, state)
        res.status(200).json({ status: 'connected' })
      } catch (err) {
        ctx.error('slack oauth failed', { err })
        res.status(400).json({ error: 'oauth failed' })
      }
    })()
  })

  // --- Channel mapping admin (requires IAM JWT) ---
  app.post('/v1/slack/mappings', rawJson, (req: Request, res: Response) => {
    void (async () => {
      const token = extractToken(req.headers)
      if (token === undefined) {
        res.status(401).end()
        return
      }
      try {
        await controller.mapChannel(token, req.body)
        res.status(201).end()
      } catch (err) {
        ctx.error('slack mapChannel failed', { err })
        res.status(400).json({ error: 'invalid mapping' })
      }
    })()
  })

  // --- Bot-member admin surface (requires IAM JWT) ---
  const auth = (req: Request, res: Response): string | undefined => {
    const token = extractToken(req.headers)
    if (token === undefined) {
      res.status(401).end()
      return undefined
    }
    return token
  }

  app.get('/v1/bots', (req: Request, res: Response) => {
    void (async () => {
      const token = auth(req, res)
      if (token === undefined) return
      try {
        res.status(200).json({ bots: await controller.listBotMembers(token) })
      } catch (err) {
        ctx.error('list bots failed', { err })
        res.status(500).json({ error: 'failed to list bots' })
      }
    })()
  })

  app.post('/v1/bots/sync', (req: Request, res: Response) => {
    void (async () => {
      const token = auth(req, res)
      if (token === undefined) return
      try {
        await controller.syncBotMembers(token)
        res.status(200).json({ status: 'synced' })
      } catch (err) {
        ctx.error('bot sync failed', { err })
        res.status(500).json({ error: 'sync failed' })
      }
    })()
  })

  app.post('/v1/bots', rawJson, (req: Request, res: Response) => {
    void (async () => {
      const token = auth(req, res)
      if (token === undefined) return
      try {
        await controller.addBotMember(token, req.body)
        res.status(201).end()
      } catch (err) {
        ctx.error('add bot failed', { err })
        res.status(400).json({ error: 'failed to add bot' })
      }
    })()
  })

  app.delete('/v1/bots', rawJson, (req: Request, res: Response) => {
    void (async () => {
      const token = auth(req, res)
      if (token === undefined) return
      try {
        await controller.removeBotMember(token, req.body)
        res.status(200).end()
      } catch (err) {
        ctx.error('remove bot failed', { err })
        res.status(400).json({ error: 'failed to remove bot' })
      }
    })()
  })

  return app
}

export function listen (app: Express, ctx: MeasureContext, port: number): Server {
  return app.listen(port, () => {
    ctx.info('slack service listening', { port })
  })
}
