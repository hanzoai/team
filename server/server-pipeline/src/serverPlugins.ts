import { addLocation } from '@hanzoteam/platform'
import { serverActivityId } from '@hanzoteam/server-activity'
import { serverAttachmentId } from '@hanzoteam/server-attachment'
import { serverCardId } from '@hanzoteam/server-card'
import { serverCalendarId } from '@hanzoteam/server-calendar'
import { serverChunterId } from '@hanzoteam/server-chunter'
import { serverCollaborationId } from '@hanzoteam/server-collaboration'
import { serverContactId } from '@hanzoteam/server-contact'
import { serverDocumentsId } from '@hanzoteam/server-controlled-documents'
import { serverDocumentId } from '@hanzoteam/server-document'
import { serverDriveId } from '@hanzoteam/server-drive'
import { serverGithubId } from '@hanzoteam/server-github'
import { serverGmailId } from '@hanzoteam/server-gmail'
import { serverGuestId } from '@hanzoteam/server-guest'
import { serverHrId } from '@hanzoteam/server-hr'
import { serverInventoryId } from '@hanzoteam/server-inventory'
import { serverLeadId } from '@hanzoteam/server-lead'
import { serverLoveId } from '@hanzoteam/server-love'
import { serverNotificationId } from '@hanzoteam/server-notification'
import { serverRecruitId } from '@hanzoteam/server-recruit'
import { serverRequestId } from '@hanzoteam/server-request'
import { serverSettingId } from '@hanzoteam/server-setting'
import { serverTagsId } from '@hanzoteam/server-tags'
import { serverTaskId } from '@hanzoteam/server-task'
import { serverTelegramId } from '@hanzoteam/server-telegram'
import { serverTimeId } from '@hanzoteam/server-time'
import { serverTrackerId } from '@hanzoteam/server-tracker'
import { serverTrainingId } from '@hanzoteam/server-training'
import { serverViewId } from '@hanzoteam/server-view'
import { serverAiBotId } from '@hanzoteam/server-ai-bot'
import { serverProcessId } from '@hanzoteam/server-process'

export function registerServerPlugins (): void {
  addLocation(serverActivityId, () => import('@hanzoteam/server-activity-resources'))
  addLocation(serverAttachmentId, () => import('@hanzoteam/server-attachment-resources'))
  addLocation(serverCollaborationId, () => import('@hanzoteam/server-collaboration-resources'))
  addLocation(serverContactId, () => import('@hanzoteam/server-contact-resources'))
  addLocation(serverNotificationId, () => import('@hanzoteam/server-notification-resources'))
  addLocation(serverSettingId, () => import('@hanzoteam/server-setting-resources'))
  addLocation(serverChunterId, () => import('@hanzoteam/server-chunter-resources'))
  addLocation(serverInventoryId, () => import('@hanzoteam/server-inventory-resources'))
  addLocation(serverLeadId, () => import('@hanzoteam/server-lead-resources'))
  addLocation(serverRecruitId, () => import('@hanzoteam/server-recruit-resources'))
  addLocation(serverTaskId, () => import('@hanzoteam/server-task-resources'))
  addLocation(serverTrackerId, () => import('@hanzoteam/server-tracker-resources'))
  addLocation(serverTagsId, () => import('@hanzoteam/server-tags-resources'))
  addLocation(serverCardId, () => import('@hanzoteam/server-card-resources'))
  addLocation(serverCalendarId, () => import('@hanzoteam/server-calendar-resources'))
  addLocation(serverGmailId, () => import('@hanzoteam/server-gmail-resources'))
  addLocation(serverTelegramId, () => import('@hanzoteam/server-telegram-resources'))
  addLocation(serverRequestId, () => import('@hanzoteam/server-request-resources'))
  addLocation(serverViewId, () => import('@hanzoteam/server-view-resources'))
  addLocation(serverHrId, () => import('@hanzoteam/server-hr-resources'))
  addLocation(serverLoveId, () => import('@hanzoteam/server-love-resources'))
  addLocation(serverGuestId, () => import('@hanzoteam/server-guest-resources'))
  addLocation(serverDocumentId, () => import('@hanzoteam/server-document-resources'))
  addLocation(serverTimeId, () => import('@hanzoteam/server-time-resources'))
  addLocation(serverDriveId, () => import('@hanzoteam/server-drive-resources'))
  addLocation(serverDocumentsId, () => import('@hanzoteam/server-controlled-documents-resources'))
  addLocation(serverTrainingId, () => import('@hanzoteam/server-training-resources'))
  addLocation(serverGithubId, () => import('@hanzoteam/server-github-resources'))
  addLocation(serverAiBotId, () => import('@hanzoteam/server-ai-bot-resources'))
  addLocation(serverProcessId, () => import('@hanzoteam/server-process-resources'))
}
