import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const LOGIN = readFileSync(new URL('./Login.tsx', import.meta.url), 'utf8')
const ICON_SVG = readFileSync(new URL('../../public/logos/hanzo-team.svg', import.meta.url), 'utf8')

test('Hanzo Team Login renders canonical corner masthead, 64px obsidian squircle icon, and footer on web and desktop', () => {
  const lines = LOGIN.split('\n').length
  assert.ok(lines <= 350, `expected Login.tsx <= 350 lines, got ${lines}`)

  assert.ok(LOGIN.includes('data-slot="masthead"'), 'expected canonical corner masthead')
  assert.ok(!LOGIN.includes('maxW={1120}') && !LOGIN.includes('maxWidth: 1120'), 'masthead must not constrain wordmark inward')
  assert.ok(LOGIN.includes("padding: '0 0 20px'"), 'outer login shell must keep zero horizontal/top padding')
  assert.ok(LOGIN.includes('paddingLeft: macDesktop ? 84 : 24'), 'masthead must align wordmark to 24px corner (84px on macOS desktop)')
  assert.ok(LOGIN.includes('data-slot="wordmark"'), 'expected lowercase hanzo wordmark slot')
  assert.ok(LOGIN.includes('fontSize: 28'), 'wordmark must match hanzo.ai 28px')
  assert.ok(LOGIN.includes('src="/logos/hanzo-team.svg"'), 'expected canonical hanzo-team.svg app icon')
  assert.ok(LOGIN.includes('<HanzoTeamAppIcon size={64} />'), 'expected 64px app icon above SignInPanel')
  assert.ok(LOGIN.includes('© 2026 Hanzo AI'), 'expected canonical Hanzo AI footer')
  assert.ok(!LOGIN.includes('HEADER_LINKS') && !LOGIN.includes('FOOTER_COLUMNS') && !LOGIN.includes('TeamShowcase'), 'marketing chrome must not live on Login')

  assert.ok(ICON_SVG.includes('Uniform Obsidian Glass Squircle Shell'), 'hanzo-team.svg must be canonical Obsidian Glass Squircle')
  assert.ok(ICON_SVG.includes('M 278 360'), 'hanzo-team.svg must carry canonical overlapping chat glyph')
})
