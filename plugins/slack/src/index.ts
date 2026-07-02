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

import type { AttachedDoc, Class, Doc, IntegrationKind, Ref, Space } from '@hanzoteam/core'
import type { Asset, IntlString, Metadata, Plugin } from '@hanzoteam/platform'
import { plugin } from '@hanzoteam/platform'
import type { Handler, IntegrationType } from '@hanzoteam/setting'
import type { AnyComponent } from '@hanzoteam/ui'

export * from './verify'
export * from './events'

/**
 * Account-service integration kind for a connected Slack workspace.
 * @public
 */
export const slackIntegrationKind = 'slack' as IntegrationKind

/**
 * Key under which the (envelope-encrypted) Slack OAuth token is stored in the
 * account-service IntegrationSecret store. The stored value is ciphertext — see
 * {@link @hanzoteam/kms-client}. Never the raw token.
 * @public
 */
export const slackTokenSecretKey = 'oauth'

/**
 * Maps a Hanzo chunter Channel to a Slack channel for bidirectional relay.
 * One doc per mapping, stored in the workspace.
 * @public
 */
export interface SlackChannelMapping extends AttachedDoc {
  // Hanzo side
  hulyChannel: Ref<Space>
  hulyChannelClass: Ref<Class<Doc>>
  // Slack side
  slackChannelId: string
  slackChannelName: string
  slackTeamId: string
  enabled: boolean
}

/**
 * The Slack chunter SocialChannelProvider marks messages that originated from,
 * or are mirrored to, Slack so the UI can badge their source.
 * @public
 */
export const slackId = 'slack' as Plugin

export default plugin(slackId, {
  integrationType: {
    Slack: '' as Ref<IntegrationType>
  },
  class: {
    SlackChannelMapping: '' as Ref<Class<SlackChannelMapping>>
  },
  component: {
    Connect: '' as AnyComponent,
    Configure: '' as AnyComponent,
    IntegrationState: '' as AnyComponent
  },
  handler: {
    DisconnectHandler: '' as Handler,
    DisconnectAllHandler: '' as Handler
  },
  icon: {
    Slack: '' as Asset
  },
  string: {
    Slack: '' as IntlString,
    ConnectSlack: '' as IntlString,
    SlackWorkspace: '' as IntlString,
    MapChannel: '' as IntlString,
    SlackIntegrationDesc: '' as IntlString
  },
  metadata: {
    SlackServiceURL: '' as Metadata<string>
  }
})
