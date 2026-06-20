import view from '@hanzoteam/view'
import core from '@hanzoteam/core'
import type { Asset } from '@hanzoteam/platform'

export const iconsLibrary: Asset[] = Object.values(core.icon).concat(Object.values(view.icon))
