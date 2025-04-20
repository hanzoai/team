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
import { attachmentOperation } from '@hanzo/model-attachment'
import { bitrixOperation } from '@hanzo/model-bitrix'
import { boardOperation } from '@hanzo/model-board'
import { calendarOperation } from '@hanzo/model-calendar'
import { chunterOperation } from '@hanzo/model-chunter'
import { contactOperation } from '@hanzo/model-contact'
import { coreOperation } from '@hanzo/model-core'
import { documentOperation } from '@hanzo/model-document'
import { driveOperation } from '@hanzo/model-drive'
import { gmailOperation } from '@hanzo/model-gmail'
import { guestOperation } from '@hanzo/model-guest'
import { hrOperation } from '@hanzo/model-hr'
import { inventoryOperation } from '@hanzo/model-inventory'
import { leadOperation } from '@hanzo/model-lead'
import { notificationOperation } from '@hanzo/model-notification'
import { preferenceOperation } from '@hanzo/model-preference'
import { recruitOperation } from '@hanzo/model-recruit'
import { activityServerOperation } from '@hanzo/model-server-activity'
import { settingOperation } from '@hanzo/model-setting'
import { tagsOperation } from '@hanzo/model-tags'
import { taskOperation } from '@hanzo/model-task'
import { telegramOperation } from '@hanzo/model-telegram'
import { templatesOperation } from '@hanzo/model-templates'
import { timeOperation } from '@hanzo/model-time'
import { trackerOperation } from '@hanzo/model-tracker'
import { viewOperation } from '@hanzo/model-view'
import { textEditorOperation } from '@hanzo/model-text-editor'
import { githubOperation, githubOperationPreTime } from '@hanzo/model-github'
import { loveId, loveOperation } from '@hanzo/model-love'
import { questionsOperation } from '@hanzo/model-questions'
import { trainingOperation } from '@hanzo/model-training'
import { documentsOperation } from '@hanzo/model-controlled-documents'
import { productsOperation } from '@hanzo/model-products'
import { requestOperation } from '@hanzo/model-request'
import { analyticsCollectorOperation } from '@hanzo/model-analytics-collector'
import { workbenchOperation } from '@hanzo/model-workbench'
import { testManagementOperation } from '@hanzo/model-test-management'
import { surveyOperation } from '@hanzo/model-survey'
import { cardOperation } from '@hanzo/model-card'
import { aiBotId, aiBotOperation } from '@hanzo/model-ai-bot'
import { chatId, chatOperation } from '@hanzo/model-chat'
import { inboxId, inboxOperation } from '@hanzo/model-inbox'
import { processId, processOperation } from '@hanzo/model-process'

export const migrateOperations: [string, MigrateOperation][] = [
  ['core', coreOperation],
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
  [processId, processOperation]
]
