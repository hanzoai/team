//
// Copyright © 2023 Hanzo AI Inc.
//
//

import { Doc } from '@hanzoteam/core'
import type { Plugin, Resource } from '@hanzoteam/platform'
import { plugin } from '@hanzoteam/platform'
import { ObjectDDParticipantFunc } from '@hanzoteam/server-core'
import { Presenter } from '@hanzoteam/server-notification'

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
