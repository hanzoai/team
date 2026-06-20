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

import core, { coreId, type Data, type PluginConfiguration, type Ref, type Tx, type Version } from '@hanzoteam/core'

import { Builder } from '@hanzoteam/model'
import { activityId, createModel as activityModel } from '@hanzoteam/model-activity'
import { aiBotId, createModel as aiBotModel } from '@hanzoteam/model-ai-bot'
import { attachmentId, createModel as attachmentModel } from '@hanzoteam/model-attachment'
import bitrix, { bitrixId, createModel as bitrixModel } from '@hanzoteam/model-bitrix'
import board, { boardId, createModel as boardModel } from '@hanzoteam/model-board'
import calendar, { calendarId, createModel as calendarModel } from '@hanzoteam/model-calendar'
import card, { cardId, createModel as cardModel } from '@hanzoteam/model-card'
import chunter, { chunterId, createModel as chunterModel } from '@hanzoteam/model-chunter'
import contact, { contactId, createModel as contactModel } from '@hanzoteam/model-contact'
import { createModel as coreModel } from '@hanzoteam/model-core'
import { desktopDownloadsId, createModel as desktopDownloadsModel } from '@hanzoteam/model-desktop-downloads'
import { desktopPreferencesId, createModel as desktopPreferencesModel } from '@hanzoteam/model-desktop-preferences'
import { driveId, createModel as driveModel } from '@hanzoteam/model-drive'
import gmail, { gmailId, createModel as gmailModel } from '@hanzoteam/model-gmail'
import { guestId, createModel as guestModel } from '@hanzoteam/model-guest'
import hr, { hrId, createModel as hrModel } from '@hanzoteam/model-hr'
import inventory, { inventoryId, createModel as inventoryModel } from '@hanzoteam/model-inventory'
import lead, { leadId, createModel as leadModel } from '@hanzoteam/model-lead'
import { mediaId, createModel as mediaModel } from '@hanzoteam/model-media'
import notification, { notificationId, createModel as notificationModel } from '@hanzoteam/model-notification'
import { preferenceId, createModel as preferenceModel } from '@hanzoteam/model-preference'
import presentation, { presentationId, createModel as presentationModel } from '@hanzoteam/model-presentation'
import rating, { ratingId, createModel as ratingModel } from '@hanzoteam/model-rating'
import { recorderId, createModel as recorderModel } from '@hanzoteam/model-recorder'
import recruit, { recruitId, createModel as recruitModel } from '@hanzoteam/model-recruit'
import { requestId, createModel as requestModel } from '@hanzoteam/model-request'
import { serverActivityId, createModel as serverActivityModel } from '@hanzoteam/model-server-activity'
import { serverAiBotId, createModel as serverAiBotModel } from '@hanzoteam/model-server-ai-bot'
import { serverAttachmentId, createModel as serverAttachmentModel } from '@hanzoteam/model-server-attachment'
import { serverCalendarId, createModel as serverCalendarModel } from '@hanzoteam/model-server-calendar'
import { serverCardId, createModel as serverCardModel } from '@hanzoteam/model-server-card'
import { serverChunterId, createModel as serverChunterModel } from '@hanzoteam/model-server-chunter'
import {
  serverCollaborationId,
  createModel as serverCollaborationModel
} from '@hanzoteam/model-server-collaboration'
import { serverContactId, createModel as serverContactModel } from '@hanzoteam/model-server-contact'
import { serverCoreId, createModel as serverCoreModel } from '@hanzoteam/model-server-core'
import { serverDriveId, createModel as serverDriveModel } from '@hanzoteam/model-server-drive'
import { serverGmailId, createModel as serverGmailModel } from '@hanzoteam/model-server-gmail'
import { serverGuestId, createModel as serverGuestModel } from '@hanzoteam/model-server-guest'
import { serverHrId, createModel as serverHrModel } from '@hanzoteam/model-server-hr'
import { serverInventoryId, createModel as serverInventoryModel } from '@hanzoteam/model-server-inventory'
import { serverLeadId, createModel as serverLeadModel } from '@hanzoteam/model-server-lead'
import { serverNotificationId, createModel as serverNotificationModel } from '@hanzoteam/model-server-notification'
import { serverRecruitId, createModel as serverRecruitModel } from '@hanzoteam/model-server-recruit'
import { serverRequestId, createModel as serverRequestModel } from '@hanzoteam/model-server-request'
import { serverSettingId, createModel as serveSettingModel } from '@hanzoteam/model-server-setting'
import { serverTagsId, createModel as serverTagsModel } from '@hanzoteam/model-server-tags'
import { serverTaskId, createModel as serverTaskModel } from '@hanzoteam/model-server-task'
import { serverTelegramId, createModel as serverTelegramModel } from '@hanzoteam/model-server-telegram'
import { serverTemplatesId, createModel as serverTemplatesModel } from '@hanzoteam/model-server-templates'
import { serverTrackerId, createModel as serverTrackerModel } from '@hanzoteam/model-server-tracker'
import { serverViewId, createModel as serverViewModel } from '@hanzoteam/model-server-view'
import setting, { settingId, createModel as settingModel } from '@hanzoteam/model-setting'
import { supportId, createModel as supportModel } from '@hanzoteam/model-support'
import { tagsId, createModel as tagsModel } from '@hanzoteam/model-tags'
import { taskId, createModel as taskModel } from '@hanzoteam/model-task'
import telegram, { telegramId, createModel as telegramModel } from '@hanzoteam/model-telegram'
import { templatesId, createModel as templatesModel } from '@hanzoteam/model-templates'
import { textEditorId, createModel as textEditorModel } from '@hanzoteam/model-text-editor'
import { timeId, createModel as timeModel } from '@hanzoteam/model-time'
import tracker, { trackerId, createModel as trackerModel } from '@hanzoteam/model-tracker'
import { uploaderId, createModel as uploaderModel } from '@hanzoteam/model-uploader'
import view, { viewId, createModel as viewModel } from '@hanzoteam/model-view'
import workbench, { workbenchId, createModel as workbenchModel } from '@hanzoteam/model-workbench'
import { converterId, createModel as converterModel } from '@hanzoteam/model-converter'

import document, { documentId, createModel as documentModel } from '@hanzoteam/model-document'
import { serverDocumentId, createModel as serverDocumentModel } from '@hanzoteam/model-server-document'

import github, { githubId, createModel as githubModel } from '@hanzoteam/model-github'
import { serverGithubId, createModel as serverGithubModel } from '@hanzoteam/server-github-model'

import { analyticsCollectorId, createModel as analyticsCollectorModel } from '@hanzoteam/model-analytics-collector'
import { exportId, createModel as exportModel } from '@hanzoteam/model-export'
import love, { loveId, createModel as loveModel } from '@hanzoteam/model-love'
import { printId, createModel as printModel } from '@hanzoteam/model-print'
import { serverLoveId, createModel as serverLoveModel } from '@hanzoteam/model-server-love'
import { serverProcessId, createModel as serverProcessModel } from '@hanzoteam/model-server-process'
import { serverTimeId, createModel as serverTimeModel } from '@hanzoteam/model-server-time'

import aiAssistant, { aiAssistantId, createModel as aiAssistantModel } from '@hanzoteam/model-ai-assistant'
import documents, { documentsId, createModel as documentsModel } from '@hanzoteam/model-controlled-documents'
import { hanzoMailId, createModel as hanzoMailModel } from '@hanzoteam/model-hanzo-mail'
import { mailId, createModel as mailModel } from '@hanzoteam/model-mail'
import products, { productsId, createModel as productsModel } from '@hanzoteam/model-products'
import { questionsId, createModel as questionsModel } from '@hanzoteam/model-questions'
import { serverProductsId, createModel as serverProductsModel } from '@hanzoteam/model-server-products'
import { serverTrainingId, createModel as serverTrainingModel } from '@hanzoteam/model-server-training'
import testManagement, {
  testManagementId,
  createModel as testManagementModel
} from '@hanzoteam/model-test-management'
import trainings, { trainingId, createModel as trainingModel } from '@hanzoteam/model-training'

import { achievementId, createModel as achievementModel } from '@hanzoteam/model-achievement'
import { billingId, createModel as billingModel } from '@hanzoteam/model-billing'
import chat, { chatId, createModel as chatModel } from '@hanzoteam/model-chat'
import { communicationId, createModel as communicationModel } from '@hanzoteam/model-communication'
import { emojiId, createModel as emojiModel } from '@hanzoteam/model-emoji'
import { inboxId, createModel as inboxModel } from '@hanzoteam/model-inbox'
import { presenceId, createModel as presenceModel } from '@hanzoteam/model-presence'
import processes, { processId, createModel as processModel } from '@hanzoteam/model-process'
import {
  serverDocumentsId,
  createModel as serverDocumentsModel
} from '@hanzoteam/model-server-controlled-documents'
import survey, { surveyId, createModel as surveyModel } from '@hanzoteam/model-survey'
import { type Plugin } from '@hanzoteam/platform'

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

export type { MigrateOperation } from '@hanzoteam/model'

/**
 * @public
 * @param enabled - a set of enabled plugins
 * @param disabled  - a set of disabled plugins
 * @returns
 */
export default function buildModel (): Builder {
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
    setting.class.SettingsCategory,
    workbench.class.Widget
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
        beta: false,
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
        system: true,
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
        beta: true,
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
        beta: true,
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
    [mediaModel, mediaId],
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
        beta: true,
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
        hidden: true,
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
        hidden: true,
        icon: bitrix.icon.Bitrix,
        classFilter: defaultFilter
      }
    ],
    [
      requestModel,
      requestId,
      {
        label: setting.string.Configure,
        // description: request.string.ConfigDescription,
        enabled: false,
        beta: false,
        hidden: true,
        classFilter: defaultFilter
      }
    ],
    [timeModel, timeId],
    [supportModel, supportId],
    [desktopPreferencesModel, desktopPreferencesId],
    [desktopDownloadsModel, desktopDownloadsId],

    [
      githubModel,
      githubId,
      {
        label: github.string.ConfigLabel,
        description: github.string.ConfigDescription,
        enabled: true,
        beta: false,
        icon: github.icon.Github,
        classFilter: defaultFilter
      }
    ],
    [
      loveModel,
      loveId,
      {
        label: love.string.Office,
        description: love.string.LoveDescription,
        enabled: true,
        beta: false,
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
        beta: false,
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
        label: setting.string.Configure,
        enabled: false,
        beta: false,
        hidden: true,
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
    [
      surveyModel,
      surveyId,
      {
        label: survey.string.ConfigLabel,
        description: survey.string.ConfigDescription,
        enabled: false,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [presenceModel, presenceId],
    [
      chatModel,
      chatId,
      { label: chat.string.Chat, hidden: true, enabled: false, beta: true, classFilter: defaultFilter }
    ],
    [inboxModel, inboxId],
    [achievementModel, achievementId],
    [emojiModel, emojiId],
    [communicationModel, communicationId],
    [mailModel, mailId],
    [
      billingModel,
      billingId,
      {
        label: setting.string.Configure,
        beta: false,
        system: true,
        enabled: true
      }
    ],
    [hanzoMailModel, hanzoMailId],
    [
      aiAssistantModel,
      aiAssistantId,
      {
        label: aiAssistant.string.ConfigLabel,
        description: aiAssistant.string.ConfigDescription,
        hidden: true,
        enabled: false,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [
      ratingModel,
      ratingId,
      {
        label: rating.string.Rating,
        description: rating.string.Rating,
        icon: rating.icon.Rating,
        hidden: false,
        enabled: false,
        beta: true,
        classFilter: defaultFilter
      }
    ],
    [converterModel, converterId],

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
        label: config?.label ?? setting.string.Configure,
        hidden: config !== undefined ? config.hidden : true,
        enabled: (config?.enabled ?? true) && !(config?.hidden ?? false),
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
