//
// Copyright © 2024 Hanzo AI Inc.
//
//

import { CollaboratorClient, getClient as getCollaboratorClient } from '@hanzoteam/collaborator-client'
import { systemAccountUuid, WorkspaceUuid } from '@hanzoteam/core'
import { generateToken } from '@hanzoteam/server-token'
import config from './config'

/**
 * @public
 */
export function createCollaboratorClient (workspaceId: WorkspaceUuid): CollaboratorClient {
  const token = generateToken(systemAccountUuid, workspaceId, { service: 'processor', mode: 'processor' })
  return getCollaboratorClient(workspaceId, token, config.CollaboratorURL)
}
