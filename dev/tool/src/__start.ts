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

import { prepareTools as prepareToolsRaw } from '@hanzoteam/server-tool'

import { type Data, type Tx, type Version } from '@hanzoteam/core'
import { type MigrateOperation } from '@hanzoteam/model'
import builder, { getModelVersion, migrateOperations } from '@hanzoteam/model-all'
import { devTool } from '.'

import { addLocation } from '@hanzoteam/platform'
import { serverActivityId } from '@hanzoteam/server-activity'
import { serverAiBotId } from '@hanzoteam/server-ai-bot'
import { serverAttachmentId } from '@hanzoteam/server-attachment'
import { serverCalendarId } from '@hanzoteam/server-calendar'
import { serverCardId } from '@hanzoteam/server-card'
import { serverChunterId } from '@hanzoteam/server-chunter'
import { serverCollaborationId } from '@hanzoteam/server-collaboration'
import { serverContactId } from '@hanzoteam/server-contact'
import { serverDocumentId } from '@hanzoteam/server-document'
import { serverDriveId } from '@hanzoteam/server-drive'
import { serverGmailId } from '@hanzoteam/server-gmail'
import { serverGuestId } from '@hanzoteam/server-guest'
import { serverHrId } from '@hanzoteam/server-hr'
import { serverInventoryId } from '@hanzoteam/server-inventory'
import { serverLeadId } from '@hanzoteam/server-lead'
import { serverNotificationId } from '@hanzoteam/server-notification'
import { serverRecruitId } from '@hanzoteam/server-recruit'
import { serverRequestId } from '@hanzoteam/server-request'
import { serverSettingId } from '@hanzoteam/server-setting'
import { serverTagsId } from '@hanzoteam/server-tags'
import { serverTaskId } from '@hanzoteam/server-task'
import { serverTelegramId } from '@hanzoteam/server-telegram'
import { serverTimeId } from '@hanzoteam/server-time'
import { serverTrackerId } from '@hanzoteam/server-tracker'
import { serverViewId } from '@hanzoteam/server-view'

addLocation(serverActivityId, () => import('@hanzoteam/server-activity-resources'))
addLocation(serverAttachmentId, () => import('@hanzoteam/server-attachment-resources'))
addLocation(serverCollaborationId, () => import('@hanzoteam/server-collaboration-resources'))
addLocation(serverContactId, () => import('@hanzoteam/server-contact-resources'))
addLocation(serverNotificationId, () => import('@hanzoteam/server-notification-resources'))
addLocation(serverChunterId, () => import('@hanzoteam/server-chunter-resources'))
addLocation(serverInventoryId, () => import('@hanzoteam/server-inventory-resources'))
addLocation(serverLeadId, () => import('@hanzoteam/server-lead-resources'))
addLocation(serverRecruitId, () => import('@hanzoteam/server-recruit-resources'))
addLocation(serverSettingId, () => import('@hanzoteam/server-setting-resources'))
addLocation(serverTaskId, () => import('@hanzoteam/server-task-resources'))
addLocation(serverTrackerId, () => import('@hanzoteam/server-tracker-resources'))
addLocation(serverTagsId, () => import('@hanzoteam/server-tags-resources'))
addLocation(serverCardId, () => import('@hanzoteam/server-card-resources'))
addLocation(serverCalendarId, () => import('@hanzoteam/server-calendar-resources'))
addLocation(serverGmailId, () => import('@hanzoteam/server-gmail-resources'))
addLocation(serverTelegramId, () => import('@hanzoteam/server-telegram-resources'))
addLocation(serverHrId, () => import('@hanzoteam/server-hr-resources'))
addLocation(serverRequestId, () => import('@hanzoteam/server-request-resources'))
addLocation(serverViewId, () => import('@hanzoteam/server-view-resources'))
addLocation(serverDocumentId, () => import('@hanzoteam/server-document-resources'))
addLocation(serverTimeId, () => import('@hanzoteam/server-time-resources'))
addLocation(serverGuestId, () => import('@hanzoteam/server-guest-resources'))
addLocation(serverDriveId, () => import('@hanzoteam/server-drive-resources'))
addLocation(serverAiBotId, () => import('@hanzoteam/server-ai-bot-resources'))

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
