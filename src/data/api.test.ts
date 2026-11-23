import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cloudOrigin,
  getTeamBackend,
  hanzod,
  hanzodOrigin,
  resolveApiOrigin,
  setTeamBackend,
  TEAM_BACKEND_STORAGE_KEY,
  team,
  v1,
} from './api.ts'

function withMockLocalStorage(fn: (store: Map<string, string>) => void): void {
  const store = new Map<string, string>()
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    },
  })
  try {
    fn(store)
  } finally {
    if (prev) {
      Object.defineProperty(globalThis, 'localStorage', prev)
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  }
}

test('defaults to shared multiplayer cloud origin in published mode and empty origin in dev', () => {
  assert.equal(resolveApiOrigin({ isDev: false, backend: null, envOrigin: '' }), cloudOrigin)
  assert.equal(resolveApiOrigin({ isDev: true, backend: null, envOrigin: '' }), '')
})

test('routes /v1/team/* and v1(...) through local hanzod when hanzo.team.backend === hanzod', () => {
  withMockLocalStorage((store) => {
    assert.equal(getTeamBackend(), 'cloud')
    assert.equal(team.account, 'https://api.hanzo.ai/v1/team/account')

    setTeamBackend('hanzod')
    assert.equal(store.get(TEAM_BACKEND_STORAGE_KEY), 'hanzod')
    assert.equal(getTeamBackend(), 'hanzod')
    assert.equal(team.account, 'http://127.0.0.1:3690/v1/team/account')
    assert.equal(team.channels, 'http://127.0.0.1:3690/v1/team/channels')
    assert.equal(team.dms, 'http://127.0.0.1:3690/v1/team/dms')
    assert.equal(team.files, 'http://127.0.0.1:3690/v1/team/files')
    assert.equal(team.plan, 'http://127.0.0.1:3690/v1/team/billing/plan')
    assert.equal(team.health, 'http://127.0.0.1:3690/v1/team/health')
    assert.equal(v1('/base/collections/tasks'), 'http://127.0.0.1:3690/v1/base/collections/tasks')
  })
})

test('VITE_HANZO_API_ORIGIN takes precedence and strips trailing slashes', () => {
  assert.equal(
    resolveApiOrigin({ envOrigin: 'http://127.0.0.1:3690///', backend: 'cloud', isDev: true }),
    'http://127.0.0.1:3690',
  )
})

test('exposes hanzodOrigin and local engine, bots, tasks worker, and k3s endpoints', () => {
  assert.equal(hanzodOrigin, 'http://127.0.0.1:3690')
  assert.equal(hanzod.manifest, 'http://127.0.0.1:3690/v1/hanzod')
  assert.equal(hanzod.worker, 'http://127.0.0.1:3690/v1/hanzod/worker')
  assert.equal(hanzod.engineCatalog, 'http://127.0.0.1:3690/v1/engine/catalog')
  assert.equal(hanzod.botRun('dev'), 'http://127.0.0.1:3690/v1/bot/bots/dev/run')
  assert.equal(hanzod.clusterUp, 'http://127.0.0.1:3690/v1/cluster/up')
  assert.equal(hanzod.clusterDown, 'http://127.0.0.1:3690/v1/cluster/down')
  assert.equal(hanzod.k3s, 'http://127.0.0.1:3690/v1/k3s')
})
