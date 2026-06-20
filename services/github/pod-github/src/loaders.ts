import { coreId } from '@hanzoteam/core'

import { activityId } from '@hanzoteam/activity'
import { attachmentId } from '@hanzoteam/attachment'
import { bitrixId } from '@hanzoteam/bitrix'
import { boardId } from '@hanzoteam/board'
import { calendarId } from '@hanzoteam/calendar'
import { chunterId } from '@hanzoteam/chunter'
import { contactId } from '@hanzoteam/contact'
import { driveId } from '@hanzoteam/drive'
import { gmailId } from '@hanzoteam/gmail'
import { hrId } from '@hanzoteam/hr'
import { inventoryId } from '@hanzoteam/inventory'
import { leadId } from '@hanzoteam/lead'
import { loginId } from '@hanzoteam/login'
import { notificationId } from '@hanzoteam/notification'
import { preferenceId } from '@hanzoteam/preference'
import { recruitId } from '@hanzoteam/recruit'
import { requestId } from '@hanzoteam/request'
import { settingId } from '@hanzoteam/setting'
import { supportId } from '@hanzoteam/support'
import { tagsId } from '@hanzoteam/tags'
import { taskId } from '@hanzoteam/task'
import { telegramId } from '@hanzoteam/telegram'
import { templatesId } from '@hanzoteam/templates'
import { trackerId } from '@hanzoteam/tracker'
import { viewId } from '@hanzoteam/view'
import { workbenchId } from '@hanzoteam/workbench'
import { documentId } from '@hanzoteam/document'
import { githubId } from '@hanzoteam/github'

import activityEn from '@hanzoteam/activity-assets/lang/en.json'
import attachmentEn from '@hanzoteam/attachment-assets/lang/en.json'
import bitrixEn from '@hanzoteam/bitrix-assets/lang/en.json'
import boardEn from '@hanzoteam/board-assets/lang/en.json'
import calendarEn from '@hanzoteam/calendar-assets/lang/en.json'
import chunterEn from '@hanzoteam/chunter-assets/lang/en.json'
import contactEn from '@hanzoteam/contact-assets/lang/en.json'
import coreEng from '@hanzoteam/core/lang/en.json'
import driveEn from '@hanzoteam/drive-assets/lang/en.json'
import gmailEn from '@hanzoteam/gmail-assets/lang/en.json'
import hrEn from '@hanzoteam/hr-assets/lang/en.json'
import inventoryEn from '@hanzoteam/inventory-assets/lang/en.json'
import leadEn from '@hanzoteam/lead-assets/lang/en.json'
import loginEng from '@hanzoteam/login-assets/lang/en.json'
import platformEng from '@hanzoteam/platform/lang/en.json'
import notificationEn from '@hanzoteam/notification-assets/lang/en.json'
import { addStringsLoader, platformId } from '@hanzoteam/platform'
import preferenceEn from '@hanzoteam/preference-assets/lang/en.json'
import recruitEn from '@hanzoteam/recruit-assets/lang/en.json'
import requestEn from '@hanzoteam/request-assets/lang/en.json'
import settingEn from '@hanzoteam/setting-assets/lang/en.json'
import supportEn from '@hanzoteam/support-assets/lang/en.json'
import tagsEn from '@hanzoteam/tags-assets/lang/en.json'
import taskEn from '@hanzoteam/task-assets/lang/en.json'
import telegramEn from '@hanzoteam/telegram-assets/lang/en.json'
import templatesEn from '@hanzoteam/templates-assets/lang/en.json'
import trackerEn from '@hanzoteam/tracker-assets/lang/en.json'
import viewEn from '@hanzoteam/view-assets/lang/en.json'
import workbenchEn from '@hanzoteam/workbench-assets/lang/en.json'
import documentEn from '@hanzoteam/document-assets/lang/en.json'
import githubEn from '@hanzoteam/github-assets/lang/en.json'

export function registerLoaders (): void {
  addStringsLoader(coreId, async (lang: string) => coreEng)
  addStringsLoader(loginId, async (lang: string) => loginEng)
  addStringsLoader(platformId, async (lang: string) => platformEng)

  addStringsLoader(taskId, async (lang: string) => taskEn)
  addStringsLoader(viewId, async (lang: string) => viewEn)
  addStringsLoader(chunterId, async (lang: string) => chunterEn)
  addStringsLoader(attachmentId, async (lang: string) => attachmentEn)
  addStringsLoader(contactId, async (lang: string) => contactEn)
  addStringsLoader(recruitId, async (lang: string) => recruitEn)
  addStringsLoader(activityId, async (lang: string) => activityEn)
  addStringsLoader(settingId, async (lang: string) => settingEn)
  addStringsLoader(telegramId, async (lang: string) => telegramEn)
  addStringsLoader(leadId, async (lang: string) => leadEn)
  addStringsLoader(gmailId, async (lang: string) => gmailEn)
  addStringsLoader(workbenchId, async (lang: string) => workbenchEn)
  addStringsLoader(inventoryId, async (lang: string) => inventoryEn)
  addStringsLoader(templatesId, async (lang: string) => templatesEn)
  addStringsLoader(notificationId, async (lang: string) => notificationEn)
  addStringsLoader(tagsId, async (lang: string) => tagsEn)
  addStringsLoader(calendarId, async (lang: string) => calendarEn)
  addStringsLoader(trackerId, async (lang: string) => trackerEn)
  addStringsLoader(boardId, async (lang: string) => boardEn)
  addStringsLoader(preferenceId, async (lang: string) => preferenceEn)
  addStringsLoader(hrId, async (lang: string) => hrEn)
  addStringsLoader(documentId, async (lang: string) => documentEn)
  addStringsLoader(bitrixId, async (lang: string) => bitrixEn)
  addStringsLoader(requestId, async (lang: string) => requestEn)
  addStringsLoader(supportId, async (lang: string) => supportEn)
  addStringsLoader(githubId, async (lang: string) => githubEn)
  addStringsLoader(driveId, async (lang: string) => driveEn)
}
