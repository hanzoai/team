//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import { type Builder, Mixin } from '@hanzo/model'

import contact from '@hanzo/contact'
import core from '@hanzo/core'
import { TClass } from '@hanzo/model-core'
import { TNotificationType } from '@hanzo/model-notification'
import notification from '@hanzo/notification'
import { type Resource } from '@hanzo/platform'
import serverCore from '@hanzo/server-core'
import serverNotification, {
  type HTMLPresenter,
  type NotificationContentProvider,
  type NotificationPresenter,
  type Presenter,
  type TextPresenter,
  type TypeMatch,
  type TypeMatchFunc
} from '@hanzo/server-notification'

export { serverNotificationId } from '@hanzo/server-notification'

@Mixin(serverNotification.mixin.HTMLPresenter, core.class.Class)
export class THTMLPresenter extends TClass implements HTMLPresenter {
  presenter!: Resource<Presenter>
}

@Mixin(serverNotification.mixin.TextPresenter, core.class.Class)
export class TTextPresenter extends TClass implements TextPresenter {
  presenter!: Resource<Presenter>
}

@Mixin(serverNotification.mixin.NotificationPresenter, core.class.Class)
export class TNotificationPresenter extends TClass implements NotificationPresenter {
  presenter!: Resource<NotificationContentProvider>
}

@Mixin(serverNotification.mixin.TypeMatch, notification.class.NotificationType)
export class TTypeMatch extends TNotificationType implements TypeMatch {
  func!: TypeMatchFunc
}

export function createModel (builder: Builder): void {
  builder.createModel(THTMLPresenter, TTextPresenter, TTypeMatch, TNotificationPresenter)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverNotification.trigger.OnAttributeCreate,
    txMatch: {
      objectClass: core.class.Attribute,
      _class: core.class.TxCreateDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverNotification.trigger.OnAttributeUpdate,
    txMatch: {
      objectClass: core.class.Attribute,
      _class: core.class.TxUpdateDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverNotification.trigger.OnDocRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverNotification.trigger.OnEmployeeDeactivate,
    isAsync: true,
    txMatch: {
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverNotification.trigger.PushNotificationsHandler,
    isAsync: true,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: notification.class.InboxNotification
    }
  })
}
