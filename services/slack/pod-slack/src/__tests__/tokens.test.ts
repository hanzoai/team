//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { KeyWrapper } from '@hanzoteam/kms-client'
import { SlackTokenStorage, type SlackToken } from '../tokens'

// Fake KMS master-key wrapper (same as kms-client tests).
class FakeKmsWrapper implements KeyWrapper {
  readonly keyId = 'test/master'
  private readonly master = randomBytes(32)
  async wrap (dk: Buffer): Promise<Buffer> {
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', this.master, iv)
    return Buffer.concat([iv, (() => { const ct = Buffer.concat([c.update(dk), c.final()]); return Buffer.concat([c.getAuthTag(), ct]) })()])
  }

  async unwrap (w: Buffer): Promise<Buffer> {
    const iv = w.subarray(0, 12)
    const tag = w.subarray(12, 28)
    const ct = w.subarray(28)
    const d = createDecipheriv('aes-256-gcm', this.master, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(ct), d.final()])
  }
}

// Minimal in-memory account-service integration-secret store.
class FakeAccountClient {
  store = new Map<string, { secret: string }>()
  private k (r: any): string {
    return `${r.kind}|${r.socialId}|${r.workspaceUuid}|${r.key}`
  }

  async getIntegrationSecret (r: any): Promise<{ secret: string } | null> {
    return this.store.get(this.k(r)) ?? null
  }

  async addIntegrationSecret (r: any): Promise<void> {
    this.store.set(this.k(r), { secret: r.secret })
  }

  async updateIntegrationSecret (r: any): Promise<void> {
    this.store.set(this.k(r), { secret: r.secret })
  }

  async deleteIntegrationSecret (r: any): Promise<void> {
    this.store.delete(this.k(r))
  }
}

const socialId = 'sid-1' as any
const ws = 'ws-1' as any

const token: SlackToken = {
  accessToken: 'xoxb-super-secret-bot-token',
  botUserId: 'B1',
  teamId: 'T1',
  teamName: 'Acme',
  scope: 'chat:write',
  appId: 'A1'
}

describe('SlackTokenStorage', () => {
  it('persists only ciphertext (no plaintext token in the account store)', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    await s.save(socialId, token)
    const stored = [...acc.store.values()][0].secret
    expect(stored).not.toContain('xoxb-super-secret-bot-token')
    expect(stored).toContain('ciphertext') // it's an envelope
  })

  it('round-trips the token via envelope decrypt', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    await s.save(socialId, token)
    const back = await s.get(socialId, 'T1')
    expect(back).toEqual(token)
  })

  it('updates in place on re-save (no duplicate secrets)', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    await s.save(socialId, token)
    await s.save(socialId, { ...token, accessToken: 'xoxb-rotated' })
    expect(acc.store.size).toBe(1)
    const back = await s.get(socialId, 'T1')
    expect(back?.accessToken).toBe('xoxb-rotated')
  })

  it('rejects a read under a mismatched team (AAD scope binding)', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    await s.save(socialId, token)
    await expect(s.get(socialId, 'T-other')).rejects.toThrow()
  })

  it('returns null when no secret exists', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    expect(await s.get(socialId, 'T1')).toBeNull()
  })

  it('deletes the secret', async () => {
    const acc = new FakeAccountClient()
    const s = new SlackTokenStorage(acc as any, new FakeKmsWrapper(), ws)
    await s.save(socialId, token)
    await s.delete(socialId)
    expect(acc.store.size).toBe(0)
  })
})
