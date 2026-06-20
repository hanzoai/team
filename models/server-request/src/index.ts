//
// Copyright © 2022 Hanzo AI Inc.
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

import { type Builder } from '@hanzoteam/model'

import core from '@hanzoteam/core'
import serverCore from '@hanzoteam/server-core'
import serverRequest from '@hanzoteam/server-request'
import serverNotification from '@hanzoteam/server-notification'
import request from '@hanzoteam/model-request'
import notification from '@hanzoteam/notification'

export { serverRequestId } from '@hanzoteam/server-request'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverRequest.trigger.OnRequest,
    txMatch: {
      objectClass: request.class.Request
    }
  })

  builder.mixin(request.class.Request, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverRequest.function.RequestTextPresenter
  })

  builder.mixin(
    request.ids.CreateRequestNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverRequest.function.SendRequestMatch
    }
  )

  builder.mixin(
    request.ids.RemoveRequestNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverRequest.function.RemoveRequestMatch
    }
  )
}
