//
// Copyright © 2024 Hanzo AI Inc.
//

import core, { Doc, TxOperations } from '@hanzoteam/core'
import { type Location } from '@hanzoteam/ui'

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
