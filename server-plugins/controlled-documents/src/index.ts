//
// Copyright © 2023 Hanzo AI Inc.
//
//

import type { Plugin, Resource } from '@hanzoteam/platform'
import { plugin } from '@hanzoteam/platform'
import { TriggerFunc } from '@hanzoteam/server-core'
import { Presenter, TypeMatchFunc } from '@hanzoteam/server-notification'

/**
 * @public
 */
export const serverDocumentsId = 'server-documents' as Plugin

/**
 * @public
 */
export default plugin(serverDocumentsId, {
  trigger: {
    OnDocEnteredNonActionableState: '' as Resource<TriggerFunc>,
    OnDocPlannedEffectiveDateChanged: '' as Resource<TriggerFunc>,
    OnDocApprovalRequestApproved: '' as Resource<TriggerFunc>,
    OnDocHasBecomeEffective: '' as Resource<TriggerFunc>,
    OnDocTitleChanged: '' as Resource<TriggerFunc>
  },
  function: {
    ControlledDocumentTextPresenter: '' as Resource<Presenter>,
    ControlledDocumentHTMLPresenter: '' as Resource<Presenter>,
    CoAuthorsTypeMatch: '' as TypeMatchFunc,
    DocumentReviewedTypeMatch: '' as TypeMatchFunc
  }
})
