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

import type { AccountClient } from '@hanzoteam/account-client'
import type { PersonId, WorkspaceUuid } from '@hanzoteam/core'
import { type KeyWrapper, decodeEnvelope, encodeEnvelope, open, seal } from '@hanzoteam/kms-client'
import { slackIntegrationKind, slackTokenSecretKey } from '@hanzoteam/slack'

/** The Slack OAuth material we persist for a connected workspace. */
export interface SlackToken {
  accessToken: string // xoxb-... bot token
  botUserId: string
  teamId: string
  teamName: string
  scope: string
  appId: string
}

/**
 * Persists Slack OAuth tokens with defense-in-depth:
 *   plaintext token -> envelope-encrypt (AES-256-GCM, KMS-wrapped data key)
 *                   -> store ciphertext in the account-service IntegrationSecret.
 *
 * The IntegrationSecret store never sees plaintext; the KMS master key never
 * leaves KMS. AAD binds the ciphertext to (kind|workspace|team) so a secret
 * cannot be silently replayed under a different scope.
 */
export class SlackTokenStorage {
  constructor (
    private readonly accountClient: AccountClient,
    private readonly wrapper: KeyWrapper,
    private readonly workspace: WorkspaceUuid
  ) {}

  private aad (teamId: string): string {
    return `${slackIntegrationKind}|${this.workspace}|${teamId}`
  }

  async save (socialId: PersonId, token: SlackToken): Promise<void> {
    const env = await seal(this.wrapper, JSON.stringify(token), this.aad(token.teamId))
    const secret = encodeEnvelope(env)
    const existing = await this.accountClient.getIntegrationSecret({
      key: slackTokenSecretKey,
      kind: slackIntegrationKind,
      socialId,
      workspaceUuid: this.workspace
    })
    const record = { key: slackTokenSecretKey, kind: slackIntegrationKind, socialId, secret, workspaceUuid: this.workspace }
    if (existing !== null) {
      await this.accountClient.updateIntegrationSecret(record)
    } else {
      await this.accountClient.addIntegrationSecret(record)
    }
  }

  async get (socialId: PersonId, teamId: string): Promise<SlackToken | null> {
    const secret = await this.accountClient.getIntegrationSecret({
      key: slackTokenSecretKey,
      kind: slackIntegrationKind,
      socialId,
      workspaceUuid: this.workspace
    })
    if (secret?.secret === undefined) return null
    const env = decodeEnvelope(secret.secret)
    const plaintext = await open(this.wrapper, env, this.aad(teamId))
    return JSON.parse(plaintext) as SlackToken
  }

  async delete (socialId: PersonId): Promise<void> {
    await this.accountClient.deleteIntegrationSecret({
      key: slackTokenSecretKey,
      kind: slackIntegrationKind,
      socialId,
      workspaceUuid: this.workspace
    })
  }
}
