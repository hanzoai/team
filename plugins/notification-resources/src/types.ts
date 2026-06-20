import type { Ref } from '@hanzoteam/core'
import type { DisplayInboxNotification, DocNotifyContext } from '@hanzoteam/notification'
import type { IntlString } from '@hanzoteam/platform'

export type InboxNotificationsFilter = 'all' | 'unread'

export type InboxData = Map<Ref<DocNotifyContext>, DisplayInboxNotification[]>

export interface SettingItem {
  id: string
  on: boolean
  label: IntlString
  onToggle: () => void
}
