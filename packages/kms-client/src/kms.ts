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

import type { KeyWrapper } from './crypto'

/**
 * Config for the Hanzo KMS (kms.hanzo.ai) key-wrapping endpoint.
 * The master key referenced by `keyId` never leaves KMS; only wrap/unwrap of
 * ephemeral data keys crosses the wire.
 */
export interface KmsConfig {
  /** Base URL, e.g. https://kms.hanzo.ai */
  url: string
  /** Bearer token for the KMS machine identity (from IAM/KMS, never hardcoded). */
  token: string
  /** KMS key reference to wrap under, e.g. 'team/slack'. */
  keyId: string
  /** fetch impl (injectable for tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch
}

interface WrapResponse {
  wrappedKey: string // base64
}
interface UnwrapResponse {
  key: string // base64 plaintext data key
}

/**
 * KMS-backed {@link KeyWrapper}. Uses the KMS encrypt/decrypt (key-wrap) API to
 * protect per-secret data keys. The data key is generated locally, wrapped by
 * KMS, and the plaintext data key is discarded immediately after use.
 */
export class KmsKeyWrapper implements KeyWrapper {
  readonly keyId: string
  private readonly url: string
  private readonly token: string
  private readonly doFetch: typeof fetch

  constructor (cfg: KmsConfig) {
    this.keyId = cfg.keyId
    this.url = cfg.url.replace(/\/+$/, '')
    this.token = cfg.token
    this.doFetch = cfg.fetchImpl ?? fetch
  }

  private headers (): Record<string, string> {
    return {
      authorization: `Bearer ${this.token}`,
      'content-type': 'application/json'
    }
  }

  async wrap (dataKey: Buffer, keyId: string): Promise<Buffer> {
    const res = await this.doFetch(`${this.url}/v1/keys/${encodeURIComponent(keyId)}/wrap`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ plaintext: dataKey.toString('base64') })
    })
    if (!res.ok) {
      throw new Error(`KMS wrap failed: ${res.status}`)
    }
    const body = (await res.json()) as WrapResponse
    return Buffer.from(body.wrappedKey, 'base64')
  }

  async unwrap (wrappedKey: Buffer, keyId: string): Promise<Buffer> {
    const res = await this.doFetch(`${this.url}/v1/keys/${encodeURIComponent(keyId)}/unwrap`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ wrappedKey: wrappedKey.toString('base64') })
    })
    if (!res.ok) {
      throw new Error(`KMS unwrap failed: ${res.status}`)
    }
    const body = (await res.json()) as UnwrapResponse
    return Buffer.from(body.key, 'base64')
  }
}
