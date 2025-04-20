//
// Copyright © 2023 Hardcore Engineering Inc.
//

import {
  Plugin,
  addEventListener,
  addLocation,
  addStringsLoader,
  getMetadata,
  platformId,
  setMetadata
} from '@hanzo/platform'

import { activityId } from '@hanzo/activity'
import aiBot, { aiBotId } from '@hanzo/ai-bot'
import { attachmentId } from '@hanzo/attachment'
import { bitrixId } from '@hanzo/bitrix'
import { boardId } from '@hanzo/board'
import calendar, { calendarId } from '@hanzo/calendar'
import { cardId } from '@hanzo/card'
import { chunterId } from '@hanzo/chunter'
import client, { clientId } from '@hanzo/client'
import contactPlugin, { contactId } from '@hanzo/contact'
import { documentsId } from '@hanzo/controlled-documents'
import { desktopPreferencesId } from '@hanzo/desktop-preferences'
import { diffviewId } from '@hanzo/diffview'
import { documentId } from '@hanzo/document'
import { driveId } from '@hanzo/drive'
import exportPlugin, { exportId } from '@hanzo/export'
import gmail, { gmailId } from '@hanzo/gmail'
import guest, { guestId } from '@hanzo/guest'
import { hrId } from '@hanzo/hr'
import { imageCropperId } from '@hanzo/image-cropper'
import { inventoryId } from '@hanzo/inventory'
import { leadId } from '@hanzo/lead'
import login, { loginId } from '@hanzo/login'
import notification, { notificationId } from '@hanzo/notification'
import onboard, { onboardId } from '@hanzo/onboard'
import presence, { presenceId } from '@hanzo/presence'
import { processId } from '@hanzo/process'
import { productsId } from '@hanzo/products'
import { questionsId } from '@hanzo/questions'
import { recruitId } from '@hanzo/recruit'
import rekoni from '@hanzo/rekoni'
import { requestId } from '@hanzo/request'
import setting, { settingId } from '@hanzo/setting'
import { supportId } from '@hanzo/support'
import { surveyId } from '@hanzo/survey'
import { tagsId } from '@hanzo/tags'
import { taskId } from '@hanzo/task'
import telegram, { telegramId } from '@hanzo/telegram'
import { templatesId } from '@hanzo/templates'
import { testManagementId } from '@hanzo/test-management'
import { timeId } from '@hanzo/time'
import tracker, { trackerId } from '@hanzo/tracker'
import { trainingId } from '@hanzo/training'
import uiPlugin, { getCurrentLocation, locationStorageKeyId, navigate, setLocationStorageKey } from '@hanzo/ui'
import { uiNextId } from '@hanzo/ui-next'
import { uploaderId } from '@hanzo/uploader'
import recorder, { recorderId } from '@hanzo/recorder'
import { viewId } from '@hanzo/view'
import workbench, { workbenchId } from '@hanzo/workbench'
import { mailId } from '@hanzo/mail'
import { chatId } from '@hanzo/chat'
import { inboxId } from '@hanzo/inbox'

import '@hanzo/activity-assets'
import '@hanzo/analytics-collector-assets'
import '@hanzo/attachment-assets'
import '@hanzo/bitrix-assets'
import '@hanzo/board-assets'
import '@hanzo/calendar-assets'
import '@hanzo/card-assets'
import '@hanzo/chunter-assets'
import '@hanzo/contact-assets'
import '@hanzo/controlled-documents-assets'
import '@hanzo/desktop-preferences-assets'
import '@hanzo/diffview-assets'
import '@hanzo/document-assets'
import '@hanzo/drive-assets'
import '@hanzo/export-assets'
import '@hanzo/gmail-assets'
import '@hanzo/guest-assets'
import '@hanzo/hr-assets'
import '@hanzo/inventory-assets'
import '@hanzo/lead-assets'
import '@hanzo/login-assets'
import '@hanzo/love-assets'
import '@hanzo/notification-assets'
import '@hanzo/preference-assets'
import '@hanzo/print-assets'
import '@hanzo/process-assets'
import '@hanzo/products-assets'
import '@hanzo/questions-assets'
import '@hanzo/recruit-assets'
import '@hanzo/request-assets'
import '@hanzo/setting-assets'
import '@hanzo/support-assets'
import '@hanzo/survey-assets'
import '@hanzo/tags-assets'
import '@hanzo/task-assets'
import '@hanzo/telegram-assets'
import '@hanzo/templates-assets'
import '@hanzo/test-management-assets'
import '@hanzo/text-editor-assets'
import '@hanzo/time-assets'
import '@hanzo/tracker-assets'
import '@hanzo/training-assets'
import '@hanzo/uploader-assets'
import '@hanzo/view-assets'
import '@hanzo/workbench-assets'
import '@hanzo/mail-assets'
import '@hanzo/chat-assets'
import '@hanzo/inbox-assets'

import analyticsCollector, { analyticsCollectorId } from '@hanzo/analytics-collector'
import { coreId } from '@hanzo/core'
import love, { loveId } from '@hanzo/love'
import presentation, { parsePreviewConfig, parseUploadConfig, presentationId } from '@hanzo/presentation'
import print, { printId } from '@hanzo/print'
import sign from '@hanzo/sign'
import textEditor, { textEditorId } from '@hanzo/text-editor'

import { initThemeStore, setDefaultLanguage } from '@hanzo/theme'
import { configureNotifications } from './notifications'
import { Branding, Config, IPCMainExposed } from './types'

import github, { githubId } from '@hanzo/github'
import '@hanzo/github-assets'
import { preferenceId } from '@hanzo/preference'
import { uiId } from '@hanzo/ui/src/plugin'

function configureI18n (): void {
  // Add localization
  addStringsLoader(platformId, async (lang: string) => await import(
    /* webpackInclude: /\.json$/ */
    /* webpackMode: "lazy" */
    /* webpackChunkName: "lang-[request]" */
    `@hanzo/platform/lang/${lang}.json`
  ))
  addStringsLoader(coreId, async (lang: string) => await import(
    /* webpackInclude: /\.json$/ */
    /* webpackMode: "lazy" */
    /* webpackChunkName: "lang-[request]" */
    `@hanzo/core/lang/${lang}.json`
  ))
  addStringsLoader(
    presentationId,
    async (lang: string) => await import(`@hanzo/presentation/lang/${lang}.json`)
  )
  addStringsLoader(textEditorId, async (lang: string) => await import(`@hanzo/text-editor-assets/lang/${lang}.json`))
  addStringsLoader(uiId, async (lang: string) => await import(`@hanzo/ui/lang/${lang}.json`))
  addStringsLoader(uiNextId, async (lang: string) => await import(`@hanzo/ui-next/lang/${lang}.json`))
  addStringsLoader(uploaderId, async (lang: string) => await import(`@hanzo/uploader-assets/lang/${lang}.json`))
  addStringsLoader(recorderId, async (lang: string) => await import(`@hanzo/recorder-assets/lang/${lang}.json`))
  addStringsLoader(activityId, async (lang: string) => await import(`@hanzo/activity-assets/lang/${lang}.json`))
  addStringsLoader(
    attachmentId,
    async (lang: string) => await import(`@hanzo/attachment-assets/lang/${lang}.json`)
  )
  addStringsLoader(bitrixId, async (lang: string) => await import(`@hanzo/bitrix-assets/lang/${lang}.json`))
  addStringsLoader(boardId, async (lang: string) => await import(`@hanzo/board-assets/lang/${lang}.json`))
  addStringsLoader(calendarId, async (lang: string) => await import(`@hanzo/calendar-assets/lang/${lang}.json`))
  addStringsLoader(chunterId, async (lang: string) => await import(`@hanzo/chunter-assets/lang/${lang}.json`))
  addStringsLoader(contactId, async (lang: string) => await import(`@hanzo/contact-assets/lang/${lang}.json`))
  addStringsLoader(driveId, async (lang: string) => await import(`@hanzo/drive-assets/lang/${lang}.json`))
  addStringsLoader(gmailId, async (lang: string) => await import(`@hanzo/gmail-assets/lang/${lang}.json`))
  addStringsLoader(hrId, async (lang: string) => await import(`@hanzo/hr-assets/lang/${lang}.json`))
  addStringsLoader(
    inventoryId,
    async (lang: string) => await import(`@hanzo/inventory-assets/lang/${lang}.json`)
  )
  addStringsLoader(leadId, async (lang: string) => await import(`@hanzo/lead-assets/lang/${lang}.json`))
  addStringsLoader(loginId, async (lang: string) => await import(`@hanzo/login-assets/lang/${lang}.json`))
  addStringsLoader(
    notificationId,
    async (lang: string) => await import(`@hanzo/notification-assets/lang/${lang}.json`)
  )
  addStringsLoader(onboardId, async (lang: string) => await import(`@hanzo/onboard-assets/lang/${lang}.json`))
  addStringsLoader(
    preferenceId,
    async (lang: string) => await import(`@hanzo/preference-assets/lang/${lang}.json`)
  )
  addStringsLoader(recruitId, async (lang: string) => await import(`@hanzo/recruit-assets/lang/${lang}.json`))
  addStringsLoader(requestId, async (lang: string) => await import(`@hanzo/request-assets/lang/${lang}.json`))
  addStringsLoader(settingId, async (lang: string) => await import(`@hanzo/setting-assets/lang/${lang}.json`))
  addStringsLoader(supportId, async (lang: string) => await import(`@hanzo/support-assets/lang/${lang}.json`))
  addStringsLoader(tagsId, async (lang: string) => await import(`@hanzo/tags-assets/lang/${lang}.json`))
  addStringsLoader(taskId, async (lang: string) => await import(`@hanzo/task-assets/lang/${lang}.json`))
  addStringsLoader(telegramId, async (lang: string) => await import(`@hanzo/telegram-assets/lang/${lang}.json`))
  addStringsLoader(
    templatesId,
    async (lang: string) => await import(`@hanzo/templates-assets/lang/${lang}.json`)
  )
  addStringsLoader(trackerId, async (lang: string) => await import(`@hanzo/tracker-assets/lang/${lang}.json`))
  addStringsLoader(viewId, async (lang: string) => await import(`@hanzo/view-assets/lang/${lang}.json`))
  addStringsLoader(
    workbenchId,
    async (lang: string) => await import(`@hanzo/workbench-assets/lang/${lang}.json`)
  )

  addStringsLoader(
    desktopPreferencesId,
    async (lang: string) => await import(`@hanzo/desktop-preferences-assets/lang/${lang}.json`)
  )
  addStringsLoader(diffviewId, async (lang: string) => await import(`@hanzo/diffview-assets/lang/${lang}.json`))
  addStringsLoader(documentId, async (lang: string) => await import(`@hanzo/document-assets/lang/${lang}.json`))
  addStringsLoader(timeId, async (lang: string) => await import(`@hanzo/time-assets/lang/${lang}.json`))
  addStringsLoader(githubId, async (lang: string) => await import(`@hanzo/github-assets/lang/${lang}.json`))
  addStringsLoader(documentsId, async (lang: string) => await import(`@hanzo/controlled-documents-assets/lang/${lang}.json`))
  addStringsLoader(productsId, async (lang: string) => await import(`@hanzo/products-assets/lang/${lang}.json`))
  addStringsLoader(questionsId, async (lang: string) => await import(`@hanzo/questions-assets/lang/${lang}.json`))
  addStringsLoader(trainingId, async (lang: string) => await import(`@hanzo/training-assets/lang/${lang}.json`))
  addStringsLoader(guestId, async (lang: string) => await import(`@hanzo/guest-assets/lang/${lang}.json`))
  addStringsLoader(loveId, async (lang: string) => await import(`@hanzo/love-assets/lang/${lang}.json`))
  addStringsLoader(printId, async (lang: string) => await import(`@hanzo/print-assets/lang/${lang}.json`))
  addStringsLoader(exportId, async (lang: string) => await import(`@hanzo/export-assets/lang/${lang}.json`))
  addStringsLoader(analyticsCollectorId, async (lang: string) => await import(`@hanzo/analytics-collector-assets/lang/${lang}.json`))
  addStringsLoader(testManagementId, async (lang: string) => await import(`@hanzo/test-management-assets/lang/${lang}.json`))
  addStringsLoader(surveyId, async (lang: string) => await import(`@hanzo/survey-assets/lang/${lang}.json`))
  addStringsLoader(cardId, async (lang: string) => await import(`@hanzo/card-assets/lang/${lang}.json`))
  addStringsLoader(mailId, async (lang: string) => await import(`@hanzo/mail-assets/lang/${lang}.json`))
  addStringsLoader(chatId, async (lang: string) => await import(`@hanzo/chat-assets/lang/${lang}.json`))
  addStringsLoader(inboxId, async (lang: string) => await import(`@hanzo/inbox-assets/lang/${lang}.json`))
  addStringsLoader(processId, async (lang: string) => await import(`@hanzo/process-assets/lang/${lang}.json`))
}

export async function configurePlatform (): Promise<void> {
  configureI18n()

  const ipcMain = (window as any).electron as IPCMainExposed
  const config: Config = await ipcMain.config()
  const myBranding: Branding = await ipcMain.branding()
  // await (await fetch(devConfig? '/config-dev.json' : '/config.json')).json()
  console.log('loading configuration', config)
  console.log('loaded branding', myBranding)

  const title = myBranding.title ?? 'Huly Desktop'
  ipcMain.setTitle(title)

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.FilesURL, config.FILES_URL)
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)
  setMetadata(presentation.metadata.PreviewConfig, parsePreviewConfig(config.PREVIEW_CONFIG))
  setMetadata(presentation.metadata.UploadConfig, parseUploadConfig(config.UPLOAD_CONFIG, config.UPLOAD_URL))
  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.LinkPreviewUrl, config.LINK_PREVIEW_URL ?? '')
  setMetadata(recorder.metadata.StreamUrl, config.STREAM_URL ?? '')
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)

  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR ?? '')

  setMetadata(github.metadata.GithubApplication, config.GITHUB_APP ?? '')
  setMetadata(github.metadata.GithubClientID, config.GITHUB_CLIENTID ?? '')
  setMetadata(github.metadata.GithubURL, config.GITHUB_URL ?? '')

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.ModelVersion, config.MODEL_VERSION)
  }
  if (config.VERSION != null) {
    console.log('Minimal version requirement', config.VERSION)
    setMetadata(presentation.metadata.FrontVersion, config.VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL ?? 'http://huly.local:4020')
  setMetadata(gmail.metadata.GmailURL, config.GMAIL_URL ?? 'http://localhost:8087')
  setMetadata(calendar.metadata.CalendarServiceURL, config.CALENDAR_URL ?? 'http://localhost:8095')
  setMetadata(calendar.metadata.PublicScheduleURL, config.PUBLIC_SCHEDULE_URL)
  setMetadata(calendar.metadata.CalDavServerURL, config.CALDAV_SERVER_URL)
  setMetadata(notification.metadata.PushPublicKey, config.PUSH_PUBLIC_KEY)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true')
  setMetadata(love.metadata.ServiceEnpdoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)
  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)
  setMetadata(presence.metadata.PresenceUrl, config.PRESENCE_URL ?? '')
  setMetadata(exportPlugin.metadata.ExportUrl, config.EXPORT_URL ?? '')

  const languages = myBranding.languages !== undefined && myBranding.languages !== '' ? myBranding.languages.split(',').map((l) => l.trim()) : ['en', 'ru', 'es', 'pt', 'zh', 'fr', 'cs', 'it', 'de']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, async () => await import('@hanzo/client-resources'))
  addLocation(loginId, async () => await import('@hanzo/login-resources'))
  addLocation(onboardId, async () => await import('@hanzo/onboard-resources'))
  addLocation(workbenchId, async () => await import('@hanzo/workbench-resources'))
  addLocation(viewId, async () => await import('@hanzo/view-resources'))
  addLocation(taskId, async () => await import('@hanzo/task-resources'))
  addLocation(contactId, async () => await import('@hanzo/contact-resources'))
  addLocation(chunterId, async () => await import('@hanzo/chunter-resources'))
  addLocation(recruitId, async () => await import('@hanzo/recruit-resources'))
  addLocation(activityId, async () => await import('@hanzo/activity-resources'))
  addLocation(settingId, async () => await import('@hanzo/setting-resources'))
  addLocation(leadId, async () => await import('@hanzo/lead-resources'))
  addLocation(telegramId, async () => await import('@hanzo/telegram-resources'))
  addLocation(attachmentId, async () => await import('@hanzo/attachment-resources'))
  addLocation(gmailId, async () => await import('@hanzo/gmail-resources'))
  addLocation(imageCropperId, async () => await import('@hanzo/image-cropper-resources'))
  addLocation(inventoryId, async () => await import('@hanzo/inventory-resources'))
  addLocation(templatesId, async () => await import('@hanzo/templates-resources'))
  addLocation(notificationId, async () => await import('@hanzo/notification-resources'))
  addLocation(tagsId, async () => await import('@hanzo/tags-resources'))
  addLocation(calendarId, async () => await import('@hanzo/calendar-resources'))
  addLocation(analyticsCollectorId, async () => await import('@hanzo/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hanzo/ai-bot-resources'))

  addLocation(trackerId, async () => await import('@hanzo/tracker-resources'))
  addLocation(boardId, async () => await import('@hanzo/board-resources'))
  addLocation(hrId, async () => await import('@hanzo/hr-resources'))
  addLocation(bitrixId, async () => await import('@hanzo/bitrix-resources'))
  addLocation(requestId, async () => await import('@hanzo/request-resources'))
  addLocation(driveId, async () => await import('@hanzo/drive-resources'))
  addLocation(supportId, async () => await import('@hanzo/support-resources'))
  addLocation(diffviewId, async () => await import('@hanzo/diffview-resources'))
  addLocation(documentId, async () => await import('@hanzo/document-resources'))
  addLocation(timeId, async () => await import('@hanzo/time-resources'))
  addLocation(questionsId, async () => await import('@hanzo/questions-resources'))
  addLocation(trainingId, async () => await import('@hanzo/training-resources'))
  addLocation(productsId, async () => await import('@hanzo/products-resources'))
  addLocation(documentsId, async () => await import('@hanzo/controlled-documents-resources'))
  addLocation(uploaderId, async () => await import('@hanzo/uploader-resources'))
  addLocation(recorderId, async () => await import('@hanzo/recorder-resources'))
  addLocation(presenceId, async () => await import('@hanzo/presence-resources'))
  addLocation(githubId, async () => await import(/* webpackChunkName: "github" */ '@hanzo/github-resources'))
  addLocation(
    desktopPreferencesId,
    async () => await import(/* webpackChunkName: "desktop-preferences" */ '@hanzo/desktop-preferences-resources')
  )
  addLocation(guestId, () => import(/* webpackChunkName: "guest" */ '@hanzo/guest-resources'))
  addLocation(loveId, () => import(/* webpackChunkName: "love" */ '@hanzo/love-resources'))
  addLocation(printId, () => import(/* webpackChunkName: "print" */ '@hanzo/print-resources'))
  addLocation(exportId, () => import(/* webpackChunkName: "export" */ '@hanzo/export-resources'))
  addLocation(textEditorId, () => import(/* webpackChunkName: "text-editor" */ '@hanzo/text-editor-resources'))
  addLocation(testManagementId, () => import(/* webpackChunkName: "test-management" */ '@hanzo/test-management-resources'))
  addLocation(surveyId, () => import(/* webpackChunkName: "survey" */ '@hanzo/survey-resources'))
  addLocation(cardId, () => import(/* webpackChunkName: "card" */ '@hanzo/card-resources'))
  addLocation(chatId, () => import(/* webpackChunkName: "chat" */ '@hanzo/chat-resources'))
  addLocation(inboxId, () => import(/* webpackChunkName: "inbox" */ '@hanzo/inbox-resources'))
  addLocation(mailId, () => import(/* webpackChunkName: "card" */ '@hanzo/mail-resources'))
  addLocation(processId, () => import(/* webpackChunkName: "process" */ '@hanzo/process-resources'))

  setMetadata(client.metadata.FilterModel, 'ui')
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])

  // Use binary response transfer for faster performance and small transfer sizes.
  setMetadata(client.metadata.UseBinaryProtocol, true)
  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(uiPlugin.metadata.PlatformTitle, title)
  setMetadata(workbench.metadata.PlatformTitle, title)
  setDefaultLanguage(myBranding.defaultLanguage ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, myBranding.defaultApplication ?? 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, myBranding.defaultSpace ?? tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, myBranding.defaultSpecial ?? 'issues')

  initThemeStore()

  addEventListener(workbench.event.NotifyConnection, async () => {
    await ipcMain.setFrontCookie(
      config.FRONT_URL,
      presentation.metadata.Token.replaceAll(':', '-'),
      getMetadata(presentation.metadata.Token) ?? ''
    )
  })

  configureNotifications()

  setMetadata(setting.metadata.BackupUrl, config.BACKUP_URL ?? '')

  if (config.INITIAL_URL !== '') {
    setLocationStorageKey('uberflow_child')
  }

  const last = localStorage.getItem(locationStorageKeyId)

  if (config.INITIAL_URL !== '') {
    console.log('NAVIGATE', config.INITIAL_URL, getCurrentLocation())
    // NavigationExpandedDefault=false fills buggy:
    // — Navigator closes in unpredictable way
    // — Many sections of the have have no default central content so without
    // navigator is looks like something is broken
    // Should consifer if we want to fix this
    // setMetadata(workbench.metadata.NavigationExpandedDefault, false)
    navigate({
      path: config.INITIAL_URL.split('/')
    })
  } else if (last !== null) {
    navigate(JSON.parse(last))
  } else {
    navigate({ path: [] })
  }

  console.log('Initial location is: ', getCurrentLocation())
}
