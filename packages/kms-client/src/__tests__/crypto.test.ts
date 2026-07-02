//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { seal, open, encodeEnvelope, decodeEnvelope, type Envelope, type KeyWrapper } from '..'

// In-memory key wrapper that models a KMS master key: it AES-256-GCM-encrypts the
// data key under a fixed "master" key. Exercises the same envelope path as real KMS.
class FakeKmsWrapper implements KeyWrapper {
  readonly keyId: string
  private readonly master: Buffer
  constructor (keyId = 'test/master', master = randomBytes(32)) {
    this.keyId = keyId
    this.master = master
  }

  async wrap (dataKey: Buffer): Promise<Buffer> {
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', this.master, iv)
    const ct = Buffer.concat([c.update(dataKey), c.final()])
    return Buffer.concat([iv, c.getAuthTag(), ct])
  }

  async unwrap (wrapped: Buffer): Promise<Buffer> {
    const iv = wrapped.subarray(0, 12)
    const tag = wrapped.subarray(12, 28)
    const ct = wrapped.subarray(28)
    const d = createDecipheriv('aes-256-gcm', this.master, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(ct), d.final()])
  }
}

describe('envelope crypto', () => {
  const wrapper = new FakeKmsWrapper()

  it('round-trips a token', async () => {
    const secret = 'xoxb-slack-bot-token-1234567890'
    const env = await seal(wrapper, secret)
    expect(env.v).toBe(1)
    expect(env.ciphertext).not.toContain('xoxb')
    const back = await open(wrapper, env)
    expect(back).toBe(secret)
  })

  it('never persists plaintext in any envelope field', async () => {
    const secret = 'super-secret-value'
    const env = await seal(wrapper, secret)
    const blob = JSON.stringify(env)
    expect(blob).not.toContain(secret)
  })

  it('uses a fresh data key + iv per seal (no key/nonce reuse)', async () => {
    const a = await seal(wrapper, 'same-plaintext')
    const b = await seal(wrapper, 'same-plaintext')
    expect(a.iv).not.toBe(b.iv)
    expect(a.wrappedKey).not.toBe(b.wrappedKey)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('rejects tampered ciphertext (GCM integrity)', async () => {
    const env = await seal(wrapper, 'token')
    const raw = Buffer.from(env.ciphertext, 'base64')
    raw[0] ^= 0xff
    const tampered: Envelope = { ...env, ciphertext: raw.toString('base64') }
    await expect(open(wrapper, tampered)).rejects.toThrow()
  })

  it('rejects a tampered auth tag', async () => {
    const env = await seal(wrapper, 'token')
    const tag = Buffer.from(env.tag, 'base64')
    tag[0] ^= 0x01
    await expect(open(wrapper, { ...env, tag: tag.toString('base64') })).rejects.toThrow()
  })

  it('binds AAD: seal with AAD requires matching AAD to open', async () => {
    const aad = 'ws:abc|kind:slack'
    const env = await seal(wrapper, 'token', aad)
    expect(env.aad).toBe(aad)
    await expect(open(wrapper, env, 'ws:other|kind:slack')).rejects.toThrow('AAD mismatch')
    await expect(open(wrapper, env, aad)).resolves.toBe('token')
  })

  it('detects AAD swap even without an expected value (GCM verifies bound aad)', async () => {
    const env = await seal(wrapper, 'token', 'ws:a')
    // attacker rewrites the aad label hoping the cipher ignores it
    await expect(open(wrapper, { ...env, aad: 'ws:b' })).rejects.toThrow()
  })

  it('encode/decode round-trips and rejects malformed secrets', async () => {
    const env = await seal(wrapper, 'token')
    const s = encodeEnvelope(env)
    expect(decodeEnvelope(s)).toEqual(env)
    expect(() => decodeEnvelope('{}')).toThrow('malformed envelope')
    expect(() => decodeEnvelope('not-json')).toThrow()
  })

  it('carries keyId for rotation and unwrap still works after re-key of others', async () => {
    const oldWrapper = new FakeKmsWrapper('team/slack@v1')
    const env = await seal(oldWrapper, 'legacy-token')
    expect(env.keyId).toBe('team/slack@v1')
    // a different current key must not be able to open an old envelope
    const newWrapper = new FakeKmsWrapper('team/slack@v2')
    await expect(open(newWrapper, env)).rejects.toThrow()
    // the matching wrapper opens it
    await expect(open(oldWrapper, env)).resolves.toBe('legacy-token')
  })
})
