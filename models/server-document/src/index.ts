//
// Copyright © 2023 Hanzo AI Inc.
//
//

import { type Builder } from '@hanzoteam/model'

import core, { type Class, type Doc } from '@hanzoteam/core'
import document from '@hanzoteam/document'
import serverCore, { type ObjectDDParticipant } from '@hanzoteam/server-core'
import serverDocument from '@hanzoteam/server-document'
import serverNotification from '@hanzoteam/server-notification'
import serverView from '@hanzoteam/server-view'

export { serverDocumentId } from '@hanzoteam/server-document'

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
