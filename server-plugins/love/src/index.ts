import type { Plugin, Resource } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import { TriggerFunc } from '@hanzo/server-core'
import { Presenter } from '@hanzo/server-notification'

/**
 * @public
 */
export const serverLoveId = 'server-love' as Plugin

/**
 * @public
 */
export default plugin(serverLoveId, {
  function: {
    MeetingMinutesHTMLPresenter: '' as Resource<Presenter>,
    MeetingMinutesTextPresenter: '' as Resource<Presenter>
  },
  trigger: {
    OnEmployee: '' as Resource<TriggerFunc>,
    OnUserStatus: '' as Resource<TriggerFunc>,
    OnParticipantInfo: '' as Resource<TriggerFunc>,
    OnRoomInfo: '' as Resource<TriggerFunc>,
    OnInvite: '' as Resource<TriggerFunc>,
    OnKnock: '' as Resource<TriggerFunc>
  }
})
