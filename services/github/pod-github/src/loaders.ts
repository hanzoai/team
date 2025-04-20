import { coreId } from '@hanzo/core'

import { activityId } from '@hanzo/activity'
import { attachmentId } from '@hanzo/attachment'
import { bitrixId } from '@hanzo/bitrix'
import { boardId } from '@hanzo/board'
import { calendarId } from '@hanzo/calendar'
import { chunterId } from '@hanzo/chunter'
import { contactId } from '@hanzo/contact'
import { driveId } from '@hanzo/drive'
import { gmailId } from '@hanzo/gmail'
import { hrId } from '@hanzo/hr'
import { inventoryId } from '@hanzo/inventory'
import { leadId } from '@hanzo/lead'
import { loginId } from '@hanzo/login'
import { notificationId } from '@hanzo/notification'
import { preferenceId } from '@hanzo/preference'
import { recruitId } from '@hanzo/recruit'
import { requestId } from '@hanzo/request'
import { settingId } from '@hanzo/setting'
import { supportId } from '@hanzo/support'
import { tagsId } from '@hanzo/tags'
import { taskId } from '@hanzo/task'
import { telegramId } from '@hanzo/telegram'
import { templatesId } from '@hanzo/templates'
import { trackerId } from '@hanzo/tracker'
import { viewId } from '@hanzo/view'
import { workbenchId } from '@hanzo/workbench'
import { documentId } from '@hanzo/document'
import { githubId } from '@hanzo/github'

import activityEn from '@hanzo/activity-assets/lang/en.json'
import attachmentEn from '@hanzo/attachment-assets/lang/en.json'
import bitrixEn from '@hanzo/bitrix-assets/lang/en.json'
import boardEn from '@hanzo/board-assets/lang/en.json'
import calendarEn from '@hanzo/calendar-assets/lang/en.json'
import chunterEn from '@hanzo/chunter-assets/lang/en.json'
import contactEn from '@hanzo/contact-assets/lang/en.json'
import coreEng from '@hanzo/core/lang/en.json'
import driveEn from '@hanzo/drive-assets/lang/en.json'
import gmailEn from '@hanzo/gmail-assets/lang/en.json'
import hrEn from '@hanzo/hr-assets/lang/en.json'
import inventoryEn from '@hanzo/inventory-assets/lang/en.json'
import leadEn from '@hanzo/lead-assets/lang/en.json'
import loginEng from '@hanzo/login-assets/lang/en.json'
import platformEng from '@hanzo/platform/lang/en.json'
import notificationEn from '@hanzo/notification-assets/lang/en.json'
import { addStringsLoader, platformId } from '@hanzo/platform'
import preferenceEn from '@hanzo/preference-assets/lang/en.json'
import recruitEn from '@hanzo/recruit-assets/lang/en.json'
import requestEn from '@hanzo/request-assets/lang/en.json'
import settingEn from '@hanzo/setting-assets/lang/en.json'
import supportEn from '@hanzo/support-assets/lang/en.json'
import tagsEn from '@hanzo/tags-assets/lang/en.json'
import taskEn from '@hanzo/task-assets/lang/en.json'
import telegramEn from '@hanzo/telegram-assets/lang/en.json'
import templatesEn from '@hanzo/templates-assets/lang/en.json'
import trackerEn from '@hanzo/tracker-assets/lang/en.json'
import viewEn from '@hanzo/view-assets/lang/en.json'
import workbenchEn from '@hanzo/workbench-assets/lang/en.json'
import documentEn from '@hanzo/document-assets/lang/en.json'
import githubEn from '@hanzo/github-assets/lang/en.json'

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
