//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Envelope-encrypted payload. This is what gets persisted (never the plaintext).
 *
 *  - `wrappedKey` : the per-secret data key, encrypted by the KMS master key.
 *                   The plaintext data key exists only transiently in memory.
 *  - `iv`         : 96-bit GCM nonce for the payload cipher.
 *  - `ciphertext` : AES-256-GCM ciphertext of the plaintext token.
 *  - `tag`        : GCM authentication tag (integrity + authenticity).
 *  - `keyId`      : KMS key reference used to wrap `wrappedKey`, for rotation.
 *  - `aad`        : optional additional-authenticated-data label bound at seal.
 *
 * All binary fields are base64. `v` is the envelope format version.
 */
export interface Envelope {
  v: 1
  keyId: string
  wrappedKey: string
  iv: string
  ciphertext: string
  tag: string
  aad?: string
}

const ALG = 'aes-256-gcm'
const KEY_LEN = 32 // 256-bit
const IV_LEN = 12 // 96-bit GCM nonce
const TAG_LEN = 16

/** A key-wrapping provider. In prod this is the Hanzo KMS; the data key never leaves it in plaintext. */
export interface KeyWrapper {
  /** KMS key reference used to wrap. Bound into the envelope for rotation. */
  keyId: string
  /** Wrap a freshly generated 256-bit data key. */
  wrap: (dataKey: Buffer, keyId: string) => Promise<Buffer>
  /** Unwrap the data key previously wrapped under `keyId`. */
  unwrap: (wrappedKey: Buffer, keyId: string) => Promise<Buffer>
}

/**
 * Envelope-encrypt `plaintext`:
 *   1. generate a random 256-bit data key
 *   2. AES-256-GCM encrypt the plaintext under the data key (with optional AAD)
 *   3. wrap the data key with KMS
 *   4. zero the plaintext data key
 * Returns only ciphertext material; the plaintext is never persisted.
 */
export async function seal (wrapper: KeyWrapper, plaintext: string, aad?: string): Promise<Envelope> {
  const dataKey = randomBytes(KEY_LEN)
  try {
    const iv = randomBytes(IV_LEN)
    const cipher = createCipheriv(ALG, dataKey, iv, { authTagLength: TAG_LEN })
    if (aad !== undefined) cipher.setAAD(Buffer.from(aad, 'utf8'))
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])
    const tag = cipher.getAuthTag()
    const wrappedKey = await wrapper.wrap(dataKey, wrapper.keyId)
    return {
      v: 1,
      keyId: wrapper.keyId,
      wrappedKey: wrappedKey.toString('base64'),
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      ...(aad !== undefined ? { aad } : {})
    }
  } finally {
    dataKey.fill(0)
  }
}

/**
 * Decrypt an {@link Envelope}. Verifies the GCM tag (and AAD, if the caller
 * passes an expected value) — tampered ciphertext or a mismatched AAD throws.
 */
export async function open (wrapper: KeyWrapper, env: Envelope, expectedAad?: string): Promise<string> {
  if (env.v !== 1) throw new Error(`unsupported envelope version: ${String(env.v)}`)
  if (expectedAad !== undefined && env.aad !== expectedAad) {
    throw new Error('envelope AAD mismatch')
  }
  const dataKey = await wrapper.unwrap(Buffer.from(env.wrappedKey, 'base64'), env.keyId)
  try {
    const decipher = createDecipheriv(ALG, dataKey, Buffer.from(env.iv, 'base64'), { authTagLength: TAG_LEN })
    if (env.aad !== undefined) decipher.setAAD(Buffer.from(env.aad, 'utf8'))
    decipher.setAuthTag(Buffer.from(env.tag, 'base64'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(env.ciphertext, 'base64')), decipher.final()])
    return plaintext.toString('utf8')
  } finally {
    dataKey.fill(0)
  }
}

/** Serialize an envelope for storage in IntegrationSecret.secret. */
export function encodeEnvelope (env: Envelope): string {
  return JSON.stringify(env)
}

/** Parse a stored envelope; rejects anything that isn't a well-formed envelope. */
export function decodeEnvelope (secret: string): Envelope {
  const env = JSON.parse(secret) as Envelope
  if (
    env == null ||
    env.v !== 1 ||
    typeof env.keyId !== 'string' ||
    typeof env.wrappedKey !== 'string' ||
    typeof env.iv !== 'string' ||
    typeof env.ciphertext !== 'string' ||
    typeof env.tag !== 'string'
  ) {
    throw new Error('malformed envelope')
  }
  return env
}
