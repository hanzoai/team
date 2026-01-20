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

import { prepareTools as prepareToolsRaw } from '@hanzo/server-tool'

import { type Data, type Tx, type Version } from '@hanzo/core'
import { type MigrateOperation } from '@hanzo/model'
import builder, { getModelVersion, migrateOperations } from '@hanzo/model-all'
import { devTool } from '.'

import { addLocation } from '@hcengineering/platform'
import { serverActivityId } from '@hcengineering/server-activity'
import { serverAiBotId } from '@hcengineering/server-ai-bot'
import { serverAttachmentId } from '@hcengineering/server-attachment'
import { serverCalendarId } from '@hcengineering/server-calendar'
import { serverCardId } from '@hcengineering/server-card'
import { serverChunterId } from '@hcengineering/server-chunter'
import { serverCollaborationId } from '@hcengineering/server-collaboration'
import { serverContactId } from '@hcengineering/server-contact'
import { serverDocumentId } from '@hcengineering/server-document'
import { serverDriveId } from '@hcengineering/server-drive'
import { serverGmailId } from '@hcengineering/server-gmail'
import { serverGuestId } from '@hcengineering/server-guest'
import { serverHrId } from '@hcengineering/server-hr'
import { serverInventoryId } from '@hcengineering/server-inventory'
import { serverLeadId } from '@hcengineering/server-lead'
import { serverNotificationId } from '@hcengineering/server-notification'
import { serverRecruitId } from '@hcengineering/server-recruit'
import { serverRequestId } from '@hcengineering/server-request'
import { serverSettingId } from '@hcengineering/server-setting'
import { serverTagsId } from '@hcengineering/server-tags'
import { serverTaskId } from '@hcengineering/server-task'
import { serverTelegramId } from '@hcengineering/server-telegram'
import { serverTimeId } from '@hcengineering/server-time'
import { serverTrackerId } from '@hcengineering/server-tracker'
import { serverViewId } from '@hcengineering/server-view'

addLocation(serverActivityId, () => import('@hanzo/server-activity-resources'))
addLocation(serverAttachmentId, () => import('@hanzo/server-attachment-resources'))
addLocation(serverCollaborationId, () => import('@hanzo/server-collaboration-resources'))
addLocation(serverContactId, () => import('@hanzo/server-contact-resources'))
addLocation(serverNotificationId, () => import('@hanzo/server-notification-resources'))
addLocation(serverChunterId, () => import('@hanzo/server-chunter-resources'))
addLocation(serverInventoryId, () => import('@hanzo/server-inventory-resources'))
addLocation(serverLeadId, () => import('@hanzo/server-lead-resources'))
addLocation(serverRecruitId, () => import('@hanzo/server-recruit-resources'))
addLocation(serverSettingId, () => import('@hanzo/server-setting-resources'))
addLocation(serverTaskId, () => import('@hanzo/server-task-resources'))
addLocation(serverTrackerId, () => import('@hanzo/server-tracker-resources'))
addLocation(serverTagsId, () => import('@hanzo/server-tags-resources'))
addLocation(serverCardId, () => import('@hanzo/server-card-resources'))
addLocation(serverCalendarId, () => import('@hanzo/server-calendar-resources'))
addLocation(serverGmailId, () => import('@hanzo/server-gmail-resources'))
addLocation(serverTelegramId, () => import('@hanzo/server-telegram-resources'))
addLocation(serverHrId, () => import('@hanzo/server-hr-resources'))
addLocation(serverRequestId, () => import('@hanzo/server-request-resources'))
addLocation(serverViewId, () => import('@hanzo/server-view-resources'))
addLocation(serverDocumentId, () => import('@hanzo/server-document-resources'))
addLocation(serverTimeId, () => import('@hanzo/server-time-resources'))
addLocation(serverGuestId, () => import('@hanzo/server-guest-resources'))
addLocation(serverDriveId, () => import('@hanzo/server-drive-resources'))
addLocation(serverAiBotId, () => import('@hanzo/server-ai-bot-resources'))

function prepareTools (): {
  dbUrl: string
  txes: Tx[]
  version: Data<Version>
  migrateOperations: [string, MigrateOperation][]
} {
  return { ...prepareToolsRaw(builder().getTxes()), version: getModelVersion(), migrateOperations }
}

export function getMongoDBUrl (): string {
  const url = process.env.MONGO_URL
  if (url === undefined) {
    console.error('please provide mongo DB URL')
    process.exit(1)
  }
  return url
}

export function getAccountDBUrl (): string {
  const url = process.env.ACCOUNT_DB_URL
  if (url === undefined) {
    console.error('please provide mongo ACCOUNT_DB_URL')
    process.exit(1)
  }
  return url
}

export function getKvsUrl (): string {
  const url = process.env.KVS_URL
  if (url === undefined) {
    console.error('please provide KVS_URL')
    process.exit(1)
  }
  return url
}

devTool(prepareTools)
