//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Doc } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import { getPanelURI } from '@hanzoteam/ui'
import view, { type ObjectPanel } from '@hanzoteam/view'

export function getPanelFragment<T extends Doc> (object: Pick<T, '_class' | '_id'>): string {
  const hierarchy = getClient().getHierarchy()
  const objectPanelMixin = hierarchy.classHierarchyMixin<Doc, ObjectPanel>(object._class, view.mixin.ObjectPanel)
  const component = objectPanelMixin?.component ?? view.component.EditDoc
  return getPanelURI(component, object._id, object._class, 'content')
}
