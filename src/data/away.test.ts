import assert from 'node:assert/strict'
import { test } from 'node:test'

import { address, away, hinted, logout } from './away.ts'

/** What @hanzo/iam `getSigninUrl` answers on hanzo.team: the issuer's address, this app's request. */
const OWN =
  'https://hanzo.id/oauth/authorize?client_id=hanzo-team-native&response_type=code' +
  '&redirect_uri=https%3A%2F%2Fhanzo.team%2Fauth%2Fcallback&scope=openid+profile+email+offline_access' +
  '&state=s1&code_challenge=c1&code_challenge_method=S256'

const request = (url: URL) => Object.fromEntries(url.searchParams)

test("the sign-in is hanzo.ai's page carrying this app's own request", () => {
  const url = new URL(away(OWN))
  assert.equal(url.origin + url.pathname, 'https://hanzo.ai/login')
  assert.deepEqual(request(url), request(new URL(OWN)))
  assert.equal(url.searchParams.get('redirect_uri'), 'https://hanzo.team/auth/callback')
})

test('making an account carries the same request to /signup', () => {
  const url = new URL(away(OWN, 'signup'))
  assert.equal(url.origin + url.pathname, 'https://hanzo.ai/signup')
  assert.deepEqual(request(url), request(new URL(OWN)))
})

test('another account asks hanzo.ai to let the person choose', () => {
  const url = new URL(away(OWN, 'another'))
  assert.equal(url.origin + url.pathname, 'https://hanzo.ai/login')
  assert.equal(url.searchParams.get('prompt'), 'select_account')
  assert.equal(url.searchParams.get('state'), 's1')
})

test('a provider already chosen rides along, and only when there is one', () => {
  assert.equal(new URL(away(OWN, 'login', 'github')).searchParams.get('provider'), 'github')
  assert.equal(new URL(away(OWN, 'login', null)).searchParams.has('provider'), false)
  assert.equal(new URL(away(OWN)).searchParams.has('prompt'), false)
})

test("a sign-out ends IAM's session everywhere and comes back to this app's front page", () => {
  const url = new URL(logout('https://hanzo.id', 'hanzo-team-native', 'https://hanzo.team'))
  assert.equal(url.origin + url.pathname, 'https://hanzo.id/v1/iam/oauth/logout')
  assert.deepEqual(request(url), {
    client_id: 'hanzo-team-native',
    everywhere: 'true',
    post_logout_redirect_uri: 'https://hanzo.team/',
  })
})

test('the sign-out names the host it was pressed on, and no id token', () => {
  const url = new URL(logout('https://hanzo.id/', 'hanzo-team-native', 'https://www.hanzo.team'))
  assert.equal(url.origin + url.pathname, 'https://hanzo.id/v1/iam/oauth/logout')
  assert.equal(url.searchParams.get('post_logout_redirect_uri'), 'https://www.hanzo.team/')
  assert.equal(url.searchParams.has('id_token_hint'), false)
  assert.equal(new URL(logout('https://hanzo.id', 'hanzo-team2', 'https://team2.hanzo.ai')).searchParams.get('client_id'), 'hanzo-team2')
})

test('a dev server signs out on its own page', () => {
  assert.equal(logout('https://hanzo.id', 'hanzo-team-native', 'http://localhost:5173'), '/login?from=logout')
  assert.equal(logout('https://hanzo.id', 'hanzo-team-native', 'http://127.0.0.1:5173'), '/login?from=logout')
})

test('Continue with Google or GitHub names that provider for hanzo.ai, beside the request', () => {
  for (const provider of ['google', 'github'] as const) {
    const url = new URL(away(OWN, 'login', provider))
    assert.equal(url.origin + url.pathname, 'https://hanzo.ai/login')
    assert.equal(url.searchParams.get('provider'), provider)
    assert.equal(url.searchParams.get('client_id'), 'hanzo-team-native')
    assert.equal(url.searchParams.get('code_challenge'), 'c1')
  }
})

test("the typed address is asked of the SDK as the request's login_hint, and only when there is one", () => {
  assert.deepEqual(hinted('ana@hanzo.ai'), { additionalParams: { login_hint: 'ana@hanzo.ai' } })
  assert.equal(hinted(undefined), undefined)
  assert.equal(hinted(''), undefined)
})

test('a login_hint in the request reaches hanzo.ai with the rest of it', () => {
  const url = new URL(away(`${OWN}&login_hint=ana%40hanzo.ai`))
  assert.equal(url.origin + url.pathname, 'https://hanzo.ai/login')
  assert.equal(url.searchParams.get('login_hint'), 'ana@hanzo.ai')
  assert.equal(url.searchParams.get('state'), 's1')
})

test('only an address-shaped entry is taken, trimmed', () => {
  assert.equal(address('  Ana@Hanzo.ai '), 'Ana@Hanzo.ai')
  assert.equal(address('ana+team@mail.hanzo.ai'), 'ana+team@mail.hanzo.ai')
  for (const typed of ['', '   ', 'ana', 'ana@', '@hanzo.ai', 'ana@hanzo', 'a na@hanzo.ai', 'ana@@hanzo.ai']) {
    assert.equal(address(typed), null, typed)
  }
})
