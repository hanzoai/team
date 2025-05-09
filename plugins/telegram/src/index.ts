//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
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

import { ChannelItem } from '@hanzo/contact'
import { AttachedDoc, Class, Doc, Ref, Timestamp } from '@hanzo/core'
import { NotificationProvider, NotificationType } from '@hanzo/notification'
import type { IntlString, Metadata, Plugin } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import type { Handler, IntegrationType } from '@hanzo/setting'
import { TemplateField } from '@hanzo/templates'
import type { AnyComponent } from '@hanzo/ui'

/**
 * @public
 */
export interface BaseTelegramMessage extends Doc {
  content: string
  attachments?: number
}

/**
 * @public
 */
export interface TelegramMessage extends BaseTelegramMessage, ChannelItem {}

/**
 * @public
 */
export interface NewTelegramMessage extends BaseTelegramMessage, AttachedDoc {
  status: 'new' | 'sent'
}

/**
 * @public
 */
export interface SharedTelegramMessage extends BaseTelegramMessage {
  incoming: boolean
  sender: string
  sendOn: Timestamp
}

/**
 * @public
 */
export interface SharedTelegramMessages extends AttachedDoc {
  messages: SharedTelegramMessage[]
}

/**
 * @public
 */
export const telegramId = 'telegram' as Plugin

export default plugin(telegramId, {
  component: {
    Chat: '' as AnyComponent,
    Connect: '' as AnyComponent,
    Reconnect: '' as AnyComponent,
    IconTelegram: '' as AnyComponent,
    SharedMessages: '' as AnyComponent
  },
  integrationType: {
    Telegram: '' as Ref<IntegrationType>
  },
  handler: {
    DisconnectHandler: '' as Handler
  },
  ids: {
    NewMessageNotification: '' as Ref<NotificationType>
  },
  class: {
    Message: '' as Ref<Class<TelegramMessage>>,
    NewMessage: '' as Ref<Class<NewTelegramMessage>>,
    SharedMessage: '' as Ref<Class<SharedTelegramMessage>>,
    SharedMessages: '' as Ref<Class<SharedTelegramMessages>>
  },
  templateField: {
    CurrentEmployeeTelegram: '' as Ref<TemplateField>,
    IntegrationOwnerTG: '' as Ref<TemplateField>
  },
  metadata: {
    TelegramURL: '' as Metadata<string>,
    BotUrl: '' as Metadata<string>
  },
  providers: {
    TelegramNotificationProvider: '' as Ref<NotificationProvider>
  },
  string: {
    BotDescription: '' as IntlString,
    BotShortDescription: '' as IntlString,
    WelcomeMessage: '' as IntlString,
    TestMessage: '' as IntlString,
    ConnectMessage: '' as IntlString,
    StopMessage: '' as IntlString,
    StartBot: '' as IntlString,
    ConnectAccount: '' as IntlString,
    ShowCommandsDetails: '' as IntlString,
    TurnNotificationsOff: '' as IntlString,
    ConnectedDescriptionHtml: '' as IntlString,
    AccountAlreadyConnectedHtml: '' as IntlString,
    AccountConnectedHtml: '' as IntlString,
    AccountAlreadyConnected: '' as IntlString,
    InvalidCode: '' as IntlString,
    SomethingWentWrong: '' as IntlString,
    Configure: '' as IntlString,
    ConnectTelegramBot: '' as IntlString,
    DisconnectMessage: '' as IntlString,
    SyncAllChannels: '' as IntlString,
    SyncStarredChannels: '' as IntlString,
    TelegramIntegrationDesc: '' as IntlString,
    TelegramIntegrationDesc2: '' as IntlString,
    ToSetupNotification: '' as IntlString,
    TelegramNotificationPath: '' as IntlString
  }
})
