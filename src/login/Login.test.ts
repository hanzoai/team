import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const LOGIN = readFileSync(new URL('./Login.tsx', import.meta.url), 'utf8')
const CHROME = readFileSync(new URL('../shell/DesktopWindowChrome.tsx', import.meta.url), 'utf8')
const HEADER = readFileSync(new URL('../shell/BusinessHeader.tsx', import.meta.url), 'utf8')
const ICON_SVG = readFileSync(new URL('../../public/logos/hanzo-team.svg', import.meta.url), 'utf8')

test('Hanzo Team Login & Workspace Header render canonical corner masthead, frameless window controls, and solid #121214 app menu', () => {
  const lines = LOGIN.split('\n').length
  assert.ok(lines <= 350, `expected Login.tsx <= 350 lines, got ${lines}`)

  assert.ok(LOGIN.includes('data-slot="masthead"'), 'expected canonical corner masthead')
  assert.ok(!LOGIN.includes('maxW={1120}') && !LOGIN.includes('maxWidth: 1120'), 'masthead must not constrain wordmark inward')
  assert.ok(LOGIN.includes("padding: '0 0 20px'"), 'outer login shell must keep zero horizontal/top padding')
  assert.ok(LOGIN.includes('paddingLeft: macDesktop ? 84 : 24'), 'masthead must align wordmark to 24px corner (84px on macOS desktop)')
  assert.ok(LOGIN.includes('data-slot="wordmark"'), 'expected lowercase hanzo wordmark slot')
  assert.ok(LOGIN.includes('fontSize: 28'), 'wordmark must match hanzo.ai 28px')
  assert.ok(LOGIN.includes('<DesktopWindowControls />'), 'Login masthead must mount frameless window controls on Linux/Windows')
  assert.ok(LOGIN.includes('src="/logos/hanzo-team.svg"'), 'expected canonical hanzo-team.svg app icon')
  assert.ok(LOGIN.includes('<HanzoTeamAppIcon size={64} />'), 'expected 64px app icon above SignInPanel')
  assert.ok(LOGIN.includes('© 2026 Hanzo AI'), 'expected canonical Hanzo AI footer')

  assert.ok(CHROME.includes('data-slot="window-controls"'), 'expected 28x28 window controls slot')
  assert.ok(CHROME.includes('var(--hanzo-menu-bg, #121214)'), 'expected solid #121214 app menu')
  for (const item of ['Home', 'Channels', 'Issues', 'Docs', 'Reload window', 'Quit']) {
    assert.ok(CHROME.includes(item), `expected ${item} in desktop _- app menu`)
  }
  assert.ok(HEADER.includes('height={isDesktop ? 44 : 38}'), 'expected 44px Row-1 frameless top bar on desktop')
  assert.ok(HEADER.includes('<DesktopAppMenu onNavigate={jumpTo} />'), 'expected DesktopAppMenu in BusinessHeader')
  assert.ok(HEADER.includes('<DesktopWindowControls />'), 'expected DesktopWindowControls in BusinessHeader')

  assert.ok(ICON_SVG.includes('Uniform Obsidian Glass Squircle Shell'), 'hanzo-team.svg must be canonical Obsidian Glass Squircle')
})
