//
// Copyright © 2022, 2023, 2025 Hardcore Engineering Inc.
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

import platform, { type Plugin, addLocation, addStringsLoader, platformId } from '@hanzo/platform'

import { activityId } from '@hanzo/activity'
import aiBot, { aiBotId } from '@hanzo/ai-bot'
import analyticsCollector, { analyticsCollectorId } from '@hanzo/analytics-collector'
import { attachmentId } from '@hanzo/attachment'
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
import love, { loveId } from '@hanzo/love'
import notification, { notificationId } from '@hanzo/notification'
import onboard, { onboardId } from '@hanzo/onboard'
import presence, { presenceId } from '@hanzo/presence'
import print, { printId } from '@hanzo/print'
import { processId } from '@hanzo/process'
import { productsId } from '@hanzo/products'
import { questionsId } from '@hanzo/questions'
import { recruitId } from '@hanzo/recruit'
import rekoni from '@hanzo/rekoni'
import { requestId } from '@hanzo/request'
import setting, { settingId } from '@hanzo/setting'
import sign from '@hanzo/sign'
import { supportId } from '@hanzo/support'
import { surveyId } from '@hanzo/survey'
import { tagsId } from '@hanzo/tags'
import { taskId } from '@hanzo/task'
import telegram, { telegramId } from '@hanzo/telegram'
import { templatesId } from '@hanzo/templates'
import { testManagementId } from '@hanzo/test-management'
import textEditor, { textEditorId } from '@hanzo/text-editor'
import { timeId } from '@hanzo/time'
import tracker, { trackerId } from '@hanzo/tracker'
import { trainingId } from '@hanzo/training'
import uiPlugin from '@hanzo/ui'
import {uiNextId} from '@hanzo/ui-next'
import { uploaderId } from '@hanzo/uploader'
import recorder, { recorderId } from '@hanzo/recorder'
import { viewId } from '@hanzo/view'
import workbench, { workbenchId } from '@hanzo/workbench'
import { mailId } from '@hanzo/mail'
import { chatId } from '@hanzo/chat'
import github, { githubId } from '@hanzo/github'
import { bitrixId } from '@hanzo/bitrix'
import {inboxId} from '@hanzo/inbox'

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
import '@hanzo/recorder-assets'
import '@hanzo/view-assets'
import '@hanzo/workbench-assets'
import '@hanzo/chat-assets'
import '@hanzo/inbox-assets'
import '@hanzo/mail-assets'
import '@hanzo/github-assets'

import { coreId } from '@hanzo/core'
import presentation, {
  loadServerConfig,
  parsePreviewConfig,
  parseUploadConfig,
  presentationId
} from '@hanzo/presentation'

import { setMetadata } from '@hanzo/platform'
import { initThemeStore, setDefaultLanguage } from '@hanzo/theme'

import { preferenceId } from '@hanzo/preference'
import { uiId } from '@hanzo/ui/src/plugin'
import { configureAnalytics } from './analytics'

export interface Config {
  ACCOUNTS_URL: string
  UPLOAD_URL: string
  FILES_URL: string
  MODEL_VERSION: string
  VERSION: string
  COLLABORATOR_URL: string
  COLLABORATOR?: string
  REKONI_URL: string
  TELEGRAM_URL: string
  GMAIL_URL: string
  CALENDAR_URL: string
  PUSH_PUBLIC_KEY: string
  APP_PROTOCOL?: string
  GITHUB_APP?: string
  GITHUB_CLIENTID?: string
  GITHUB_URL: string
  SENTRY_DSN?: string
  LOVE_ENDPOINT?: string
  LIVEKIT_WS?: string
  SIGN_URL?: string
  PRINT_URL?: string
  POSTHOG_API_KEY?: string
  POSTHOG_HOST?: string
  ANALYTICS_COLLECTOR_URL?: string
  BRANDING_URL?: string
  TELEGRAM_BOT_URL?: string
  AI_URL?: string
  DISABLE_SIGNUP?: string
  LINK_PREVIEW_URL?: string
  PASSWORD_STRICTNESS?: 'very_strict' | 'strict' | 'normal' | 'none'
  // Could be defined for dev environment
  FRONT_URL?: string
  PREVIEW_CONFIG?: string
  UPLOAD_CONFIG?: string
  STATS_URL?: string
  PRESENCE_URL?: string
  USE_BINARY_PROTOCOL?: boolean
  TRANSACTOR_OVERRIDE?: string
  BACKUP_URL?: string
  STREAM_URL?: string
  PUBLIC_SCHEDULE_URL?: string
  CALDAV_SERVER_URL?: string
  EXPORT_URL?: string
}

export interface Branding {
  title?: string
  links?: {
    rel: string
    href: string
    type?: string
    sizes?: string
  }[]
  languages?: string
  lastNameFirst?: string
  defaultLanguage?: string
  defaultApplication?: string
  defaultSpace?: string
  defaultSpecial?: string
  initWorkspace?: string
}

export type BrandingMap = Record<string, Branding>

const clientType = process.env.CLIENT_TYPE
const configs: Record<string, string> = {
  'dev-production': '/config-dev.json',
  'dev-huly': '/config-huly.json',
  'dev-bold': '/config.json',
  'dev-server': '/config.json',
  'dev-server-test': '/config-test.json',
  'dev-worker': '/config-worker.json',
  'dev-worker-local': '/config-worker-local.json'
}

const PASSWORD_REQUIREMENTS: Record<Config['PASSWORD_STRICTNESS'], Record<string, number>> = {
  very_strict: {
    MinDigits: 4,
    MinLength: 32,
    MinLowerChars: 4,
    MinSpecialChars: 4,
    MinUpperChars: 4
  },
  strict: {
    MinDigits: 2,
    MinLength: 16,
    MinLowerChars: 2,
    MinSpecialChars: 2,
    MinUpperChars: 2
  },
  normal: {
    MinDigits: 1,
    MinLength: 8,
    MinLowerChars: 1,
    MinSpecialChars: 1,
    MinUpperChars: 1
  },
  none: {
    MinDigits: 0,
    MinLength: 0,
    MinLowerChars: 0,
    MinSpecialChars: 0,
    MinUpperChars: 0
  }
}

function configureI18n(): void {
  //Add localization
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
  addStringsLoader(
    textEditorId,
    async (lang: string) => await import(`@hanzo/text-editor-assets/lang/${lang}.json`)
  )
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
  addStringsLoader(
    documentsId,
    async (lang: string) => await import(`@hanzo/controlled-documents-assets/lang/${lang}.json`)
  )
  addStringsLoader(productsId, async (lang: string) => await import(`@hanzo/products-assets/lang/${lang}.json`))
  addStringsLoader(
    questionsId,
    async (lang: string) => await import(`@hanzo/questions-assets/lang/${lang}.json`)
  )
  addStringsLoader(trainingId, async (lang: string) => await import(`@hanzo/training-assets/lang/${lang}.json`))
  addStringsLoader(guestId, async (lang: string) => await import(`@hanzo/guest-assets/lang/${lang}.json`))
  addStringsLoader(loveId, async (lang: string) => await import(`@hanzo/love-assets/lang/${lang}.json`))
  addStringsLoader(printId, async (lang: string) => await import(`@hanzo/print-assets/lang/${lang}.json`))
  addStringsLoader(exportId, async (lang: string) => await import(`@hanzo/export-assets/lang/${lang}.json`))
  addStringsLoader(
    analyticsCollectorId,
    async (lang: string) => await import(`@hanzo/analytics-collector-assets/lang/${lang}.json`)
  )
  addStringsLoader(
    testManagementId,
    async (lang: string) => await import(`@hanzo/test-management-assets/lang/${lang}.json`)
  )
  addStringsLoader(surveyId, async (lang: string) => await import(`@hanzo/survey-assets/lang/${lang}.json`))
  addStringsLoader(cardId, async (lang: string) => await import(`@hanzo/card-assets/lang/${lang}.json`))
  addStringsLoader(mailId, async (lang: string) => await import(`@hanzo/mail-assets/lang/${lang}.json`))
  addStringsLoader(chatId, async (lang: string) => await import(`@hanzo/chat-assets/lang/${lang}.json`))
  addStringsLoader(processId, async (lang: string) => await import(`@hanzo/process-assets/lang/${lang}.json`))
  addStringsLoader(inboxId, async (lang: string) => await import(`@hanzo/inbox-assets/lang/${lang}.json`))
}

export async function configurePlatform() {
  setMetadata(platform.metadata.LoadHelper, async (loader) => {
    for (let i = 0; i < 5; i++) {
      try {
        return loader()
      } catch (err: any) {
        if (err.message.includes('Loading chunk') && i != 4) {
          continue
        }
        location.reload()
      }
    }
  })
  configureI18n()

  const config: Config = await loadServerConfig(configs[clientType] ?? '/config.json')
  const branding: BrandingMap =
    config.BRANDING_URL !== undefined ? await (await fetch(config.BRANDING_URL, { keepalive: true })).json() : {}
  const myBranding = branding[window.location.host] ?? {}

  console.log('loading configuration', config)
  console.log('loaded branding', myBranding)

  const title = myBranding.title ?? 'Platform'

  // apply branding
  window.document.title = title

  const links = myBranding.links ?? []
  if (links.length > 0) {
    // remove the default favicon
    // it's only needed for Safari which cannot use dynamically added links for favicons
    document.getElementById('default-favicon')?.remove()

    for (const link of links) {
      const htmlLink = document.createElement('link')
      htmlLink.rel = link.rel
      htmlLink.href = link.href

      if (link.type !== undefined) {
        htmlLink.type = link.type
      }

      if (link.sizes !== undefined) {
        htmlLink.setAttribute('sizes', link.sizes)
      }

      document.head.appendChild(htmlLink)
    }
  }

  configureAnalytics(config)
  // tryOpenInDesktopApp(config.APP_PROTOCOL ?? 'huly://')

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')

  setMetadata(login.metadata.PasswordValidations, PASSWORD_REQUIREMENTS[config.PASSWORD_STRICTNESS ?? 'none'])

  setMetadata(presentation.metadata.FilesURL, config.FILES_URL)
  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)

  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.PreviewConfig, parsePreviewConfig(config.PREVIEW_CONFIG))
  setMetadata(presentation.metadata.UploadConfig, parseUploadConfig(config.UPLOAD_CONFIG, config.UPLOAD_URL))
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)
  setMetadata(presentation.metadata.LinkPreviewUrl, config.LINK_PREVIEW_URL)
  setMetadata(recorder.metadata.StreamUrl, config.STREAM_URL)
  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR)

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
  setMetadata(analyticsCollector.metadata.EndpointURL, config.ANALYTICS_COLLECTOR_URL)
  setMetadata(aiBot.metadata.EndpointURL, config.AI_URL)

  setMetadata(github.metadata.GithubApplication, config.GITHUB_APP ?? '')
  setMetadata(github.metadata.GithubClientID, config.GITHUB_CLIENTID ?? '')
  setMetadata(github.metadata.GithubURL, config.GITHUB_URL)

  setMetadata(rekoni.metadata.RekoniUrl, config.REKONI_URL)

  setMetadata(uiPlugin.metadata.DefaultApplication, login.component.LoginApp)
  setMetadata(contactPlugin.metadata.LastNameFirst, myBranding.lastNameFirst === 'true')
  setMetadata(love.metadata.ServiceEnpdoint, config.LOVE_ENDPOINT)
  setMetadata(love.metadata.WebSocketURL, config.LIVEKIT_WS)
  setMetadata(print.metadata.PrintURL, config.PRINT_URL)
  setMetadata(sign.metadata.SignURL, config.SIGN_URL)
  setMetadata(presence.metadata.PresenceUrl, config.PRESENCE_URL ?? '')
  setMetadata(exportPlugin.metadata.ExportUrl, config.EXPORT_URL ?? '')

  const languages = myBranding.languages
    ? (myBranding.languages as string).split(',').map((l) => l.trim())
    : ['en', 'ru', 'es', 'pt', 'zh', 'fr', 'cs', 'it', 'de']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [githubId, github.component.ConnectApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, () => import(/* webpackChunkName: "client" */ '@hanzo/client-resources'))
  addLocation(loginId, () => import(/* webpackChunkName: "login" */ '@hanzo/login-resources'))
  addLocation(onboardId, () => import(/* webpackChunkName: "onboard" */ '@hanzo/onboard-resources'))
  addLocation(workbenchId, () => import(/* webpackChunkName: "workbench" */ '@hanzo/workbench-resources'))
  addLocation(viewId, () => import(/* webpackChunkName: "view" */ '@hanzo/view-resources'))
  addLocation(taskId, () => import(/* webpackChunkName: "task" */ '@hanzo/task-resources'))
  addLocation(contactId, () => import(/* webpackChunkName: "contact" */ '@hanzo/contact-resources'))
  addLocation(chunterId, () => import(/* webpackChunkName: "chunter" */ '@hanzo/chunter-resources'))
  addLocation(recruitId, () => import(/* webpackChunkName: "recruit" */ '@hanzo/recruit-resources'))
  addLocation(activityId, () => import(/*webpackChunkName: "activity" */ '@hanzo/activity-resources'))
  addLocation(settingId, () => import(/* webpackChunkName: "setting" */ '@hanzo/setting-resources'))
  addLocation(leadId, () => import(/* webpackChunkName: "lead" */ '@hanzo/lead-resources'))
  addLocation(telegramId, () => import(/* webpackChunkName: "telegram" */ '@hanzo/telegram-resources'))
  addLocation(attachmentId, () => import(/* webpackChunkName: "attachment" */ '@hanzo/attachment-resources'))
  addLocation(gmailId, () => import(/* webpackChunkName: "gmail" */ '@hanzo/gmail-resources'))
  addLocation(
    imageCropperId,
    () => import(/* webpackChunkName: "image-cropper" */ '@hanzo/image-cropper-resources')
  )
  addLocation(inventoryId, () => import(/* webpackChunkName: "inventory" */ '@hanzo/inventory-resources'))
  addLocation(templatesId, () => import(/* webpackChunkName: "templates" */ '@hanzo/templates-resources'))
  addLocation(
    notificationId,
    () => import(/* webpackChunkName: "notification" */ '@hanzo/notification-resources')
  )
  addLocation(tagsId, () => import(/* webpackChunkName: "tags" */ '@hanzo/tags-resources'))
  addLocation(calendarId, () => import(/* webpackChunkName: "calendar" */ '@hanzo/calendar-resources'))
  addLocation(diffviewId, () => import(/* webpackChunkName: "diffview" */ '@hanzo/diffview-resources'))
  addLocation(timeId, () => import(/* webpackChunkName: "time" */ '@hanzo/time-resources'))
  addLocation(
    desktopPreferencesId,
    () => import(/* webpackChunkName: "desktop-preferences" */ '@hanzo/desktop-preferences-resources')
  )
  addLocation(analyticsCollectorId, async () => await import('@hanzo/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hanzo/ai-bot-resources'))

  addLocation(trackerId, () => import(/* webpackChunkName: "tracker" */ '@hanzo/tracker-resources'))
  addLocation(boardId, () => import(/* webpackChunkName: "board" */ '@hanzo/board-resources'))
  addLocation(hrId, () => import(/* webpackChunkName: "hr" */ '@hanzo/hr-resources'))
  addLocation(bitrixId, () => import(/* webpackChunkName: "bitrix" */ '@hanzo/bitrix-resources'))
  addLocation(requestId, () => import(/* webpackChunkName: "request" */ '@hanzo/request-resources'))
  addLocation(driveId, () => import(/* webpackChunkName: "drive" */ '@hanzo/drive-resources'))
  addLocation(supportId, () => import(/* webpackChunkName: "support" */ '@hanzo/support-resources'))

  addLocation(documentId, () => import(/* webpackChunkName: "document" */ '@hanzo/document-resources'))
  addLocation(githubId, () => import(/* webpackChunkName: "github" */ '@hanzo/github-resources'))
  addLocation(questionsId, () => import(/* webpackChunkName: "training" */ '@hanzo/questions-resources'))
  addLocation(trainingId, () => import(/* webpackChunkName: "training" */ '@hanzo/training-resources'))
  addLocation(productsId, () => import(/* webpackChunkName: "products" */ '@hanzo/products-resources'))
  addLocation(
    documentsId,
    () => import(/* webpackChunkName: "documents" */ '@hanzo/controlled-documents-resources')
  )
  addLocation(guestId, () => import(/* webpackChunkName: "guest" */ '@hanzo/guest-resources'))
  addLocation(loveId, () => import(/* webpackChunkName: "love" */ '@hanzo/love-resources'))
  addLocation(printId, () => import(/* webpackChunkName: "print" */ '@hanzo/print-resources'))
  addLocation(exportId, () => import(/* webpackChunkName: "export" */ '@hanzo/export-resources'))
  addLocation(textEditorId, () => import(/* webpackChunkName: "text-editor" */ '@hanzo/text-editor-resources'))
  addLocation(uploaderId, () => import(/* webpackChunkName: "uploader" */ '@hanzo/uploader-resources'))
  addLocation(recorderId, () => import(/* webpackChunkName: "recorder" */ '@hanzo/recorder-resources'))
  
  addLocation(
    testManagementId,
    () => import(/* webpackChunkName: "test-management" */ '@hanzo/test-management-resources')
  )
  addLocation(surveyId, () => import(/* webpackChunkName: "survey" */ '@hanzo/survey-resources'))
  addLocation(presenceId, () => import(/* webpackChunkName: "presence" */ '@hanzo/presence-resources'))
  addLocation(cardId, () => import(/* webpackChunkName: "card" */ '@hanzo/card-resources'))
  addLocation(mailId, () => import(/* webpackChunkName: "card" */ '@hanzo/mail-resources'))
  addLocation(chatId, () => import(/* webpackChunkName: "chat" */ '@hanzo/chat-resources'))
  addLocation(processId, () => import(/* webpackChunkName: "process" */ '@hanzo/process-resources'))
  addLocation(inboxId, () => import(/* webpackChunkName: "inbox" */ '@hanzo/inbox-resources'))

  setMetadata(client.metadata.FilterModel, 'ui')
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])
  setMetadata(login.metadata.TransactorOverride, config.TRANSACTOR_OVERRIDE)

  // Use binary response transfer for faster performance and small transfer sizes.
  const binaryOverride = localStorage.getItem(client.metadata.UseBinaryProtocol)
  setMetadata(
    client.metadata.UseBinaryProtocol,
    binaryOverride != null ? binaryOverride === 'true' : config.USE_BINARY_PROTOCOL ?? true
  )

  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(uiPlugin.metadata.PlatformTitle, title)
  setMetadata(workbench.metadata.PlatformTitle, title)
  setDefaultLanguage(myBranding.defaultLanguage ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, myBranding.defaultApplication ?? 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, myBranding.defaultSpace ?? tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, myBranding.defaultSpecial ?? 'issues')

  setMetadata(setting.metadata.BackupUrl, config.BACKUP_URL ?? '')

  initThemeStore()
}
