//
// Copyright © 2023 Hanzo AI Inc.
//
import { type Builder } from '@hanzo/model'
import core from '@hanzo/core'
import serverCore from '@hanzo/server-core'
import { RequestStatus } from '@hanzo/request'
import documents, { DocumentState } from '@hanzo/controlled-documents'
import serverDocuments from '@hanzo/server-controlled-documents'
import serverNotification from '@hanzo/server-notification'
import notification from '@hanzo/notification'

export { serverDocumentsId } from '@hanzo/server-controlled-documents/src/index'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocEnteredNonActionableState,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument,
      'operations.state': { $in: [DocumentState.Deleted, DocumentState.Obsolete, DocumentState.Archived] }
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocPlannedEffectiveDateChanged,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocApprovalRequestApproved,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      attachedToClass: documents.class.ControlledDocument,
      objectClass: documents.class.DocumentApprovalRequest,
      'operations.status': RequestStatus.Completed
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocHasBecomeEffective,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument,
      'operations.state': DocumentState.Effective
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDocuments.trigger.OnDocTitleChanged,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: documents.class.ControlledDocument
    }
  })

  builder.mixin(documents.class.DocumentMeta, core.class.Class, serverCore.mixin.SearchPresenter, {
    iconConfig: {
      component: documents.component.DocumentIcon
    },
    title: [['title']]
  })

  builder.mixin(documents.class.ControlledDocument, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverDocuments.function.ControlledDocumentTextPresenter
  })

  builder.mixin(documents.class.ControlledDocument, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverDocuments.function.ControlledDocumentHTMLPresenter
  })

  builder.mixin(
    documents.notification.ReviewNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverDocuments.function.DocumentReviewedTypeMatch
    }
  )

  builder.mixin(
    documents.notification.CoAuthorsNotification,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverDocuments.function.CoAuthorsTypeMatch
    }
  )
}
