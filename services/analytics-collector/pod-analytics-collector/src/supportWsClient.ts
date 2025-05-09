//
// Copyright © 2024 Hardcore Engineering Inc.
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

import analyticsCollector, { AnalyticEvent, OnboardingChannel } from '@hanzo/analytics-collector'
import chunter, { Channel, ChatMessage } from '@hanzo/chunter'
import { getPrimarySocialId, type Person } from '@hanzo/contact'
import core, {
  AccountUuid,
  Doc,
  generateId,
  PersonId,
  RateLimiter,
  Ref,
  systemAccountUuid,
  Tx,
  TxOperations,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceInfoWithStatus,
  WorkspaceUuid
} from '@hanzo/core'
import {
  createGeneralOnboardingChannel,
  getOrCreateOnboardingChannel
} from '@hanzo/server-analytics-collector-resources'
import { generateToken } from '@hanzo/server-token'

import { getClient as getAccountClient } from '@hanzo/account-client'
import { Collection } from 'mongodb'
import { eventToMarkup, getOnboardingMessage } from './format'
import { OnboardingMessage } from './types'
import config from './config'
import { WorkspaceClient } from './workspaceClient'

export class SupportWsClient extends WorkspaceClient {
  channelIdByKey = new Map<string, Ref<OnboardingChannel>>()
  personIdByPerson = new Map<Ref<Person>, PersonId>()

  rate = new RateLimiter(1)

  generalChannel: Channel | undefined = undefined

  async initClient (): Promise<TxOperations> {
    const client = await super.initClient()

    this.generalChannel = await createGeneralOnboardingChannel(this.ctx, client)
    if (this.client != null) {
      this.client.notify = (...txes) => {
        this.handleTx(client, ...txes)
      }
    }

    return client
  }

  private handleTx (client: TxOperations, ...txes: Tx[]): void {
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxUpdateDoc: {
          this.txUpdateDoc(client, tx as TxUpdateDoc<Doc>)
          break
        }
      }
    }
  }

  private txUpdateDoc (client: TxOperations, tx: TxUpdateDoc<Doc>): void {
    const hierarchy = client.getHierarchy()

    if (
      hierarchy.isDerived(tx.objectClass, chunter.class.Channel) &&
      tx.objectId === analyticsCollector.space.GeneralOnboardingChannel
    ) {
      if (this.generalChannel == null) {
        return
      }
      this.generalChannel = TxProcessor.updateDoc2Doc(this.generalChannel, tx as TxUpdateDoc<Channel>)
    }
  }

  private async getOrCreateOnboardingChannel (
    client: TxOperations,
    workspace: WorkspaceUuid,
    account: AccountUuid,
    person: Person
  ): Promise<{
      channelId: Ref<OnboardingChannel> | undefined
      isCreated: boolean
      workspace?: WorkspaceInfoWithStatus
    }> {
    const key = `${account}-${workspace}`

    if (this.channelIdByKey.has(key)) {
      return {
        channelId: this.channelIdByKey.get(key),
        isCreated: false
      }
    }

    const token = generateToken(systemAccountUuid, workspace, { service: 'analytics-collector' })
    const wsInfo = await getAccountClient(config.AccountsUrl, token).getWorkspaceInfo()

    if (wsInfo === undefined) {
      this.ctx.error('Failed to get workspace info', { workspace })
      return {
        channelId: undefined,
        isCreated: false
      }
    }

    const [channel, isCreated] = await getOrCreateOnboardingChannel(
      this.ctx,
      client,
      account,
      {
        workspaceId: workspace,
        workspaceName: wsInfo?.name ?? '',
        workspaceUrl: wsInfo?.url ?? ''
      },
      person
    )

    if (channel !== undefined) {
      this.channelIdByKey.set(key, channel)
    }

    return {
      channelId: channel,
      isCreated,
      workspace: wsInfo
    }
  }

  async getPersonId (person: Ref<Person>): Promise<PersonId | undefined> {
    const cachedPersonId = this.personIdByPerson.get(person)
    const personId = cachedPersonId ?? (await getPrimarySocialId(await this.opClient, person))

    if (personId === undefined) {
      console.error('Person id not found for person', person)
      return
    }

    if (cachedPersonId === undefined) {
      this.personIdByPerson.set(person, personId)
    }

    return personId
  }

  async processEvents (
    events: AnalyticEvent[],
    workspace: WorkspaceUuid,
    person: Person,
    onboardingMessages: Collection<OnboardingMessage>
  ): Promise<void> {
    const client = await this.opClient
    const op = client.apply(undefined, 'processEvents')
    const wsString = workspace
    const account = person.personUuid as AccountUuid

    if (account === undefined) {
      return
    }

    const {
      channelId,
      isCreated,
      workspace: workspaceInfo
    } = await this.getOrCreateOnboardingChannel(op, wsString, account, person)

    if (channelId === undefined) {
      return
    }

    if (isCreated) {
      const messageId = generateId<ChatMessage>()
      await op.addCollection(
        chunter.class.ChatMessage,
        analyticsCollector.space.GeneralOnboardingChannel,
        analyticsCollector.space.GeneralOnboardingChannel,
        chunter.class.Channel,
        'messages',
        { message: getOnboardingMessage(account, workspaceInfo?.url ?? wsString, person.name) },
        messageId
      )

      await onboardingMessages.insertOne({ messageId, channelId })
    }

    const hierarchy = client.getHierarchy()

    for (const event of events) {
      const markup = await eventToMarkup(event, hierarchy, client)

      if (markup === undefined) {
        continue
      }

      await op.addCollection(
        chunter.class.ChatMessage,
        channelId,
        channelId,
        chunter.class.Channel,
        'messages',
        { message: markup },
        undefined,
        event.timestamp
      )
    }

    await op.commit()
  }

  async pushEvents (
    events: AnalyticEvent[],
    workspace: WorkspaceUuid,
    person: Person,
    onboardingMessages: Collection<OnboardingMessage>
  ): Promise<void> {
    const channelKey = `${person._id}-${workspace}`

    if (this.channelIdByKey.has(channelKey)) {
      await this.processEvents(events, workspace, person, onboardingMessages)
    } else {
      // If we dont have OnboardingChannel we should call it sync to prevent multiple channels for the same user and workspace
      await this.rate.add(async () => {
        await this.processEvents(events, workspace, person, onboardingMessages)
      })
    }
  }
}
