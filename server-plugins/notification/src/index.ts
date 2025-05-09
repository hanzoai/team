//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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

import { Employee, Person, PersonSpace } from '@hanzo/contact'
import { PersonId, Class, Doc, Mixin, Ref, Tx, TxCUD, AccountUuid } from '@hanzo/core'
import { NotificationContent, NotificationType } from '@hanzo/notification'
import { Metadata, Plugin, Resource, plugin } from '@hanzo/platform'
import type { TriggerControl, TriggerFunc } from '@hanzo/server-core'

/**
 * @public
 */
export const serverNotificationId = 'server-notification' as Plugin
export { DOMAIN_USER_NOTIFY, DOMAIN_NOTIFICATION, DOMAIN_DOC_NOTIFY } from '@hanzo/notification'

/**
 * @public
 */
export type Presenter<T extends Doc = any> = (doc: T, control: TriggerControl) => Promise<string>

/**
 * @public
 */
export interface HTMLPresenter<T extends Doc = any> extends Class<T> {
  presenter: Resource<Presenter<T>>
}

/**
 * @public
 */
export interface TextPresenter<T extends Doc = any> extends Class<T> {
  presenter: Resource<Presenter<T>>
}

/**
 * @public
 */
export type TypeMatchFunc = Resource<
(
  tx: Tx,
  doc: Doc,
  person: Ref<Person>,
  socialIds: PersonId[],
  type: NotificationType,
  control: TriggerControl
) => boolean | Promise<boolean>
>

/**
 * @public
 */
export interface TypeMatch extends NotificationType {
  func: TypeMatchFunc
}

/**
 * @public
 */
export type NotificationContentProvider = (
  doc: Doc,
  tx: TxCUD<Doc>,
  person: Ref<Person>,
  control: TriggerControl
) => Promise<NotificationContent>

/**
 * @public
 */
export interface NotificationPresenter extends Class<Doc> {
  presenter: Resource<NotificationContentProvider>
}

export interface ReceiverInfo {
  account: AccountUuid
  employee: Ref<Employee>
  socialIds: PersonId[]
  space: Ref<PersonSpace>
}

export interface SenderInfo {
  socialId: PersonId
  person?: Person
}

export const NOTIFICATION_BODY_SIZE = 50
export const PUSH_NOTIFICATION_TITLE_SIZE = 80

/**
 * @public
 */
export default plugin(serverNotificationId, {
  metadata: {
    MailUrl: '' as Metadata<string>,
    MailAuthToken: '' as Metadata<string>,
    WebPushUrl: '' as Metadata<string>,
    InboxOnlyNotifications: '' as Metadata<boolean>
  },
  mixin: {
    HTMLPresenter: '' as Ref<Mixin<HTMLPresenter>>,
    TextPresenter: '' as Ref<Mixin<TextPresenter>>,
    TypeMatch: '' as Ref<Mixin<TypeMatch>>,
    NotificationPresenter: '' as Ref<Mixin<NotificationPresenter>>
  },
  trigger: {
    OnAttributeCreate: '' as Resource<TriggerFunc>,
    OnAttributeUpdate: '' as Resource<TriggerFunc>,
    OnReactionChanged: '' as Resource<TriggerFunc>,
    OnDocRemove: '' as Resource<TriggerFunc>,
    OnEmployeeDeactivate: '' as Resource<TriggerFunc>,
    PushNotificationsHandler: '' as Resource<TriggerFunc>
  },
  function: {
    IsUserEmployeeInFieldValueTypeMatch: '' as TypeMatchFunc
  }
})
