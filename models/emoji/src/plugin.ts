import { mergeIds } from '@hanzo/platform'
import { type AnyComponent } from '@hanzo/ui/src/types'
import emojiPlugin, { emojiId } from '@hanzo/emoji'

export default mergeIds(emojiId, emojiPlugin, {
  component: {
    WorkbenchExtension: '' as AnyComponent
  }
})
