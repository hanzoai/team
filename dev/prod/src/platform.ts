//
// Copyright © 2022, 2023, 2025 Hanzo AI Inc.
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

import platform, { type Plugin, addLocation, addStringsLoader, platformId } from '@hanzoteam/platform'

import { activityId } from '@hanzoteam/activity'
import aiBot, { aiBotId } from '@hanzoteam/ai-bot'
import analyticsCollector, { analyticsCollectorId } from '@hanzoteam/analytics-collector'
import { attachmentId } from '@hanzoteam/attachment'
import { boardId } from '@hanzoteam/board'
import calendar, { calendarId } from '@hanzoteam/calendar'
import { cardId } from '@hanzoteam/card'
import { chunterId } from '@hanzoteam/chunter'
import client, { clientId } from '@hanzoteam/client'
import contactPlugin, { contactId } from '@hanzoteam/contact'
import { converterId } from '@hanzoteam/converter'
import { documentsId } from '@hanzoteam/controlled-documents'
import { desktopPreferencesId } from '@hanzoteam/desktop-preferences'
import { diffviewId } from '@hanzoteam/diffview'
import { documentId } from '@hanzoteam/document'
import { driveId } from '@hanzoteam/drive'
import exportPlugin, { exportId } from '@hanzoteam/export'
import gmail, { gmailId } from '@hanzoteam/gmail'
import globalProfile, { globalProfileId, globalProfileRoute } from '@hanzoteam/global-profile'
import guest, { guestId } from '@hanzoteam/guest'
import { hrId } from '@hanzoteam/hr'
import { imageCropperId } from '@hanzoteam/image-cropper'
import { inventoryId } from '@hanzoteam/inventory'
import { leadId } from '@hanzoteam/lead'
import login, { loginId } from '@hanzoteam/login'
import love, { loveId } from '@hanzoteam/love'
import notification, { notificationId } from '@hanzoteam/notification'
import onboard, { onboardId } from '@hanzoteam/onboard'
import presence, { presenceId } from '@hanzoteam/presence'
import print, { printId } from '@hanzoteam/print'
import { processId } from '@hanzoteam/process'
import { productsId } from '@hanzoteam/products'
import { questionsId } from '@hanzoteam/questions'
import { recruitId } from '@hanzoteam/recruit'
import rekoni from '@hanzoteam/rekoni'
import { requestId } from '@hanzoteam/request'
import setting, { settingId } from '@hanzoteam/setting'
import sign from '@hanzoteam/sign'
import support, { supportId, supportLink, reportBugLink, docsLink, privacyPolicyLink } from '@hanzoteam/support'
import { surveyId } from '@hanzoteam/survey'
import { tagsId } from '@hanzoteam/tags'
import { taskId } from '@hanzoteam/task'
import telegram, { telegramId } from '@hanzoteam/telegram'
import { templatesId } from '@hanzoteam/templates'
import { testManagementId } from '@hanzoteam/test-management'
import textEditor, { textEditorId } from '@hanzoteam/text-editor'
import { timeId } from '@hanzoteam/time'
import tracker, { trackerId } from '@hanzoteam/tracker'
import { trainingId } from '@hanzoteam/training'
import uiPlugin from '@hanzoteam/ui'
import { uploaderId } from '@hanzoteam/uploader'
import { mediaId } from '@hanzoteam/media'
import recorder, { recorderId } from '@hanzoteam/recorder'
import { viewId } from '@hanzoteam/view'
import workbench, { workbenchId } from '@hanzoteam/workbench'
import { mailId } from '@hanzoteam/mail'
import { chatId } from '@hanzoteam/chat'
import github, { githubId } from '@hanzoteam/github'
import { bitrixId } from '@hanzoteam/bitrix'
import { inboxId } from '@hanzoteam/inbox'
import { achievementId } from '@hanzoteam/achievement'
import communication, { communicationId } from '@hanzoteam/communication'
import { emojiId } from '@hanzoteam/emoji'
import billingPlugin, { billingId } from '@hanzoteam/billing'
import { hanzoMailId } from '@hanzoteam/hanzo-mail'
import { aiAssistantId } from '@hanzoteam/ai-assistant'
import { ratingId } from '@hanzoteam/rating'

import '@hanzoteam/activity-assets'
import '@hanzoteam/analytics-collector-assets'
import '@hanzoteam/attachment-assets'
import '@hanzoteam/bitrix-assets'
import '@hanzoteam/board-assets'
import '@hanzoteam/calendar-assets'
import '@hanzoteam/card-assets'
import '@hanzoteam/chunter-assets'
import '@hanzoteam/contact-assets'
import '@hanzoteam/controlled-documents-assets'
import '@hanzoteam/desktop-preferences-assets'
import '@hanzoteam/diffview-assets'
import '@hanzoteam/document-assets'
import '@hanzoteam/drive-assets'
import '@hanzoteam/export-assets'
import '@hanzoteam/gmail-assets'
import '@hanzoteam/guest-assets'
import '@hanzoteam/global-profile-assets'
import '@hanzoteam/hr-assets'
import '@hanzoteam/inventory-assets'
import '@hanzoteam/lead-assets'
import '@hanzoteam/login-assets'
import '@hanzoteam/love-assets'
import '@hanzoteam/notification-assets'
import '@hanzoteam/preference-assets'
import '@hanzoteam/print-assets'
import '@hanzoteam/process-assets'
import '@hanzoteam/products-assets'
import '@hanzoteam/questions-assets'
import '@hanzoteam/recruit-assets'
import '@hanzoteam/request-assets'
import '@hanzoteam/setting-assets'
import '@hanzoteam/support-assets'
import '@hanzoteam/survey-assets'
import '@hanzoteam/tags-assets'
import '@hanzoteam/task-assets'
import '@hanzoteam/telegram-assets'
import '@hanzoteam/templates-assets'
import '@hanzoteam/test-management-assets'
import '@hanzoteam/text-editor-assets'
import '@hanzoteam/time-assets'
import '@hanzoteam/tracker-assets'
import '@hanzoteam/training-assets'
import '@hanzoteam/uploader-assets'
import '@hanzoteam/recorder-assets'
import '@hanzoteam/media-assets'
import '@hanzoteam/view-assets'
import '@hanzoteam/workbench-assets'
import '@hanzoteam/chat-assets'
import '@hanzoteam/inbox-assets'
import '@hanzoteam/mail-assets'
import '@hanzoteam/github-assets'
import '@hanzoteam/achievement-assets'
import '@hanzoteam/communication-assets'
import '@hanzoteam/emoji-assets'
import '@hanzoteam/billing-assets'
import '@hanzoteam/hanzo-mail-assets'
import '@hanzoteam/ai-assistant-assets'
import '@hanzoteam/rating-assets'

import { coreId } from '@hanzoteam/core'
import presentation, { loadServerConfig, createFileStorage, presentationId } from '@hanzoteam/presentation'

import { setMetadata } from '@hanzoteam/platform'
import { initThemeStore, setDefaultLanguage } from '@hanzoteam/theme'

import { preferenceId } from '@hanzoteam/preference'
import { uiId } from '@hanzoteam/ui/src/plugin'
import { configureAnalytics } from './analytics'

export interface Config {
  ACCOUNTS_URL: string
  UPLOAD_URL: string
  FILES_URL: string
  DATALAKE_URL?: string
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
  LOVE_ENDPOINT?: string
  LIVEKIT_WS?: string
  SIGN_URL?: string
  PRINT_URL?: string
  ANALYTICS_COLLECTOR_URL?: string
  BRANDING_URL?: string
  TELEGRAM_BOT_URL?: string
  AI_URL?: string
  DISABLE_SIGNUP?: string
  HIDE_LOCAL_LOGIN?: string
  LINK_PREVIEW_URL?: string
  PASSWORD_STRICTNESS?: 'very_strict' | 'strict' | 'normal' | 'none'
  // Could be defined for dev environment
  FRONT_URL?: string
  PREVIEW_URL?: string
  STATS_URL?: string
  PRESENCE_URL?: string
  USE_BINARY_PROTOCOL?: boolean
  TRANSACTOR_OVERRIDE?: string
  BACKUP_URL?: string
  STREAM_URL?: string
  PUBLIC_SCHEDULE_URL?: string
  CALDAV_SERVER_URL?: string
  EXPORT_URL?: string
  MAIL_URL?: string
  COMMUNICATION_API_ENABLED?: string
  BILLING_URL?: string
  PAYMENT_URL?: string
  EXCLUDED_APPLICATIONS_FOR_ANONYMOUS?: string
  PULSE_URL?: string
  HANZOLAKE_URL?: string
  DISABLED_FEATURES?: string
  SIGNUP_URL?: string
}

export interface Branding {
  title?: string
  links?: Array<{
    rel: string
    href: string
    type?: string
    sizes?: string
  }>
  support?: {
    supportLink?: string
    reportBugLink?: string
    docsLink?: string
    privacyPolicyLink?: string
  }
  languages?: string
  lastNameFirst?: string
  defaultLanguage?: string
  defaultApplication?: string
  defaultSpace?: string
  defaultSpecial?: string
  initWorkspace?: string
  defaultInviteRole?: string
  inviteLinkGeneratorRoles?: string[]
}

export type BrandingMap = Record<string, Branding>

const clientType = process.env.CLIENT_TYPE
const configs: Record<string, string> = {
  'dev-production': '/config-dev.json',
  'dev-hanzo': '/config-hanzo.json',
  'dev-bold': '/config.json',
  'dev-server': '/config.json',
  'dev-server-test': '/config-test.json',
  'dev-worker': '/config-worker.json',
  'dev-worker-local': '/config-worker-local.json'
}

const PASSWORD_REQUIREMENTS: Record<NonNullable<Config['PASSWORD_STRICTNESS']>, Record<string, number>> = {
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
  // Add localization
  addStringsLoader(
    platformId,
    async (lang: string) =>
      await import(
        /* webpackInclude: /\.json$/ */
        /* webpackMode: "lazy" */
        /* webpackChunkName: "lang-[request]" */
        `@hanzoteam/platform/lang/${lang}.json`
      )
  )
  addStringsLoader(
    coreId,
    async (lang: string) =>
      await import(
        /* webpackInclude: /\.json$/ */
        /* webpackMode: "lazy" */
        /* webpackChunkName: "lang-[request]" */
        `@hanzoteam/core/lang/${lang}.json`
      )
  )
  addStringsLoader(
    presentationId,
    async (lang: string) => await import(`@hanzoteam/presentation/lang/${lang}.json`)
  )
  addStringsLoader(
    textEditorId,
    async (lang: string) => await import(`@hanzoteam/text-editor-assets/lang/${lang}.json`)
  )
  addStringsLoader(uiId, async (lang: string) => await import(`@hanzoteam/ui/lang/${lang}.json`))
  addStringsLoader(uploaderId, async (lang: string) => await import(`@hanzoteam/uploader-assets/lang/${lang}.json`))
  addStringsLoader(recorderId, async (lang: string) => await import(`@hanzoteam/recorder-assets/lang/${lang}.json`))
  addStringsLoader(mediaId, async (lang: string) => await import(`@hanzoteam/media-assets/lang/${lang}.json`))
  addStringsLoader(activityId, async (lang: string) => await import(`@hanzoteam/activity-assets/lang/${lang}.json`))
  addStringsLoader(
    attachmentId,
    async (lang: string) => await import(`@hanzoteam/attachment-assets/lang/${lang}.json`)
  )
  addStringsLoader(bitrixId, async (lang: string) => await import(`@hanzoteam/bitrix-assets/lang/${lang}.json`))
  addStringsLoader(boardId, async (lang: string) => await import(`@hanzoteam/board-assets/lang/${lang}.json`))
  addStringsLoader(calendarId, async (lang: string) => await import(`@hanzoteam/calendar-assets/lang/${lang}.json`))
  addStringsLoader(chunterId, async (lang: string) => await import(`@hanzoteam/chunter-assets/lang/${lang}.json`))
  addStringsLoader(contactId, async (lang: string) => await import(`@hanzoteam/contact-assets/lang/${lang}.json`))
  addStringsLoader(driveId, async (lang: string) => await import(`@hanzoteam/drive-assets/lang/${lang}.json`))
  addStringsLoader(gmailId, async (lang: string) => await import(`@hanzoteam/gmail-assets/lang/${lang}.json`))
  addStringsLoader(hrId, async (lang: string) => await import(`@hanzoteam/hr-assets/lang/${lang}.json`))
  addStringsLoader(
    inventoryId,
    async (lang: string) => await import(`@hanzoteam/inventory-assets/lang/${lang}.json`)
  )
  addStringsLoader(leadId, async (lang: string) => await import(`@hanzoteam/lead-assets/lang/${lang}.json`))
  addStringsLoader(loginId, async (lang: string) => await import(`@hanzoteam/login-assets/lang/${lang}.json`))
  addStringsLoader(
    notificationId,
    async (lang: string) => await import(`@hanzoteam/notification-assets/lang/${lang}.json`)
  )
  addStringsLoader(onboardId, async (lang: string) => await import(`@hanzoteam/onboard-assets/lang/${lang}.json`))
  addStringsLoader(
    preferenceId,
    async (lang: string) => await import(`@hanzoteam/preference-assets/lang/${lang}.json`)
  )
  addStringsLoader(recruitId, async (lang: string) => await import(`@hanzoteam/recruit-assets/lang/${lang}.json`))
  addStringsLoader(requestId, async (lang: string) => await import(`@hanzoteam/request-assets/lang/${lang}.json`))
  addStringsLoader(settingId, async (lang: string) => await import(`@hanzoteam/setting-assets/lang/${lang}.json`))
  addStringsLoader(supportId, async (lang: string) => await import(`@hanzoteam/support-assets/lang/${lang}.json`))
  addStringsLoader(tagsId, async (lang: string) => await import(`@hanzoteam/tags-assets/lang/${lang}.json`))
  addStringsLoader(taskId, async (lang: string) => await import(`@hanzoteam/task-assets/lang/${lang}.json`))
  addStringsLoader(telegramId, async (lang: string) => await import(`@hanzoteam/telegram-assets/lang/${lang}.json`))
  addStringsLoader(
    templatesId,
    async (lang: string) => await import(`@hanzoteam/templates-assets/lang/${lang}.json`)
  )
  addStringsLoader(trackerId, async (lang: string) => await import(`@hanzoteam/tracker-assets/lang/${lang}.json`))
  addStringsLoader(viewId, async (lang: string) => await import(`@hanzoteam/view-assets/lang/${lang}.json`))
  addStringsLoader(
    workbenchId,
    async (lang: string) => await import(`@hanzoteam/workbench-assets/lang/${lang}.json`)
  )

  addStringsLoader(
    desktopPreferencesId,
    async (lang: string) => await import(`@hanzoteam/desktop-preferences-assets/lang/${lang}.json`)
  )
  addStringsLoader(diffviewId, async (lang: string) => await import(`@hanzoteam/diffview-assets/lang/${lang}.json`))
  addStringsLoader(documentId, async (lang: string) => await import(`@hanzoteam/document-assets/lang/${lang}.json`))
  addStringsLoader(timeId, async (lang: string) => await import(`@hanzoteam/time-assets/lang/${lang}.json`))
  addStringsLoader(githubId, async (lang: string) => await import(`@hanzoteam/github-assets/lang/${lang}.json`))
  addStringsLoader(
    documentsId,
    async (lang: string) => await import(`@hanzoteam/controlled-documents-assets/lang/${lang}.json`)
  )
  addStringsLoader(productsId, async (lang: string) => await import(`@hanzoteam/products-assets/lang/${lang}.json`))
  addStringsLoader(
    questionsId,
    async (lang: string) => await import(`@hanzoteam/questions-assets/lang/${lang}.json`)
  )
  addStringsLoader(trainingId, async (lang: string) => await import(`@hanzoteam/training-assets/lang/${lang}.json`))
  addStringsLoader(guestId, async (lang: string) => await import(`@hanzoteam/guest-assets/lang/${lang}.json`))
  addStringsLoader(
    globalProfileId,
    async (lang: string) => await import(`@hanzoteam/global-profile-assets/lang/${lang}.json`)
  )
  addStringsLoader(loveId, async (lang: string) => await import(`@hanzoteam/love-assets/lang/${lang}.json`))
  addStringsLoader(printId, async (lang: string) => await import(`@hanzoteam/print-assets/lang/${lang}.json`))
  addStringsLoader(exportId, async (lang: string) => await import(`@hanzoteam/export-assets/lang/${lang}.json`))
  addStringsLoader(
    analyticsCollectorId,
    async (lang: string) => await import(`@hanzoteam/analytics-collector-assets/lang/${lang}.json`)
  )
  addStringsLoader(
    testManagementId,
    async (lang: string) => await import(`@hanzoteam/test-management-assets/lang/${lang}.json`)
  )
  addStringsLoader(surveyId, async (lang: string) => await import(`@hanzoteam/survey-assets/lang/${lang}.json`))
  addStringsLoader(cardId, async (lang: string) => await import(`@hanzoteam/card-assets/lang/${lang}.json`))
  addStringsLoader(mailId, async (lang: string) => await import(`@hanzoteam/mail-assets/lang/${lang}.json`))
  addStringsLoader(chatId, async (lang: string) => await import(`@hanzoteam/chat-assets/lang/${lang}.json`))
  addStringsLoader(processId, async (lang: string) => await import(`@hanzoteam/process-assets/lang/${lang}.json`))
  addStringsLoader(
    achievementId,
    async (lang: string) => await import(`@hanzoteam/achievement-assets/lang/${lang}.json`)
  )
  addStringsLoader(
    communicationId,
    async (lang: string) => await import(`@hanzoteam/communication-assets/lang/${lang}.json`)
  )
  addStringsLoader(inboxId, async (lang: string) => await import(`@hanzoteam/inbox-assets/lang/${lang}.json`))
  addStringsLoader(emojiId, async (lang: string) => await import(`@hanzoteam/emoji-assets/lang/${lang}.json`))
  addStringsLoader(billingId, async (lang: string) => await import(`@hanzoteam/billing-assets/lang/${lang}.json`))
  addStringsLoader(
    hanzoMailId,
    async (lang: string) => await import(`@hanzoteam/hanzo-mail-assets/lang/${lang}.json`)
  )
  addStringsLoader(
    aiAssistantId,
    async (lang: string) => await import(`@hanzoteam/ai-assistant-assets/lang/${lang}.json`)
  )
  addStringsLoader(ratingId, async (lang: string) => await import(`@hanzoteam/rating-assets/lang/${lang}.json`))
}

export async function configurePlatform() {
  setMetadata(platform.metadata.LoadHelper, async (loader) => {
    for (let i = 0; i < 5; i++) {
      try {
        return await loader()
      } catch (err: any) {
        if (err.message.includes('Loading chunk') && i != 4) {
          continue
        }
        console.log('reload due to loading error')
        location.reload()
      }
    }
  })
  configureI18n()

  const config: Config = await loadServerConfig(configs[clientType ?? ''] ?? '/config.json')
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
  // tryOpenInDesktopApp(config.APP_PROTOCOL ?? 'hanzo://')

  setMetadata(login.metadata.AccountsUrl, config.ACCOUNTS_URL)
  setMetadata(login.metadata.DisableSignUp, config.DISABLE_SIGNUP === 'true')
  setMetadata(login.metadata.HideLocalLogin, config.HIDE_LOCAL_LOGIN === 'true')

  setMetadata(login.metadata.PasswordValidations, PASSWORD_REQUIREMENTS[config.PASSWORD_STRICTNESS ?? 'none'])

  setMetadata(presentation.metadata.UploadURL, config.UPLOAD_URL)
  setMetadata(presentation.metadata.DatalakeUrl, config.DATALAKE_URL)
  setMetadata(
    presentation.metadata.FileStorage,
    createFileStorage(config.UPLOAD_URL, config.DATALAKE_URL, config.HANZOLAKE_URL)
  )
  setMetadata(presentation.metadata.CollaboratorUrl, config.COLLABORATOR_URL)

  setMetadata(presentation.metadata.FrontUrl, config.FRONT_URL)
  setMetadata(presentation.metadata.PreviewUrl, config.PREVIEW_URL)
  setMetadata(presentation.metadata.StatsUrl, config.STATS_URL)
  setMetadata(presentation.metadata.LinkPreviewUrl, config.LINK_PREVIEW_URL)
  setMetadata(presentation.metadata.MailUrl, config.MAIL_URL)
  setMetadata(presentation.metadata.SignupUrl, config.SIGNUP_URL ?? 'https://hanzo.team/signup')

  const disabledFeatures = (config.DISABLED_FEATURES ??'').split(',').map(it => it.trim()).filter(it => it.length > 0)
  setMetadata(presentation.metadata.DisabledFeatures, new Set(disabledFeatures))

  setMetadata(recorder.metadata.StreamUrl, config.STREAM_URL)
  setMetadata(textEditor.metadata.Collaborator, config.COLLABORATOR)
  setMetadata(communication.metadata.Enabled, config.COMMUNICATION_API_ENABLED === 'true')

  if (config.MODEL_VERSION != null) {
    console.log('Minimal Model version requirement', config.MODEL_VERSION)
    setMetadata(presentation.metadata.ModelVersion, config.MODEL_VERSION)
  }
  if (config.VERSION != null) {
    console.log('Minimal version requirement', config.VERSION)
    setMetadata(presentation.metadata.FrontVersion, config.VERSION)
  }
  setMetadata(telegram.metadata.TelegramURL, config.TELEGRAM_URL ?? 'http://localhost:8086')
  setMetadata(telegram.metadata.BotUrl, config.TELEGRAM_BOT_URL ?? 'http://hanzoai.local:4020')
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

  setMetadata(billingPlugin.metadata.BillingURL, config.BILLING_URL ?? '')
  setMetadata(presentation.metadata.PaymentUrl, config.PAYMENT_URL ?? '')

  setMetadata(presentation.metadata.PulseUrl, config.PULSE_URL)
  setMetadata(presentation.metadata.HanzolakeUrl, config.HANZOLAKE_URL ?? '')

  setMetadata(support.metadata.SupportLink, myBranding.support?.supportLink ?? supportLink)
  setMetadata(support.metadata.ReportBugLink, myBranding.support?.reportBugLink ?? reportBugLink)
  setMetadata(support.metadata.DocsLink, myBranding.support?.docsLink ?? docsLink)
  setMetadata(support.metadata.PrivacyPolicyLink, myBranding.support?.privacyPolicyLink ?? privacyPolicyLink)

  const languages = myBranding.languages
    ? myBranding.languages.split(',').map((l) => l.trim())
    : ['en', 'ru', 'es', 'pt', 'pt-br', 'zh', 'fr', 'cs', 'it', 'de', 'ja', 'tr']

  setMetadata(uiPlugin.metadata.Languages, languages)

  setMetadata(
    uiPlugin.metadata.Routes,
    new Map([
      [workbenchId, workbench.component.WorkbenchApp],
      [loginId, login.component.LoginApp],
      [onboardId, onboard.component.OnboardApp],
      [githubId, github.component.ConnectApp],
      [calendarId, calendar.component.ConnectApp],
      [guestId, guest.component.GuestApp],
      [globalProfileRoute, globalProfile.component.GlobalProfileApp]
    ])
  )

  addLocation(coreId, async () => ({ default: async () => ({}) }))
  addLocation(presentationId, async () => ({ default: async () => ({}) }))

  addLocation(clientId, async () => await import(/* webpackChunkName: "client" */ '@hanzoteam/client-resources'))
  addLocation(loginId, async () => await import(/* webpackChunkName: "login" */ '@hanzoteam/login-resources'))
  addLocation(onboardId, async () => await import(/* webpackChunkName: "onboard" */ '@hanzoteam/onboard-resources'))
  addLocation(
    workbenchId,
    async () => await import(/* webpackChunkName: "workbench" */ '@hanzoteam/workbench-resources')
  )
  addLocation(viewId, async () => await import(/* webpackChunkName: "view" */ '@hanzoteam/view-resources'))
  addLocation(converterId, async () => await import(/* webpackChunkName: "converter" */ '@hanzoteam/converter-resources'))
  addLocation(taskId, async () => await import(/* webpackChunkName: "task" */ '@hanzoteam/task-resources'))
  addLocation(contactId, async () => await import(/* webpackChunkName: "contact" */ '@hanzoteam/contact-resources'))
  addLocation(chunterId, async () => await import(/* webpackChunkName: "chunter" */ '@hanzoteam/chunter-resources'))
  addLocation(recruitId, async () => await import(/* webpackChunkName: "recruit" */ '@hanzoteam/recruit-resources'))
  addLocation(
    activityId,
    async () => await import(/* webpackChunkName: "activity" */ '@hanzoteam/activity-resources')
  )
  addLocation(settingId, async () => await import(/* webpackChunkName: "setting" */ '@hanzoteam/setting-resources'))
  addLocation(leadId, async () => await import(/* webpackChunkName: "lead" */ '@hanzoteam/lead-resources'))
  addLocation(
    telegramId,
    async () => await import(/* webpackChunkName: "telegram" */ '@hanzoteam/telegram-resources')
  )
  addLocation(
    attachmentId,
    async () => await import(/* webpackChunkName: "attachment" */ '@hanzoteam/attachment-resources')
  )
  addLocation(gmailId, async () => await import(/* webpackChunkName: "gmail" */ '@hanzoteam/gmail-resources'))
  addLocation(
    imageCropperId,
    async () => await import(/* webpackChunkName: "image-cropper" */ '@hanzoteam/image-cropper-resources')
  )
  addLocation(
    inventoryId,
    async () => await import(/* webpackChunkName: "inventory" */ '@hanzoteam/inventory-resources')
  )
  addLocation(
    templatesId,
    async () => await import(/* webpackChunkName: "templates" */ '@hanzoteam/templates-resources')
  )
  addLocation(
    notificationId,
    async () => await import(/* webpackChunkName: "notification" */ '@hanzoteam/notification-resources')
  )
  addLocation(tagsId, async () => await import(/* webpackChunkName: "tags" */ '@hanzoteam/tags-resources'))
  addLocation(
    calendarId,
    async () => await import(/* webpackChunkName: "calendar" */ '@hanzoteam/calendar-resources')
  )
  addLocation(
    diffviewId,
    async () => await import(/* webpackChunkName: "diffview" */ '@hanzoteam/diffview-resources')
  )
  addLocation(timeId, async () => await import(/* webpackChunkName: "time" */ '@hanzoteam/time-resources'))
  addLocation(
    desktopPreferencesId,
    async () =>
      await import(/* webpackChunkName: "desktop-preferences" */ '@hanzoteam/desktop-preferences-resources')
  )
  addLocation(analyticsCollectorId, async () => await import('@hanzoteam/analytics-collector-resources'))
  addLocation(aiBotId, async () => await import('@hanzoteam/ai-bot-resources'))

  addLocation(trackerId, async () => await import(/* webpackChunkName: "tracker" */ '@hanzoteam/tracker-resources'))
  addLocation(boardId, async () => await import(/* webpackChunkName: "board" */ '@hanzoteam/board-resources'))
  addLocation(hrId, async () => await import(/* webpackChunkName: "hr" */ '@hanzoteam/hr-resources'))
  addLocation(bitrixId, async () => await import(/* webpackChunkName: "bitrix" */ '@hanzoteam/bitrix-resources'))
  addLocation(requestId, async () => await import(/* webpackChunkName: "request" */ '@hanzoteam/request-resources'))
  addLocation(driveId, async () => await import(/* webpackChunkName: "drive" */ '@hanzoteam/drive-resources'))
  addLocation(supportId, async () => await import(/* webpackChunkName: "support" */ '@hanzoteam/support-resources'))

  addLocation(
    documentId,
    async () => await import(/* webpackChunkName: "document" */ '@hanzoteam/document-resources')
  )
  addLocation(githubId, async () => await import(/* webpackChunkName: "github" */ '@hanzoteam/github-resources'))
  addLocation(
    questionsId,
    async () => await import(/* webpackChunkName: "training" */ '@hanzoteam/questions-resources')
  )
  addLocation(
    trainingId,
    async () => await import(/* webpackChunkName: "training" */ '@hanzoteam/training-resources')
  )
  addLocation(
    productsId,
    async () => await import(/* webpackChunkName: "products" */ '@hanzoteam/products-resources')
  )
  addLocation(
    documentsId,
    async () => await import(/* webpackChunkName: "documents" */ '@hanzoteam/controlled-documents-resources')
  )
  addLocation(guestId, async () => await import(/* webpackChunkName: "guest" */ '@hanzoteam/guest-resources'))
  addLocation(
    globalProfileId,
    async () => await import(/* webpackChunkName: "global-profile" */ '@hanzoteam/global-profile-resources')
  )
  addLocation(loveId, async () => await import(/* webpackChunkName: "love" */ '@hanzoteam/love-resources'))
  addLocation(printId, async () => await import(/* webpackChunkName: "print" */ '@hanzoteam/print-resources'))
  addLocation(exportId, async () => await import(/* webpackChunkName: "export" */ '@hanzoteam/export-resources'))
  addLocation(
    textEditorId,
    async () => await import(/* webpackChunkName: "text-editor" */ '@hanzoteam/text-editor-resources')
  )
  addLocation(
    uploaderId,
    async () => await import(/* webpackChunkName: "uploader" */ '@hanzoteam/uploader-resources')
  )
  addLocation(
    recorderId,
    async () => await import(/* webpackChunkName: "recorder" */ '@hanzoteam/recorder-resources')
  )
  addLocation(mediaId, async () => await import(/* webpackChunkName: "media" */ '@hanzoteam/media-resources'))

  addLocation(
    testManagementId,
    async () => await import(/* webpackChunkName: "test-management" */ '@hanzoteam/test-management-resources')
  )
  addLocation(surveyId, async () => await import(/* webpackChunkName: "survey" */ '@hanzoteam/survey-resources'))
  addLocation(
    presenceId,
    async () => await import(/* webpackChunkName: "presence" */ '@hanzoteam/presence-resources')
  )
  addLocation(cardId, async () => await import(/* webpackChunkName: "card" */ '@hanzoteam/card-resources'))
  addLocation(chatId, async () => await import(/* webpackChunkName: "chat" */ '@hanzoteam/chat-resources'))
  addLocation(processId, async () => await import(/* webpackChunkName: "process" */ '@hanzoteam/process-resources'))
  addLocation(
    achievementId,
    async () => await import(/* webpackChunkName: "achievement" */ '@hanzoteam/achievement-resources')
  )
  addLocation(
    communicationId,
    async () => await import(/* webpackChunkName: "communication" */ '@hanzoteam/communication-resources')
  )
  addLocation(emojiId, async () => await import(/* webpackChunkName: "emoji" */ '@hanzoteam/emoji-resources'))
  if ((config.BILLING_URL ?? '') !== '') {
    addLocation(
      billingId,
      async () => await import(/* webpackChunkName: "billing" */ '@hanzoteam/billing-resources')
    )
  }
  addLocation(
    hanzoMailId,
    async () => await import(/* webpackChunkName: "hanzoMail" */ '@hanzoteam/hanzo-mail-resources')
  )
  addLocation(
    aiAssistantId,
    async () => await import(/* webpackChunkName: "ai-assistant" */ '@hanzoteam/ai-assistant-resources')
  )
  addLocation(inboxId, async () => await import(/* webpackChunkName: "inbox" */ '@hanzoteam/inbox-resources'))
  addLocation(ratingId, async () => await import(/* webpackChunkName: "rating" */ '@hanzoteam/rating-resources'))

  setMetadata(client.metadata.FilterModel, 'ui')
  setMetadata(client.metadata.ExtraFilter, disabledFeatures)
  setMetadata(client.metadata.ExtraPlugins, ['preference' as Plugin])
  setMetadata(login.metadata.TransactorOverride, config.TRANSACTOR_OVERRIDE)

  // Use binary response transfer for faster performance and small transfer sizes.
  const binaryOverride = localStorage.getItem(client.metadata.UseBinaryProtocol)
  setMetadata(
    client.metadata.UseBinaryProtocol,
    binaryOverride != null ? binaryOverride === 'true' : (config.USE_BINARY_PROTOCOL ?? true)
  )

  // Disable for now, since it causes performance issues on linux/docker/kubernetes boxes for now.
  setMetadata(client.metadata.UseProtocolCompression, true)

  setMetadata(uiPlugin.metadata.PlatformTitle, title)
  setMetadata(workbench.metadata.PlatformTitle, title)
  setDefaultLanguage(myBranding.defaultLanguage ?? 'en')
  setMetadata(workbench.metadata.DefaultApplication, myBranding.defaultApplication ?? 'tracker')
  setMetadata(workbench.metadata.DefaultSpace, myBranding.defaultSpace ?? tracker.project.DefaultProject)
  setMetadata(workbench.metadata.DefaultSpecial, myBranding.defaultSpecial ?? 'issues')

  setMetadata(setting.metadata.DefaultInviteRole, myBranding.defaultInviteRole)
  setMetadata(setting.metadata.DefaultInviteLinkGeneratorRoles, myBranding.inviteLinkGeneratorRoles)

  try {
    const parsed = JSON.parse(config.EXCLUDED_APPLICATIONS_FOR_ANONYMOUS ?? '')
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, Array.isArray(parsed) ? parsed : [])
  } catch (err) {
    setMetadata(workbench.metadata.ExcludedApplicationsForAnonymous, [])
  }

  setMetadata(setting.metadata.BackupUrl, config.BACKUP_URL ?? '')

  initThemeStore()
}
