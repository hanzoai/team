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

import { type Class, type Doc, type Domain, type Ref, type Space } from '@hanzoteam/core'
import { type Builder, Index, IndexKind, Model, Prop, TypeBoolean, TypeRef, TypeString, UX } from '@hanzoteam/model'
import core, { TAttachedDoc } from '@hanzoteam/model-core'
import setting from '@hanzoteam/setting'
import { slackIntegrationKind, type SlackChannelMapping } from '@hanzoteam/slack'

import slack from './plugin'

export { slackId } from '@hanzoteam/slack'
export { default } from './plugin'

export const DOMAIN_SLACK = 'slack' as Domain

@Model(slack.class.SlackChannelMapping, core.class.AttachedDoc, DOMAIN_SLACK)
@UX(slack.string.MapChannel)
export class TSlackChannelMapping extends TAttachedDoc implements SlackChannelMapping {
  @Prop(TypeRef(core.class.Space), slack.string.SlackWorkspace)
  @Index(IndexKind.Indexed)
    hulyChannel!: Ref<Space>

  @Prop(TypeRef(core.class.Class), slack.string.SlackWorkspace)
    hulyChannelClass!: Ref<Class<Doc>>

  @Prop(TypeString(), slack.string.MapChannel)
  @Index(IndexKind.Indexed)
    slackChannelId!: string

  @Prop(TypeString(), slack.string.MapChannel)
    slackChannelName!: string

  @Prop(TypeString(), slack.string.SlackWorkspace)
  @Index(IndexKind.Indexed)
    slackTeamId!: string

  @Prop(TypeBoolean(), slack.string.Slack)
    enabled!: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TSlackChannelMapping)

  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: slack.string.Slack,
      description: slack.string.SlackIntegrationDesc,
      icon: slack.icon.Slack,
      allowMultiple: true,
      createComponent: slack.component.Connect,
      onDisconnect: slack.handler.DisconnectHandler,
      onDisconnectAll: slack.handler.DisconnectAllHandler,
      configureComponent: slack.component.Configure,
      stateComponent: slack.component.IntegrationState,
      kind: slackIntegrationKind
    },
    slack.integrationType.Slack
  )
}
