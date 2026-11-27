import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { ASIDE, NAV, PANE_ROUND, RAIL } from './measure.ts'
import {
  DEFAULT_REQUIRED_CHANNELS,
  filterChannelItems,
  matchTeamShortcut,
  TEAM_CROSS_APPS,
} from './unified.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SHEET = readFileSync(join(ROOT, 'theme/tokens.css'), 'utf8')
const HEADER_TSX = readFileSync(join(ROOT, 'shell/BusinessHeader.tsx'), 'utf8')
const RAIL_TSX = readFileSync(join(ROOT, 'shell/Rail.tsx'), 'utf8')
const SIDEBAR_TSX = readFileSync(join(ROOT, 'shell/UnifiedSidebar.tsx'), 'utf8')
const SHELL_TSX = readFileSync(join(ROOT, 'shell/Shell.tsx'), 'utf8')
const RIGHT_TSX = readFileSync(join(ROOT, 'shell/RightPane.tsx'), 'utf8')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

test('Hanzo Team v1.1.0 4-column Discord × Mattermost geometry & Zen Obsidian Dark tokens', () => {
  assert.equal(RAIL, 56)
  assert.equal(NAV, 244)
  assert.equal(ASIDE, 296)
  assert.equal(PANE_ROUND, 12)
  assert.ok(SHEET.includes('--background: #000000;'))
  assert.ok(SHEET.includes('--team-ground: #000000;'))
  assert.ok(SHEET.includes('--team-sidebar: #0c0c0c;'))
  assert.ok(SHEET.includes('--team-panel: #090909;'))
  assert.ok(SHEET.includes('--team-omnibox: #141414;'))
  assert.ok(SHEET.includes('--team-aside: #0c0c0c;'))
  assert.ok(SHEET.includes('--team-border: #222222;'))
  assert.ok(SHEET.includes('--settings-nav-bg: #0c0c0c;'))
  assert.ok(SHEET.includes('--settings-stage-bg: #090909;'))
  assert.ok(SHEET.includes('--settings-card-bg: #141414;'))
  assert.ok(SHEET.includes('--settings-border: #222222;'))
  assert.ok(SHEET.includes('--composer-accent: #d11641;'))
  assert.ok(SHEET.includes('background: transparent !important;'))
  assert.ok(SHEET.includes('border-radius: 12px !important;'))

  const mainTsx = readFileSync(join(ROOT, 'main.tsx'), 'utf8')
  assert.ok(mainTsx.includes("import '@hanzo/font/css'"))
  assert.ok(
    mainTsx.indexOf("import '~/theme/tokens.css'") > mainTsx.indexOf("import { App } from '~/app'"),
    'tokens.css must be imported after App (@hanzo/ui) so #000000 ground wins the cascade',
  )

  assert.ok(RAIL_TSX.includes('data-testid="guild-org-rail"'))
  assert.ok(SIDEBAR_TSX.includes('data-testid="sidebar-org-switcher-trigger"'))
  assert.ok(SIDEBAR_TSX.includes('data-testid="discord-voice-connected-bar"'))
  assert.ok(SIDEBAR_TSX.includes('data-testid="sidebar-account-org-footer"'))
  assert.ok(RIGHT_TSX.includes('data-testid="mattermost-thread-rhs"'))
  assert.ok(RIGHT_TSX.includes('data-testid="workforce-roster-rhs"'))
  assert.ok(SHELL_TSX.includes('data-testid="team-main-stage"'))
})

test('Hanzo Team decomplects to ONE centered Search or ask anything (Ctrl+K) omnibox in 38px top bar', () => {
  assert.ok(HEADER_TSX.includes('Search or ask anything'))
  assert.ok(HEADER_TSX.includes('data-testid="top-omnibox-trigger"'))
  assert.ok(HEADER_TSX.includes('hanzo:team-open-command-palette'))
  assert.ok(!SIDEBAR_TSX.includes('data-testid="sidebar-find-input"'))
})

test('Every source file under src/ is strictly <= 1,000 lines', () => {
  const overLimit: string[] = []
  for (const file of walk(ROOT)) {
    if (!/\.(ts|tsx|css)$/.test(file)) continue
    const lines = readFileSync(file, 'utf8').split('\n').length
    if (lines > 1000) overLimit.push(`${file.slice(ROOT.length)} (${lines} lines)`)
  }
  assert.deepEqual(overLimit, [])
})

test('Hanzo Team declares required channels & keyboard shortcuts cleanly', () => {
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

  const rooms = [
    { name: 'general', topic: 'Company updates' },
    { name: 'engineering', topic: 'Runtime & SDK PRs' },
    { name: 'incidents', topic: 'On-call alerts' },
  ]
  assert.equal(filterChannelItems(rooms, '#eng').length, 1)
  assert.equal(filterChannelItems(rooms, '#eng')[0]?.name, 'engineering')

  assert.equal(matchTeamShortcut({ key: 'b', metaKey: true }), 'toggle-sidebar')
  assert.equal(matchTeamShortcut({ key: 'b', metaKey: true, isContentEditable: true }), null)
  assert.equal(matchTeamShortcut({ key: '.', metaKey: true }), 'toggle-thread-pane')
  assert.equal(matchTeamShortcut({ key: 'k', ctrlKey: true }), 'command-palette')
  assert.equal(matchTeamShortcut({ key: ',', metaKey: true }), 'settings')
  assert.equal(matchTeamShortcut({ key: '/', metaKey: true }), 'shortcuts')
  assert.equal(matchTeamShortcut({ key: 'O', metaKey: true, shiftKey: true }), 'new-thread')
  assert.equal(matchTeamShortcut({ key: '1', altKey: true }), 'view-1')
  assert.equal(matchTeamShortcut({ key: '6', altKey: true }), 'view-6')

  assert.deepEqual(
    TEAM_CROSS_APPS.map((a) => a.id),
    ['dev', 'bot', 'team', 'console', 'desktop'],
  )
})
