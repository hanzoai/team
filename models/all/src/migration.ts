//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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

// Import migrate operations.
import { type MigrateOperation } from '@hanzoteam/model'
import { activityOperation } from '@hanzoteam/model-activity'
import { aiBotId, aiBotOperation } from '@hanzoteam/model-ai-bot'
import { analyticsCollectorOperation } from '@hanzoteam/model-analytics-collector'
import { attachmentOperation } from '@hanzoteam/model-attachment'
import { bitrixOperation } from '@hanzoteam/model-bitrix'
import { boardOperation } from '@hanzoteam/model-board'
import { calendarOperation } from '@hanzoteam/model-calendar'
import { cardOperation } from '@hanzoteam/model-card'
import { chatId, chatOperation } from '@hanzoteam/model-chat'
import { chunterOperation } from '@hanzoteam/model-chunter'
import { communicationId, communicationOperation } from '@hanzoteam/model-communication'
import { contactOperation } from '@hanzoteam/model-contact'
import { documentsOperation } from '@hanzoteam/model-controlled-documents'
import { coreOperation } from '@hanzoteam/model-core'
import { documentOperation } from '@hanzoteam/model-document'
import { driveOperation } from '@hanzoteam/model-drive'
import { githubOperation, githubOperationPreTime } from '@hanzoteam/model-github'
import { gmailOperation } from '@hanzoteam/model-gmail'
import { guestOperation } from '@hanzoteam/model-guest'
import { hrOperation } from '@hanzoteam/model-hr'
import { inboxId, inboxOperation } from '@hanzoteam/model-inbox'
import { inventoryOperation } from '@hanzoteam/model-inventory'
import { leadOperation } from '@hanzoteam/model-lead'
import { loveId, loveOperation } from '@hanzoteam/model-love'
import { notificationOperation } from '@hanzoteam/model-notification'
import { preferenceOperation } from '@hanzoteam/model-preference'
import { processId, processOperation } from '@hanzoteam/model-process'
import { productsOperation } from '@hanzoteam/model-products'
import { questionsOperation } from '@hanzoteam/model-questions'
import { ratingOperation } from '@hanzoteam/model-rating'
import { recorderId, recorderOperation } from '@hanzoteam/model-recorder'
import { recruitOperation } from '@hanzoteam/model-recruit'
import { requestOperation } from '@hanzoteam/model-request'
import { activityServerOperation } from '@hanzoteam/model-server-activity'
import { settingOperation } from '@hanzoteam/model-setting'
import { surveyOperation } from '@hanzoteam/model-survey'
import { tagsOperation } from '@hanzoteam/model-tags'
import { taskOperation } from '@hanzoteam/model-task'
import { telegramOperation } from '@hanzoteam/model-telegram'
import { templatesOperation } from '@hanzoteam/model-templates'
import { testManagementOperation } from '@hanzoteam/model-test-management'
import { textEditorOperation } from '@hanzoteam/model-text-editor'
import { timeOperation } from '@hanzoteam/model-time'
import { trackerOperation } from '@hanzoteam/model-tracker'
import { trainingOperation } from '@hanzoteam/model-training'
import { viewOperation } from '@hanzoteam/model-view'
import { workbenchOperation } from '@hanzoteam/model-workbench'

export const migrateOperations: [string, MigrateOperation][] = [
  ['core', coreOperation],
  ['rating', ratingOperation],
  ['activity', activityOperation],
  ['card', cardOperation],
  ['chunter', chunterOperation],
  ['calendar', calendarOperation],
  ['gmail', gmailOperation],
  ['templates', templatesOperation],
  ['telegram', telegramOperation],
  ['task', taskOperation],
  ['attachment', attachmentOperation],
  ['lead', leadOperation],
  ['preference', preferenceOperation],
  ['recruit', recruitOperation],
  ['view', viewOperation],
  ['contact', contactOperation],
  ['guest', guestOperation],
  ['tags', tagsOperation],
  ['setting', settingOperation],
  ['tracker', trackerOperation],
  ['documents', documentsOperation],
  ['questions', questionsOperation],
  ['training', trainingOperation],
  ['request', requestOperation],
  ['products', productsOperation],
  ['board', boardOperation],
  ['hr', hrOperation],
  ['document', documentOperation],
  ['drive', driveOperation],
  ['bitrix', bitrixOperation],
  ['inventiry', inventoryOperation],
  ['github', githubOperation],
  ['pre-time', githubOperationPreTime],
  ['time', timeOperation],
  [loveId, loveOperation],
  ['activityServer', activityServerOperation],
  ['textEditorOperation', textEditorOperation],
  // We should call notification migration after activityServer and chunter
  ['notification', notificationOperation],
  ['analyticsCollector', analyticsCollectorOperation],
  ['workbench', workbenchOperation],
  ['testManagement', testManagementOperation],
  ['survey', surveyOperation],
  [aiBotId, aiBotOperation],
  [chatId, chatOperation],
  [inboxId, inboxOperation],
  [processId, processOperation],
  [communicationId, communicationOperation],
  [recorderId, recorderOperation]
]
