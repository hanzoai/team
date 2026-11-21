import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { NAV, PANE_ROUND } from './measure.ts'
import {
  DEFAULT_REQUIRED_CHANNELS,
  filterChannelItems,
  matchTeamShortcut,
  TEAM_CROSS_APPS,
} from './unified.ts'

const ROOT = new URL('../', import.meta.url).pathname
const SHEET = readFileSync(join(ROOT, 'theme/tokens.css'), 'utf8')
const CHANNELS_TSX = readFileSync(join(ROOT, 'chat/Channels.tsx'), 'utf8')
const CHAT_TSX = readFileSync(join(ROOT, 'chat/Chat.tsx'), 'utf8')
const HEADER_TSX = readFileSync(join(ROOT, 'shell/BusinessHeader.tsx'), 'utf8')
const NAV_TSX = readFileSync(join(ROOT, 'shell/Nav.tsx'), 'utf8')
const SHELL_TSX = readFileSync(join(ROOT, 'shell/Shell.tsx'), 'utf8')

test('Hanzo Team shell geometry & obsidian tokens match Hanzo Dev chrome', () => {
  assert.equal(NAV, 256)
  assert.equal(PANE_ROUND, 12)
  assert.ok(SHEET.includes('--team-ground: #050505;'))
  assert.ok(SHEET.includes('--team-sidebar: #09090b;'))
  assert.ok(SHEET.includes('--team-panel: #0f0f12;'))
  assert.ok(SHEET.includes('--team-rule: rgba(255, 255, 255, 0.08);'))
  assert.ok(NAV_TSX.includes('data-testid="sidebar-org-switcher-trigger"'))
  assert.ok(NAV_TSX.includes('ORGANIZATIONS (X-ORG-ID)'))
  assert.ok(NAV_TSX.includes('data-testid="nav-command-palette-trigger"'))
  assert.ok(NAV_TSX.includes('data-testid="nav-collapse-sidebar-trigger"'))
  assert.ok(SHELL_TSX.includes('data-testid="sidebar-account-org-footer"'))
  assert.ok(SHELL_TSX.includes('hanzo.id'))
})

test('Hanzo Team decomplects to ONE unified search bar (no duplicate top-right search when sidebar is open)', () => {
  assert.ok(!HEADER_TSX.includes('data-testid="slack-top-search-trigger"'))
  assert.ok(HEADER_TSX.includes('!navOpen ?'))
  assert.ok(HEADER_TSX.includes('data-testid="collapsed-search-trigger"'))
  assert.ok(HEADER_TSX.includes('hanzo:team-open-command-palette'))
  assert.ok(NAV_TSX.includes('data-testid="sidebar-find-input"'))
  assert.ok(CHAT_TSX.includes('data-testid="chat-header-inbox-trigger"'))
})

test('Hanzo Team sidebar declares the required Channels and lists only people and bots the space holds', () => {
  for (const requiredChannel of [
    'general',
    'engineering',
    'deployments',
    'approvals',
    'incidents',
  ] as const) {
    assert.ok(
      DEFAULT_REQUIRED_CHANNELS.includes(requiredChannel),
      `missing #${requiredChannel} in required channels`,
    )
  }
  assert.ok(CHANNELS_TSX.includes('placeholder="Search…"'))
  assert.ok(CHANNELS_TSX.includes('New Channel'))
})

// A new account's sidebar named four people and bots it did not have (two of them the
// founders, with presence dots), each a row that opened "No such room", and the palette
// and the new-channel shortcut reached for a #general no space is made with. Only what
// the space's own roster and rooms answer is listed or jumped to.
test('Hanzo Team invents no roster, no unread counts and no room', () => {
  for (const [name, src] of [['Channels', CHANNELS_TSX], ['BusinessHeader', HEADER_TSX], ['Shell', SHELL_TSX]] as const) {
    for (const invented of ['DIRECT_HANDOFF_ROSTER', 'DEFAULT_CHANNEL_UNREADS', 'Bot Handoffs', '@release-bot', '@zach', '@antje', 'c-general']) {
      assert.ok(!src.includes(invented), `${name} still names ${invented}`)
    }
  }
  assert.ok(TEAM_CROSS_APPS.every((a) => a.internalPath !== '/chat/c-general'))
})

test('filterChannelItems filters accurately', () => {
  const rooms = [
    { name: 'general', topic: 'Company updates' },
    { name: 'engineering', topic: 'Runtime & SDK PRs' },
    { name: 'incidents', topic: 'On-call alerts' },
  ]
  assert.equal(filterChannelItems(rooms, '#eng').length, 1)
  assert.equal(filterChannelItems(rooms, '#eng')[0]?.name, 'engineering')
})

test('matchTeamShortcut handles ⌘B, ⌘K, ⌘,, ⌘/, and ⇧⌘O', () => {
  assert.equal(matchTeamShortcut({ key: 'b', metaKey: true }), 'toggle-sidebar')
  assert.equal(matchTeamShortcut({ key: 'b', metaKey: true, isContentEditable: true }), null)
  assert.equal(matchTeamShortcut({ key: 'k', ctrlKey: true }), 'command-palette')
  assert.equal(matchTeamShortcut({ key: ',', metaKey: true }), 'settings')
  assert.equal(matchTeamShortcut({ key: '/', metaKey: true }), 'shortcuts')
  assert.equal(matchTeamShortcut({ key: 'O', metaKey: true, shiftKey: true }), 'new-thread')

  assert.deepEqual(
    TEAM_CROSS_APPS.map((a) => a.id),
    ['dev', 'bot', 'team', 'console', 'desktop'],
  )
})
