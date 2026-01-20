import view from '@hanzo/view'
import core from '@hanzo/core'
import type { Asset } from '@hanzo/platform'

export const iconsLibrary: Asset[] = Object.values(core.icon).concat(Object.values(view.icon))
