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

import { type Ref } from '@hanzo/core'
import type { IntlString } from '@hanzo/platform'
import { mergeIds } from '@hanzo/platform'
import { requestId } from '@hanzo/request'
import request from '@hanzo/request-resources/src/plugin'
import { type AnyComponent } from '@hanzo/ui/src/types'
import type { NotificationGroup, NotificationType } from '@hanzo/notification'

export default mergeIds(requestId, request, {
  component: {
    EditRequest: '' as AnyComponent,
    NotificationRequestView: '' as AnyComponent
  },
  ids: {
    RequestNotificationGroup: '' as Ref<NotificationGroup>,
    CreateRequestNotification: '' as Ref<NotificationType>
  },
  string: {
    Status: '' as IntlString,
    Requested: '' as IntlString
  }
})
