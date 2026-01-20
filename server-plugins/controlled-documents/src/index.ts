//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import type { Plugin, Resource } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import { TriggerFunc } from '@hanzo/server-core'
import { Presenter, TypeMatchFunc } from '@hanzo/server-notification'

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
    CoAuthorsTypeMatch: '' as TypeMatchFunc
  }
})
