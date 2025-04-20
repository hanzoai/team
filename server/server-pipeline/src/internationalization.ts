import { coreId } from '@hanzo/core'
import { addStringsLoader, platformId } from '@hanzo/platform'
import { activityId } from '@hanzo/activity'
import { attachmentId } from '@hanzo/attachment'
import { boardId } from '@hanzo/board'
import { calendarId } from '@hanzo/calendar'
import { chunterId } from '@hanzo/chunter'
import { contactId } from '@hanzo/contact'
import { documentsId } from '@hanzo/controlled-documents'
import { documentId } from '@hanzo/document'
import { driveId } from '@hanzo/drive'
import { githubId } from '@hanzo/github'
import { gmailId } from '@hanzo/gmail'
import { hrId } from '@hanzo/hr'
import { inventoryId } from '@hanzo/inventory'
import { leadId } from '@hanzo/lead'
import { loginId } from '@hanzo/login'
import { loveId } from '@hanzo/love'
import { notificationId } from '@hanzo/notification'
import { onboardId } from '@hanzo/onboard'
import { preferenceId } from '@hanzo/preference'
import { productsId } from '@hanzo/products'
import { recruitId } from '@hanzo/recruit'
import { requestId } from '@hanzo/request'
import { settingId } from '@hanzo/setting'
import { supportId } from '@hanzo/support'
import { tagsId } from '@hanzo/tags'
import { taskId } from '@hanzo/task'
import { telegramId } from '@hanzo/telegram'
import { templatesId } from '@hanzo/templates'
import { trackerId } from '@hanzo/tracker'
import { trainingId } from '@hanzo/training'
import { viewId } from '@hanzo/view'
import { workbenchId } from '@hanzo/workbench'
import { timeId } from '@hanzo/time'
import { surveyId } from '@hanzo/survey'
import coreEng from '@hanzo/core/lang/en.json'
import loginEng from '@hanzo/login-assets/lang/en.json'
import platformEng from '@hanzo/platform/lang/en.json'
import activityEn from '@hanzo/activity-assets/lang/en.json'
import attachmentEn from '@hanzo/attachment-assets/lang/en.json'
import boardEn from '@hanzo/board-assets/lang/en.json'
import calendarEn from '@hanzo/calendar-assets/lang/en.json'
import chunterEn from '@hanzo/chunter-assets/lang/en.json'
import contactEn from '@hanzo/contact-assets/lang/en.json'
import documentsEn from '@hanzo/controlled-documents-assets/lang/en.json'
import documentEn from '@hanzo/document-assets/lang/en.json'
import driveEn from '@hanzo/drive-assets/lang/en.json'
import githubEn from '@hanzo/github-assets/lang/en.json'
import gmailEn from '@hanzo/gmail-assets/lang/en.json'
import hrEn from '@hanzo/hr-assets/lang/en.json'
import inventoryEn from '@hanzo/inventory-assets/lang/en.json'
import leadEn from '@hanzo/lead-assets/lang/en.json'
import loveEn from '@hanzo/love-assets/lang/en.json'
import notificationEn from '@hanzo/notification-assets/lang/en.json'
import onboardEn from '@hanzo/onboard-assets/lang/en.json'
import preferenceEn from '@hanzo/preference-assets/lang/en.json'
import productsEn from '@hanzo/products-assets/lang/en.json'
import recruitEn from '@hanzo/recruit-assets/lang/en.json'
import requestEn from '@hanzo/request-assets/lang/en.json'
import settingEn from '@hanzo/setting-assets/lang/en.json'
import supportEn from '@hanzo/support-assets/lang/en.json'
import tagsEn from '@hanzo/tags-assets/lang/en.json'
import taskEn from '@hanzo/task-assets/lang/en.json'
import telegramEn from '@hanzo/telegram-assets/lang/en.json'
import templatesEn from '@hanzo/templates-assets/lang/en.json'
import trackerEn from '@hanzo/tracker-assets/lang/en.json'
import trainingEn from '@hanzo/training-assets/lang/en.json'
import viewEn from '@hanzo/view-assets/lang/en.json'
import workbenchEn from '@hanzo/workbench-assets/lang/en.json'
import timeEn from '@hanzo/time-assets/lang/en.json'
import surveyEn from '@hanzo/survey-assets/lang/en.json'

export function registerStringLoaders (): void {
  addStringsLoader(coreId, async (lang: string) => coreEng)
  addStringsLoader(loginId, async (lang: string) => loginEng)
  addStringsLoader(onboardId, async (lang: string) => onboardEn)
  addStringsLoader(platformId, async (lang: string) => platformEng)

  addStringsLoader(taskId, async (lang: string) => taskEn)
  addStringsLoader(viewId, async (lang: string) => viewEn)
  addStringsLoader(chunterId, async (lang: string) => chunterEn)
  addStringsLoader(attachmentId, async (lang: string) => attachmentEn)
  addStringsLoader(contactId, async (lang: string) => contactEn)
  addStringsLoader(recruitId, async (lang: string) => recruitEn)
  addStringsLoader(activityId, async (lang: string) => activityEn)
  addStringsLoader(settingId, async (lang: string) => settingEn)
  addStringsLoader(supportId, async (lang: string) => supportEn)
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
  addStringsLoader(requestId, async (lang: string) => requestEn)
  addStringsLoader(loveId, async (lang: string) => loveEn)
  addStringsLoader(driveId, async (lang: string) => driveEn)
  addStringsLoader(documentsId, async (lang: string) => documentsEn)
  addStringsLoader(productsId, async (lang: string) => productsEn)
  addStringsLoader(trainingId, async (lang: string) => trainingEn)
  addStringsLoader(githubId, async (lang: string) => githubEn)
  addStringsLoader(timeId, async (lang: string) => timeEn)
  addStringsLoader(surveyId, async (lang: string) => surveyEn)
}
