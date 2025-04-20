import { addLocation } from '@hanzo/platform'
import { serverActivityId } from '@hanzo/server-activity'
import { serverAttachmentId } from '@hanzo/server-attachment'
import { serverCardId } from '@hanzo/server-card'
import { serverCalendarId } from '@hanzo/server-calendar'
import { serverChunterId } from '@hanzo/server-chunter'
import { serverCollaborationId } from '@hanzo/server-collaboration'
import { serverContactId } from '@hanzo/server-contact'
import { serverDocumentsId } from '@hanzo/server-controlled-documents'
import { serverDocumentId } from '@hanzo/server-document'
import { serverDriveId } from '@hanzo/server-drive'
import { serverGithubId } from '@hanzo/server-github'
import { serverGmailId } from '@hanzo/server-gmail'
import { serverGuestId } from '@hanzo/server-guest'
import { serverHrId } from '@hanzo/server-hr'
import { serverInventoryId } from '@hanzo/server-inventory'
import { serverLeadId } from '@hanzo/server-lead'
import { serverLoveId } from '@hanzo/server-love'
import { serverNotificationId } from '@hanzo/server-notification'
import { serverRecruitId } from '@hanzo/server-recruit'
import { serverRequestId } from '@hanzo/server-request'
import { serverSettingId } from '@hanzo/server-setting'
import { serverTagsId } from '@hanzo/server-tags'
import { serverTaskId } from '@hanzo/server-task'
import { serverTelegramId } from '@hanzo/server-telegram'
import { serverTimeId } from '@hanzo/server-time'
import { serverTrackerId } from '@hanzo/server-tracker'
import { serverTrainingId } from '@hanzo/server-training'
import { serverViewId } from '@hanzo/server-view'
import { serverAiBotId } from '@hanzo/server-ai-bot'
import { serverProcessId } from '@hanzo/server-process'

export function registerServerPlugins (): void {
  addLocation(serverActivityId, () => import('@hanzo/server-activity-resources'))
  addLocation(serverAttachmentId, () => import('@hanzo/server-attachment-resources'))
  addLocation(serverCollaborationId, () => import('@hanzo/server-collaboration-resources'))
  addLocation(serverContactId, () => import('@hanzo/server-contact-resources'))
  addLocation(serverNotificationId, () => import('@hanzo/server-notification-resources'))
  addLocation(serverSettingId, () => import('@hanzo/server-setting-resources'))
  addLocation(serverChunterId, () => import('@hanzo/server-chunter-resources'))
  addLocation(serverInventoryId, () => import('@hanzo/server-inventory-resources'))
  addLocation(serverLeadId, () => import('@hanzo/server-lead-resources'))
  addLocation(serverRecruitId, () => import('@hanzo/server-recruit-resources'))
  addLocation(serverTaskId, () => import('@hanzo/server-task-resources'))
  addLocation(serverTrackerId, () => import('@hanzo/server-tracker-resources'))
  addLocation(serverTagsId, () => import('@hanzo/server-tags-resources'))
  addLocation(serverCardId, () => import('@hanzo/server-card-resources'))
  addLocation(serverCalendarId, () => import('@hanzo/server-calendar-resources'))
  addLocation(serverGmailId, () => import('@hanzo/server-gmail-resources'))
  addLocation(serverTelegramId, () => import('@hanzo/server-telegram-resources'))
  addLocation(serverRequestId, () => import('@hanzo/server-request-resources'))
  addLocation(serverViewId, () => import('@hanzo/server-view-resources'))
  addLocation(serverHrId, () => import('@hanzo/server-hr-resources'))
  addLocation(serverLoveId, () => import('@hanzo/server-love-resources'))
  addLocation(serverGuestId, () => import('@hanzo/server-guest-resources'))
  addLocation(serverDocumentId, () => import('@hanzo/server-document-resources'))
  addLocation(serverTimeId, () => import('@hanzo/server-time-resources'))
  addLocation(serverDriveId, () => import('@hanzo/server-drive-resources'))
  addLocation(serverDocumentsId, () => import('@hanzo/server-controlled-documents-resources'))
  addLocation(serverTrainingId, () => import('@hanzo/server-training-resources'))
  addLocation(serverGithubId, () => import('@hanzo/server-github-resources'))
  addLocation(serverAiBotId, () => import('@hanzo/server-ai-bot-resources'))
  addLocation(serverProcessId, () => import('@hanzo/server-process-resources'))
}
