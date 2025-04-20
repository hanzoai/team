//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import { type Builder } from '@hanzo/model'

import core, { type Class, type Doc } from '@hanzo/core'
import document from '@hanzo/document'
import serverCore, { type ObjectDDParticipant } from '@hanzo/server-core'
import serverDocument from '@hanzo/server-document'
import serverNotification from '@hanzo/server-notification'
import serverView from '@hanzo/server-view'

export { serverDocumentId } from '@hanzo/server-document'

export function createModel (builder: Builder): void {
  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverDocument.function.DocumentHTMLPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverDocument.function.DocumentTextPresenter
  })

  builder.mixin(document.class.Document, core.class.Class, serverView.mixin.ServerLinkIdProvider, {
    encode: serverDocument.function.DocumentLinkIdProvider
  })

  builder.mixin(document.class.Document, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: document.component.DocumentSearchIcon,
      fields: [['icon'], ['color']]
    },
    title: [['title']]
  })

  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    document.class.Document,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverDocument.function.FindChildDocuments
    }
  )
}
