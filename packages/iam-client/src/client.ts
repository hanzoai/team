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

import { mapIamUser } from './mapping'
import type { IamEnvelope, IamUser, ServiceAccount } from './types'

export interface IamConfig {
  /** Base URL, e.g. https://hanzo.id */
  url: string
  /** Bearer token for the IAM machine identity (from KMS, never hardcoded). */
  token: string
  fetchImpl?: typeof fetch
}

/** Read-only IAM client for discovering agent service-accounts to sync as bot members. */
export class IamClient {
  private readonly url: string
  private readonly token: string
  private readonly doFetch: typeof fetch

  constructor (cfg: IamConfig) {
    this.url = cfg.url.replace(/\/+$/, '')
    this.token = cfg.token
    this.doFetch = cfg.fetchImpl ?? fetch
  }

  /** GET /v1/iam/service-accounts?organization=<org> */
  async listServiceAccounts (organization: string): Promise<ServiceAccount[]> {
    const res = await this.doFetch(
      `${this.url}/v1/iam/service-accounts?organization=${encodeURIComponent(organization)}`,
      { headers: { authorization: `Bearer ${this.token}` } }
    )
    if (!res.ok) {
      throw new Error(`IAM listServiceAccounts failed: ${res.status}`)
    }
    // IAM speaks the Casdoor envelope: { status, msg, data: IamUser[] }. A 200
    // with status:"error" (e.g. unauthorized) is still an error to us.
    const body = (await res.json()) as IamEnvelope<IamUser[] | null>
    if (body.status !== 'ok') {
      throw new Error(`IAM listServiceAccounts error: ${body.msg ?? 'unknown'}`)
    }
    return (body.data ?? []).map(mapIamUser)
  }
}
