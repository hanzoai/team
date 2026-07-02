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

import {
  generateId,
  type MeasureContext,
  type PersonId,
  type Ref,
  TxFactory,
  type TxOperations
} from '@hanzoteam/core'
import chunter, { type ChatMessage } from '@hanzoteam/chunter'
import { markdownToMarkup } from '@hanzoteam/text-markdown'
import { jsonToMarkup } from '@hanzoteam/text'
import slack, { type SlackChannelMapping } from '@hanzoteam/slack'

/**
 * Relays a signature-verified, routed Slack message into the mapped Hanzo
 * chunter channel. Posts as the bot's social id so authorship is attributed to
 * the bot member. Idempotency (Slack retries) is enforced by the caller's
 * seen-set on the Slack event_id.
 */
export class SlackRelay {
  private readonly txFactory: TxFactory

  constructor (
    private readonly ctx: MeasureContext,
    private readonly client: TxOperations,
    private readonly botSocialId: PersonId
  ) {
    this.txFactory = new TxFactory(botSocialId)
  }

  private async findMapping (teamId: string, slackChannelId: string): Promise<SlackChannelMapping | undefined> {
    return this.client.findOne(slack.class.SlackChannelMapping, {
      slackTeamId: teamId,
      slackChannelId,
      enabled: true
    })
  }

  /**
   * Post the Slack text into the mapped Hanzo channel. Returns the new message
   * id, or undefined if the Slack channel isn't mapped (nothing to do).
   */
  async relayIncoming (params: {
    teamId: string
    slackChannelId: string
    slackUserId: string
    text: string
  }): Promise<Ref<ChatMessage> | undefined> {
    const mapping = await this.findMapping(params.teamId, params.slackChannelId)
    if (mapping === undefined) {
      return undefined
    }

    const message = jsonToMarkup(markdownToMarkup(params.text, { refUrl: '', imageUrl: '' }))
    const messageId = generateId<ChatMessage>()

    const tx = this.txFactory.createTxCollectionCUD(
      mapping.hulyChannelClass,
      mapping.hulyChannel,
      mapping.hulyChannel,
      'messages',
      this.txFactory.createTxCreateDoc(
        chunter.class.ChatMessage,
        mapping.hulyChannel,
        {
          message,
          attachedTo: mapping.hulyChannel,
          attachedToClass: mapping.hulyChannelClass,
          collection: 'messages'
        },
        messageId
      )
    )

    await this.client.tx(tx)
    this.ctx.info('relayed slack -> huly', {
      team: params.teamId,
      slackChannel: params.slackChannelId,
      hulyChannel: mapping.hulyChannel
    })
    return messageId
  }
}
