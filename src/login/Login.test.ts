import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const LOGIN = readFileSync(new URL('./Login.tsx', import.meta.url), 'utf8')
const CHROME = readFileSync(new URL('../shell/DesktopWindowChrome.tsx', import.meta.url), 'utf8')
const TEAM_ICON = readFileSync(new URL('../../public/logos/hanzo-team.svg', import.meta.url), 'utf8')

test('Login renders canonical web hanzo wordmark masthead (60px) and compact desktop drag masthead (44px), 64px squircle, and Continue without signing in', () => {
  assert.ok(!LOGIN.includes('HEADER_LINKS'), 'marketing HEADER_LINKS must be removed')
  assert.ok(!LOGIN.includes('FOOTER_COLUMNS'), 'marketing FOOTER_COLUMNS must be removed')
  assert.ok(LOGIN.includes('data-slot="wordmark"'), 'web login masthead must render canonical hanzo wordmark')
  assert.ok(LOGIN.includes('fontSize: 28'), 'hanzo wordmark must be 28px')
  assert.ok(LOGIN.includes("letterSpacing: '-0.04em'"), 'hanzo wordmark must use -0.04em tracking')
  assert.ok(LOGIN.includes('data-slot="masthead"'), 'masthead must be present')
  assert.ok(LOGIN.includes('height: desktop ? 44 : 60'), 'masthead must be 60px on web and 44px on desktop')
  assert.ok(LOGIN.includes("justifyContent: desktop ? 'flex-end' : 'space-between'"), 'masthead aligns wordmark left on web and window controls right on desktop')
  assert.ok(LOGIN.includes('data-hanzo-app-icon="hanzo-team"'), '64px Hanzo Team squircle icon must be present')
  assert.ok(LOGIN.includes('SignInPanel'), 'shared SignInPanel must be used')
  assert.ok(LOGIN.includes('id="continue-without-login"'), 'Continue without signing in button must be present')
  assert.ok(LOGIN.includes('Continue without signing in'), 'Continue without signing in copy must be present')
  assert.ok(LOGIN.split('\n').length <= 400, 'Login.tsx must remain compact')

  assert.ok(CHROME.includes('data-slot="window-controls"'), '28x28 window controls must be mounted')
  assert.ok(CHROME.includes('data-slot="desktop-app-menu"'), 'desktop app menu must be mounted')
  assert.ok(CHROME.includes('Local Models &amp; Node'), 'Local Models & Node menu entry must be mounted')
  assert.ok(CHROME.includes('Account &amp; Usage'), 'Account & Usage menu entry must be mounted')
})

test('public/logos/hanzo-team.svg uses the canonical 1024x1024 Obsidian Glass Squircle', () => {
  assert.ok(TEAM_ICON.includes('viewBox="0 0 1024 1024"'))
  assert.ok(TEAM_ICON.includes('stop-color="#19191b"'))
  assert.ok(TEAM_ICON.includes('stroke="url(#rimGrad)"'))
})
