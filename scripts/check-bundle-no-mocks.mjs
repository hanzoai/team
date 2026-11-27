#!/usr/bin/env node
/**
 * Static anti-mock & live-contract assertion against the compiled production
 * bundle (`dist/assets/*.js`). Runs via `node --test` after `pnpm build` in CI
 * so mock strings can never ship to `hanzo.team` again.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets')

const FORBIDDEN = [
  'Your organization · 24 agents',
  'botAutoReplyText',
  "authorId:'zach'",
  'authorId:"zach"',
  "authorId: 'zach'",
  'authorId: "zach"',
]

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

function readBuiltBundle() {
  const jsFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'))
  assert.ok(jsFiles.length > 0, `Expected built JS bundles in ${ASSETS_DIR}`)
  return jsFiles.map((f) => readFileSync(join(ASSETS_DIR, f), 'utf8')).join('\n')
}

test('built dist/assets/*.js contains zero forbidden mock workforce/channel/reply markers', () => {
  const combined = readBuiltBundle()
  for (const marker of FORBIDDEN) {
    assert.equal(
      combined.includes(marker),
      false,
      `Forbidden mock string found in built dist/assets/*.js: ${JSON.stringify(marker)}`,
    )
  }
})

test('built dist/assets/*.js wires all required live /v1/team, /v1/meet, /v1/agents, and /v1/bot endpoints', () => {
  const combined = readBuiltBundle()
  for (const endpoint of REQUIRED_ENDPOINTS) {
    assert.equal(
      combined.includes(endpoint),
      true,
      `Required live backend endpoint missing from built dist/assets/*.js: ${endpoint}`,
    )
  }
})
