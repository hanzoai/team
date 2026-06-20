import { type Doc, type Ref } from '@hanzoteam/core'
import { guestId } from '@hanzoteam/guest'
import guest from '@hanzoteam/guest-resources/src/plugin'
import { mergeIds } from '@hanzoteam/platform'
import { type AnyComponent } from '@hanzoteam/ui/src/types'
import { type Action, type ActionCategory } from '@hanzoteam/view'

export default mergeIds(guestId, guest, {
  action: {
    CreatePublicLink: '' as Ref<Action<Doc, any>>
  },
  category: {
    Guest: '' as Ref<ActionCategory>
  },
  component: {
    CreatePublicLink: '' as AnyComponent
  }
})
