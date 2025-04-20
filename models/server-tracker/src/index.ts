//
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact from '@hanzo/contact'
import core from '@hanzo/core'
import { type Builder } from '@hanzo/model'
import tracker from '@hanzo/model-tracker'
import notification from '@hanzo/notification'
import serverCore from '@hanzo/server-core'
import serverNotification from '@hanzo/server-notification'
import serverTracker from '@hanzo/server-tracker'
import serverView from '@hanzo/server-view'

export { serverTrackerId } from '@hanzo/server-tracker'

export function createModel (builder: Builder): void {
  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverTracker.function.IssueHTMLPresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverTracker.function.IssueTextPresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverNotification.mixin.NotificationPresenter, {
    presenter: serverTracker.function.IssueNotificationContentProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverView.mixin.ServerLinkIdProvider, {
    encode: serverTracker.function.IssueLinkIdProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: tracker.component.IssueSearchIcon,
      fields: [['status'], ['space']]
    },
    shortTitle: [['identifier']],
    title: [['title']]
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnEmployeeCreate,
    txMatch: {
      objectClass: contact.class.Person,
      _class: core.class.TxMixin,
      mixin: contact.mixin.Employee,
      'attributes.active': true
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnIssueUpdate,
    txMatch: {
      objectClass: { $in: [tracker.class.Issue, tracker.class.TimeSpendReport] }
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnComponentRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: tracker.class.Component
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTracker.trigger.OnProjectRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: tracker.class.Project
    }
  })

  builder.mixin(
    tracker.ids.AssigneeNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverNotification.function.IsUserEmployeeInFieldValueTypeMatch
    }
  )
}
