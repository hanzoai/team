import type { Plugin, Resource } from '@hanzoteam/platform'
import { plugin } from '@hanzoteam/platform'
import { TriggerFunc } from '@hanzoteam/server-core'
import { Presenter } from '@hanzoteam/server-notification'

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
    OnKnock: '' as Resource<TriggerFunc>
  }
})
