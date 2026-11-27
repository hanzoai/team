#!/usr/bin/env node
/**
 * Static anti-mock & live-contract assertion against the compiled production
 * bundle (`dist/assets/*.js`). Runs after `pnpm build` in CI so mock strings
 * can never ship to `hanzo.team` again.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets')
const jsFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'))
assert.ok(jsFiles.length > 0, `Expected built JS bundles in ${ASSETS_DIR}`)

const combined = jsFiles.map((f) => readFileSync(join(ASSETS_DIR, f), 'utf8')).join('\n')

const FORBIDDEN = [
  'Your organization · 24 agents',
  'botAutoReplyText',
  "authorId:'zach'",
  'authorId:"zach"',
  "authorId: 'zach'",
  'authorId: "zach"',
]

for (const marker of FORBIDDEN) {
  assert.equal(
    combined.includes(marker),
    false,
    `Forbidden mock string found in built dist/assets/*.js: ${JSON.stringify(marker)}`,
  )
}

const REQUIRED_ENDPOINTS = [
  '/v1/team/channels',
  '/v1/team/members',
  '/v1/team/inbox',
  '/v1/team/docs',
  '/v1/meet/session',
  '/v1/meet/call',
  '/v1/meet/getToken',
  '/v1/agents',
  '/v1/bot/members',
]

for (const endpoint of REQUIRED_ENDPOINTS) {
  assert.equal(
    combined.includes(endpoint),
    true,
    `Required live backend endpoint missing from built dist/assets/*.js: ${endpoint}`,
  )
}

console.log(
  `✓ Static bundle anti-mock & live-contract check passed (${jsFiles.length} JS assets, ${FORBIDDEN.length} mocks absent, ${REQUIRED_ENDPOINTS.length} live endpoints present).`,
)
