//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type { Doc } from '@hanzo/core'
import { getClient } from '@hanzo/presentation'
import { getPanelURI } from '@hanzo/ui'
import view, { type ObjectPanel } from '@hanzo/view'

export function getPanelFragment<T extends Doc> (object: Pick<T, '_class' | '_id'>): string {
  const hierarchy = getClient().getHierarchy()
  const objectPanelMixin = hierarchy.classHierarchyMixin<Doc, ObjectPanel>(object._class, view.mixin.ObjectPanel)
  const component = objectPanelMixin?.component ?? view.component.EditDoc
  return getPanelURI(component, object._id, object._class, 'content')
}
