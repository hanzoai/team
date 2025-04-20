//
// Copyright © 2024 Hardcore Engineering Inc.
//

import core, { Doc, TxOperations } from '@hanzo/core'
import { type Location } from '@hanzo/ui'

import guest from './index'

export async function createPublicLink (
  client: TxOperations,
  object: Doc,
  location: Location,
  revokable: boolean = true
): Promise<void> {
  await client.createDoc(guest.class.PublicLink, core.space.Workspace, {
    attachedTo: object._id,
    location,
    revokable,
    restrictions: {
      readonly: true,
      disableNavigation: true,
      disableActions: true,
      disableComments: true
    },
    url: ''
  })
}
