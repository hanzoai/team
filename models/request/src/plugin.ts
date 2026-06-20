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

import { type Ref } from '@hanzoteam/core'
import type { IntlString } from '@hanzoteam/platform'
import { mergeIds } from '@hanzoteam/platform'
import { requestId } from '@hanzoteam/request'
import request from '@hanzoteam/request-resources/src/plugin'
import { type AnyComponent } from '@hanzoteam/ui/src/types'
import type { NotificationGroup, NotificationType } from '@hanzoteam/notification'

export default mergeIds(requestId, request, {
  component: {
    EditRequest: '' as AnyComponent,
    NotificationRequestView: '' as AnyComponent,
    RequestedChangedNotification: '' as AnyComponent
  },
  ids: {
    RequestNotificationGroup: '' as Ref<NotificationGroup>,
    CreateRequestNotification: '' as Ref<NotificationType>,
    RemoveRequestNotification: '' as Ref<NotificationType>
  },
  string: {
    Status: '' as IntlString,
    Requested: '' as IntlString,
    NewRequest: '' as IntlString,
    CancelRequest: '' as IntlString
  }
})
