import { type Doc, type Ref } from '@hanzo/core'
import { guestId } from '@hanzo/guest'
import guest from '@hanzo/guest-resources/src/plugin'
import { mergeIds } from '@hanzo/platform'
import { type AnyComponent } from '@hanzo/ui/src/types'
import { type Action, type ActionCategory } from '@hanzo/view'

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
