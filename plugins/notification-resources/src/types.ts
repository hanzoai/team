import type { Ref } from '@hanzo/core'
import type { DisplayInboxNotification, DocNotifyContext } from '@hanzo/notification'
import type { IntlString } from '@hanzo/platform'

export type InboxNotificationsFilter = 'all' | 'unread'

export type InboxData = Map<Ref<DocNotifyContext>, DisplayInboxNotification[]>

export interface SettingItem {
  id: string
  on: boolean
  label: IntlString
  onToggle: () => void
}
