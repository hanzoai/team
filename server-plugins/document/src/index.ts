//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import { Doc } from '@hanzo/core'
import type { Plugin, Resource } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import { ObjectDDParticipantFunc } from '@hanzo/server-core'
import { Presenter } from '@hanzo/server-notification'

/**
 * @public
 */
export const serverDocumentId = 'server-document' as Plugin

/**
 * @public
 */
export default plugin(serverDocumentId, {
  function: {
    DocumentHTMLPresenter: '' as Resource<Presenter>,
    DocumentTextPresenter: '' as Resource<Presenter>,
    DocumentLinkIdProvider: '' as Resource<(doc: Doc) => Promise<string>>,
    FindChildDocuments: '' as Resource<ObjectDDParticipantFunc>
  }
})
