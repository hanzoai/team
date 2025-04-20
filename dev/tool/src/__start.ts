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

import { addLocation } from '@hanzo/platform'
import { serverActivityId } from '@hanzo/server-activity'
import { serverAttachmentId } from '@hanzo/server-attachment'
import { serverCardId } from '@hanzo/server-card'
import { serverCalendarId } from '@hanzo/server-calendar'
import { serverChunterId } from '@hanzo/server-chunter'
import { serverCollaborationId } from '@hanzo/server-collaboration'
import { serverContactId } from '@hanzo/server-contact'
import { serverDriveId } from '@hanzo/server-drive'
import { serverDocumentId } from '@hanzo/server-document'
import { serverGmailId } from '@hanzo/server-gmail'
import { serverGuestId } from '@hanzo/server-guest'
import { serverHrId } from '@hanzo/server-hr'
import { serverInventoryId } from '@hanzo/server-inventory'
import { serverLeadId } from '@hanzo/server-lead'
import { serverNotificationId } from '@hanzo/server-notification'
import { serverRecruitId } from '@hanzo/server-recruit'
import { serverRequestId } from '@hanzo/server-request'
import { serverSettingId } from '@hanzo/server-setting'
import { serverTagsId } from '@hanzo/server-tags'
import { serverTaskId } from '@hanzo/server-task'
import { serverTelegramId } from '@hanzo/server-telegram'
import { serverTimeId } from '@hanzo/server-time'
import { serverTrackerId } from '@hanzo/server-tracker'
import { serverViewId } from '@hanzo/server-view'
import { serverAiBotId } from '@hanzo/server-ai-bot'

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
  const enabled = (process.env.MODEL_ENABLED ?? '*').split(',').map((it) => it.trim())
  const disabled = (process.env.MODEL_DISABLED ?? '').split(',').map((it) => it.trim())

  return { ...prepareToolsRaw(builder(enabled, disabled).getTxes()), version: getModelVersion(), migrateOperations }
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

devTool(prepareTools)
