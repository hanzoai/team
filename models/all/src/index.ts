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

import core, { coreId, type Data, type PluginConfiguration, type Ref, type Tx, type Version } from '@hanzo/core'

import { Builder } from '@hanzo/model'
import { activityId, createModel as activityModel } from '@hanzo/model-activity'
import { attachmentId, createModel as attachmentModel } from '@hanzo/model-attachment'
import bitrix, { bitrixId, createModel as bitrixModel } from '@hanzo/model-bitrix'
import board, { boardId, createModel as boardModel } from '@hanzo/model-board'
import calendar, { calendarId, createModel as calendarModel } from '@hanzo/model-calendar'
import chunter, { chunterId, createModel as chunterModel } from '@hanzo/model-chunter'
import contact, { contactId, createModel as contactModel } from '@hanzo/model-contact'
import { createModel as coreModel } from '@hanzo/model-core'
import gmail, { gmailId, createModel as gmailModel } from '@hanzo/model-gmail'
import { guestId, createModel as guestModel } from '@hanzo/model-guest'
import hr, { hrId, createModel as hrModel } from '@hanzo/model-hr'
import inventory, { inventoryId, createModel as inventoryModel } from '@hanzo/model-inventory'
import lead, { leadId, createModel as leadModel } from '@hanzo/model-lead'
import notification, { notificationId, createModel as notificationModel } from '@hanzo/model-notification'
import { preferenceId, createModel as preferenceModel } from '@hanzo/model-preference'
import presentation, { presentationId, createModel as presentationModel } from '@hanzo/model-presentation'
import recruit, { recruitId, createModel as recruitModel } from '@hanzo/model-recruit'
import { requestId, createModel as requestModel } from '@hanzo/model-request'
import { aiBotId, createModel as aiBotModel } from '@hanzo/model-ai-bot'
import { serverActivityId, createModel as serverActivityModel } from '@hanzo/model-server-activity'
import { serverAttachmentId, createModel as serverAttachmentModel } from '@hanzo/model-server-attachment'
import { serverCardId, createModel as serverCardModel } from '@hanzo/model-server-card'
import { serverCalendarId, createModel as serverCalendarModel } from '@hanzo/model-server-calendar'
import { serverChunterId, createModel as serverChunterModel } from '@hanzo/model-server-chunter'
import {
  serverCollaborationId,
  createModel as serverCollaborationModel
} from '@hanzo/model-server-collaboration'
import { serverContactId, createModel as serverContactModel } from '@hanzo/model-server-contact'
import { serverCoreId, createModel as serverCoreModel } from '@hanzo/model-server-core'
import { serverDriveId, createModel as serverDriveModel } from '@hanzo/model-server-drive'
import { serverGmailId, createModel as serverGmailModel } from '@hanzo/model-server-gmail'
import { serverGuestId, createModel as serverGuestModel } from '@hanzo/model-server-guest'
import { serverHrId, createModel as serverHrModel } from '@hanzo/model-server-hr'
import { serverInventoryId, createModel as serverInventoryModel } from '@hanzo/model-server-inventory'
import { serverLeadId, createModel as serverLeadModel } from '@hanzo/model-server-lead'
import { serverNotificationId, createModel as serverNotificationModel } from '@hanzo/model-server-notification'
import { serverRecruitId, createModel as serverRecruitModel } from '@hanzo/model-server-recruit'
import { serverRequestId, createModel as serverRequestModel } from '@hanzo/model-server-request'
import { serverSettingId, createModel as serveSettingModel } from '@hanzo/model-server-setting'
import { serverTagsId, createModel as serverTagsModel } from '@hanzo/model-server-tags'
import { serverTaskId, createModel as serverTaskModel } from '@hanzo/model-server-task'
import { serverTelegramId, createModel as serverTelegramModel } from '@hanzo/model-server-telegram'
import { serverTemplatesId, createModel as serverTemplatesModel } from '@hanzo/model-server-templates'
import { serverTrackerId, createModel as serverTrackerModel } from '@hanzo/model-server-tracker'
import { serverViewId, createModel as serverViewModel } from '@hanzo/model-server-view'
import { serverAiBotId, createModel as serverAiBotModel } from '@hanzo/model-server-ai-bot'
import setting, { settingId, createModel as settingModel } from '@hanzo/model-setting'
import { driveId, createModel as driveModel } from '@hanzo/model-drive'
import { supportId, createModel as supportModel } from '@hanzo/model-support'
import { tagsId, createModel as tagsModel } from '@hanzo/model-tags'
import { taskId, createModel as taskModel } from '@hanzo/model-task'
import telegram, { telegramId, createModel as telegramModel } from '@hanzo/model-telegram'
import { templatesId, createModel as templatesModel } from '@hanzo/model-templates'
import { textEditorId, createModel as textEditorModel } from '@hanzo/model-text-editor'
import { timeId, createModel as timeModel } from '@hanzo/model-time'
import tracker, { trackerId, createModel as trackerModel } from '@hanzo/model-tracker'
import { uploaderId, createModel as uploaderModel } from '@hanzo/model-uploader'
import { recorderId, createModel as recorderModel } from '@hanzo/model-recorder'
import view, { viewId, createModel as viewModel } from '@hanzo/model-view'
import workbench, { workbenchId, createModel as workbenchModel } from '@hanzo/model-workbench'
import card, { cardId, createModel as cardModel } from '@hanzo/model-card'
import { desktopPreferencesId, createModel as desktopPreferencesModel } from '@hanzo/model-desktop-preferences'

import document, { documentId, createModel as documentModel } from '@hanzo/model-document'
import { serverDocumentId, createModel as serverDocumentModel } from '@hanzo/model-server-document'

import github, { githubId, createModel as githubModel } from '@hanzo/model-github'
import { serverGithubId, createModel as serverGithubModel } from '@hanzo/server-github-model'

import { serverTimeId, createModel as serverTimeModel } from '@hanzo/model-server-time'
import love, { loveId, createModel as loveModel } from '@hanzo/model-love'
import { printId, createModel as printModel } from '@hanzo/model-print'
import { exportId, createModel as exportModel } from '@hanzo/model-export'
import { analyticsCollectorId, createModel as analyticsCollectorModel } from '@hanzo/model-analytics-collector'
import { serverLoveId, createModel as serverLoveModel } from '@hanzo/model-server-love'
import { serverProcessId, createModel as serverProcessModel } from '@hanzo/model-server-process'

import { questionsId, createModel as questionsModel } from '@hanzo/model-questions'
import trainings, { trainingId, createModel as trainingModel } from '@hanzo/model-training'
import documents, { documentsId, createModel as documentsModel } from '@hanzo/model-controlled-documents'
import products, { productsId, createModel as productsModel } from '@hanzo/model-products'
import { serverProductsId, createModel as serverProductsModel } from '@hanzo/model-server-products'
import { serverTrainingId, createModel as serverTrainingModel } from '@hanzo/model-server-training'
import testManagement, {
  testManagementId,
  createModel as testManagementModel
} from '@hanzo/model-test-management'
import { mailId, createModel as mailModel } from '@hanzo/model-mail'

import {
  serverDocumentsId,
  createModel as serverDocumentsModel
} from '@hanzo/model-server-controlled-documents'
import { surveyId, createModel as surveyModel } from '@hanzo/model-survey'
import { presenceId, createModel as presenceModel } from '@hanzo/model-presence'
import { chatId, createModel as chatModel } from '@hanzo/model-chat'
import processes, { processId, createModel as processModel } from '@hanzo/model-process'
import { createModel as inboxModel, inboxId } from '@hanzo/model-inbox'
import { type Plugin } from '@hanzo/platform'

interface ConfigurablePlugin extends Omit<Data<PluginConfiguration>, 'pluginId' | 'transactions'> {}

type BuilderConfig = [(b: Builder) => void, Plugin] | [(b: Builder) => void, Plugin, ConfigurablePlugin | undefined]

export function getModelVersion (): Data<Version> {
  const rawVersion = (process.env.MODEL_VERSION ?? '0.6.0').replace('"', '').trim().replace('v', '').split('.')
  if (rawVersion.length === 3) {
    return {
      major: parseInt(rawVersion[0]),
      minor: parseInt(rawVersion[1]),
      patch: parseInt(rawVersion[2])
    }
  }
  return { major: 0, minor: 6, patch: 0 }
}

export type { MigrateOperation } from '@hanzo/model'

/**
 * @public
 * @param enabled - a set of enabled plugins
 * @param disabled  - a set of disabled plugins
 * @returns
 */
export default function buildModel (enabled: string[] = ['*'], disabled: string[] = []): Builder {
  const builder = new Builder()

  const defaultFilter = [
    workbench.class.Application,
    presentation.class.ComponentPointExtension,
    presentation.class.ObjectSearchCategory,
    notification.class.NotificationGroup,
    view.class.Action,
    contact.class.ChannelProvider,
    setting.class.IntegrationType,
    setting.class.WorkspaceSettingCategory,
    setting.class.SettingsCategory
  ]

  const builders: BuilderConfig[] = [
    [coreModel, coreId],
    [activityModel, activityId],
    [attachmentModel, attachmentId],
    [guestModel, guestId],
    [tagsModel, tagsId],
    [viewModel, viewId],
    [workbenchModel, workbenchId],
    [
      cardModel,
      cardId,
      {
        label: card.string.Cards,
        description: card.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: card.icon.Card,
        classFilter: defaultFilter
      }
    ],
    [
      contactModel,
      contactId,
      {
        label: contact.string.ConfigLabel,
        description: contact.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: contact.icon.ContactApplication,
        classFilter: defaultFilter
      }
    ],
    [
      chunterModel,
      chunterId,
      {
        label: chunter.string.ConfigLabel,
        description: chunter.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: chunter.icon.Chunter,
        classFilter: [workbench.class.Application]
      }
    ],
    [taskModel, taskId],
    [
      calendarModel,
      calendarId,
      {
        label: calendar.string.ConfigLabel,
        description: calendar.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: calendar.icon.Calendar,
        classFilter: defaultFilter
      }
    ],
    [
      recruitModel,
      recruitId,
      {
        label: recruit.string.ConfigLabel,
        description: recruit.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: recruit.icon.RecruitApplication,
        classFilter: defaultFilter
      }
    ],
    [settingModel, settingId],
    [
      telegramModel,
      telegramId,
      {
        label: telegram.string.ConfigLabel,
        description: telegram.string.ConfigDescription,
        enabled: true,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      leadModel,
      leadId,
      {
        label: lead.string.ConfigLabel,
        description: lead.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: lead.icon.LeadApplication,
        classFilter: defaultFilter
      }
    ],
    [
      gmailModel,
      gmailId,
      {
        label: gmail.string.ConfigLabel,
        description: gmail.string.ConfigDescription,
        enabled: true,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      inventoryModel,
      inventoryId,
      {
        label: inventory.string.ConfigLabel,
        description: inventory.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: inventory.icon.InventoryApplication,
        classFilter: defaultFilter
      }
    ],
    [presentationModel, presentationId],
    [templatesModel, templatesId],
    [textEditorModel, textEditorId],
    [uploaderModel, uploaderId],
    [recorderModel, recorderId],
    [notificationModel, notificationId],
    [preferenceModel, preferenceId],
    [analyticsCollectorModel, analyticsCollectorId],
    [
      hrModel,
      hrId,
      {
        label: hr.string.ConfigLabel,
        description: hr.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: hr.icon.Structure,
        classFilter: defaultFilter
      }
    ],
    [
      trackerModel,
      trackerId,
      {
        label: tracker.string.ConfigLabel,
        description: tracker.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: tracker.icon.TrackerApplication,
        classFilter: defaultFilter
      }
    ],
    [
      documentModel,
      documentId,
      {
        label: document.string.ConfigLabel,
        description: document.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: document.icon.DocumentApplication,
        classFilter: defaultFilter
      }
    ],
    [
      boardModel,
      boardId,
      {
        label: board.string.ConfigLabel,
        description: board.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: board.icon.Board,
        classFilter: defaultFilter
      }
    ],
    [
      bitrixModel,
      bitrixId,
      {
        label: bitrix.string.ConfigLabel,
        description: bitrix.string.ConfigDescription,
        enabled: false,
        beta: true,
        icon: bitrix.icon.Bitrix,
        classFilter: defaultFilter
      }
    ],
    [
      requestModel,
      requestId,
      {
        // label: request.string.ConfigLabel,
        // description: request.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [timeModel, timeId],
    [supportModel, supportId],
    [desktopPreferencesModel, desktopPreferencesId],

    [
      githubModel,
      githubId,
      {
        label: github.string.ConfigLabel,
        description: github.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: github.icon.Github
      }
    ],
    [
      loveModel,
      loveId,
      {
        label: love.string.Office,
        description: love.string.LoveDescription,
        enabled: true,
        beta: true,
        icon: love.icon.Love,
        classFilter: defaultFilter
      }
    ],
    [printModel, printId],
    [exportModel, exportId],
    [aiBotModel, aiBotId],
    [
      processModel,
      processId,
      {
        label: processes.string.ConfigLabel,
        description: processes.string.ConfigDescription,
        enabled: true,
        beta: true,
        icon: processes.icon.Process,
        classFilter: defaultFilter
      }
    ],
    [driveModel, driveId],
    [
      documentsModel,
      documentsId,
      {
        label: documents.string.ConfigLabel,
        description: documents.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      questionsModel,
      questionsId,
      {
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      trainingModel,
      trainingId,
      {
        label: trainings.string.ConfigLabel,
        description: trainings.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      productsModel,
      productsId,
      {
        label: products.string.ConfigLabel,
        description: products.string.ConfigDescription,
        enabled: false,
        beta: false,
        classFilter: defaultFilter
      }
    ],
    [
      testManagementModel,
      testManagementId,
      {
        label: testManagement.string.ConfigLabel,
        description: testManagement.string.ConfigDescription,
        enabled: true,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [surveyModel, surveyId],
    [presenceModel, presenceId],
    [mailModel, mailId],
    [chatModel, chatId],
    [inboxModel, inboxId],

    [serverCoreModel, serverCoreId],
    [serverAttachmentModel, serverAttachmentId],
    [serverCollaborationModel, serverCollaborationId],
    [serverContactModel, serverContactId],
    [serveSettingModel, serverSettingId],
    [serverChunterModel, serverChunterId],
    [serverInventoryModel, serverInventoryId],
    [serverLeadModel, serverLeadId],
    [serverTagsModel, serverTagsId],
    [serverTaskModel, serverTaskId],
    [serverTrackerModel, serverTrackerId],
    [serverCardModel, serverCardId],
    [serverCalendarModel, serverCalendarId],
    [serverRecruitModel, serverRecruitId],
    [serverGmailModel, serverGmailId],
    [serverTemplatesModel, serverTemplatesId],
    [serverTelegramModel, serverTelegramId],
    [serverHrModel, serverHrId],
    [serverNotificationModel, serverNotificationId],
    [serverRequestModel, serverRequestId],
    [serverViewModel, serverViewId],
    [serverActivityModel, serverActivityId],
    [serverDocumentModel, serverDocumentId],
    [serverGithubModel, serverGithubId],
    [serverLoveModel, serverLoveId],
    [serverTimeModel, serverTimeId],
    [serverGuestModel, serverGuestId],
    [serverDriveModel, serverDriveId],
    [serverProductsModel, serverProductsId],
    [serverTrainingModel, serverTrainingId],
    [serverDocumentsModel, serverDocumentsId],
    [serverAiBotModel, serverAiBotId],
    [serverProcessModel, serverProcessId]
  ]

  for (const [b, id, config] of builders) {
    const txes: Tx[] = []
    builder.onTx = (tx) => {
      txes.push(tx)
    }
    b(builder)
    builder.createDoc(
      core.class.PluginConfiguration,
      core.space.Model,
      {
        pluginId: id,
        transactions: txes.map((it) => it._id),
        ...config,
        enabled:
          config?.label === undefined ||
          ((config?.enabled ?? true) && (enabled.includes(id) || enabled.includes('*')) && !disabled.includes(id)),
        beta: config?.beta ?? false
      },
      ('plugin-configuration-' + id) as Ref<PluginConfiguration>
    )
    builder.onTx = undefined
  }

  builder.createDoc(core.class.Version, core.space.Model, getModelVersion(), core.version.Model)
  return builder
}

// Export upgrade procedures
export { migrateOperations } from './migration'
