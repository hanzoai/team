import { mergeIds } from '@hanzoteam/platform'
import { type AnyComponent } from '@hanzoteam/ui/src/types'
import emojiPlugin, { emojiId } from '@hanzoteam/emoji'

export default mergeIds(emojiId, emojiPlugin, {
  component: {
    WorkbenchExtension: '' as AnyComponent
  }
})
