import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const LOGIN = readFileSync(new URL('./Login.tsx', import.meta.url), 'utf8')
const CHROME = readFileSync(new URL('../shell/DesktopWindowChrome.tsx', import.meta.url), 'utf8')
const TEAM_ICON = readFileSync(new URL('../../public/logos/hanzo-team.svg', import.meta.url), 'utf8')

test('Login renders compact wordmark-free 44px masthead, 64px squircle, Sign in to Hanzo Team, and Continue without signing in', () => {
  assert.ok(!LOGIN.includes('HEADER_LINKS'), 'marketing HEADER_LINKS must be removed')
  assert.ok(!LOGIN.includes('FOOTER_COLUMNS'), 'marketing FOOTER_COLUMNS must be removed')
  assert.ok(!LOGIN.includes('data-slot="wordmark"'), 'top-left wordmark must be removed from login masthead')
  assert.ok(LOGIN.includes('data-slot="masthead"'), '44px drag masthead must be present')
  assert.ok(LOGIN.includes('height: 44'), 'login masthead must be 44px tall')
  assert.ok(LOGIN.includes("justifyContent: 'flex-end'"), 'login masthead aligns window controls right')
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
