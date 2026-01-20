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
import { type MigrateOperation } from '@hanzo/model'
import { activityOperation } from '@hanzo/model-activity'
import { aiBotId, aiBotOperation } from '@hanzo/model-ai-bot'
import { analyticsCollectorOperation } from '@hanzo/model-analytics-collector'
import { attachmentOperation } from '@hanzo/model-attachment'
import { bitrixOperation } from '@hanzo/model-bitrix'
import { boardOperation } from '@hanzo/model-board'
import { calendarOperation } from '@hanzo/model-calendar'
import { cardOperation } from '@hanzo/model-card'
import { chatId, chatOperation } from '@hanzo/model-chat'
import { chunterOperation } from '@hanzo/model-chunter'
import { communicationId, communicationOperation } from '@hanzo/model-communication'
import { contactOperation } from '@hanzo/model-contact'
import { documentsOperation } from '@hanzo/model-controlled-documents'
import { coreOperation } from '@hanzo/model-core'
import { documentOperation } from '@hanzo/model-document'
import { driveOperation } from '@hanzo/model-drive'
import { githubOperation, githubOperationPreTime } from '@hanzo/model-github'
import { gmailOperation } from '@hanzo/model-gmail'
import { guestOperation } from '@hanzo/model-guest'
import { hrOperation } from '@hanzo/model-hr'
import { inboxId, inboxOperation } from '@hanzo/model-inbox'
import { inventoryOperation } from '@hanzo/model-inventory'
import { leadOperation } from '@hanzo/model-lead'
import { loveId, loveOperation } from '@hanzo/model-love'
import { notificationOperation } from '@hanzo/model-notification'
import { preferenceOperation } from '@hanzo/model-preference'
import { processId, processOperation } from '@hanzo/model-process'
import { productsOperation } from '@hanzo/model-products'
import { questionsOperation } from '@hanzo/model-questions'
import { ratingOperation } from '@hanzo/model-rating'
import { recorderId, recorderOperation } from '@hanzo/model-recorder'
import { recruitOperation } from '@hanzo/model-recruit'
import { requestOperation } from '@hanzo/model-request'
import { activityServerOperation } from '@hanzo/model-server-activity'
import { settingOperation } from '@hanzo/model-setting'
import { surveyOperation } from '@hanzo/model-survey'
import { tagsOperation } from '@hanzo/model-tags'
import { taskOperation } from '@hanzo/model-task'
import { telegramOperation } from '@hanzo/model-telegram'
import { templatesOperation } from '@hanzo/model-templates'
import { testManagementOperation } from '@hanzo/model-test-management'
import { textEditorOperation } from '@hanzo/model-text-editor'
import { timeOperation } from '@hanzo/model-time'
import { trackerOperation } from '@hanzo/model-tracker'
import { trainingOperation } from '@hanzo/model-training'
import { viewOperation } from '@hanzo/model-view'
import { workbenchOperation } from '@hanzo/model-workbench'

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
