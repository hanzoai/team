//
// Copyright © 2023 Hardcore Engineering Inc.
//
//

import client, { ClientSocket } from '@hanzo/client'
import clientResources from '@hanzo/client-resources'
import { Client, ClientConnectEvent, systemAccountUuid, WorkspaceUuid } from '@hanzo/core'
import { setMetadata } from '@hanzo/platform'
import { getTransactorEndpoint } from '@hanzo/server-client'
import serverToken, { generateToken } from '@hanzo/server-token'
import WebSocket from 'ws'
import config from './config'

/**
 * @public
 */
export async function createPlatformClient (
  workspace: WorkspaceUuid,
  timeout: number,
  reconnect?: (event: ClientConnectEvent, data: any) => Promise<void>
): Promise<{ client: Client, endpoint: string }> {
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': config.ServiceID
      }
    }) as never as ClientSocket
  })

  setMetadata(serverToken.metadata.Secret, config.ServerSecret)
  const token = generateToken(systemAccountUuid, workspace, { service: 'github', mode: 'github' })
  setMetadata(client.metadata.UseBinaryProtocol, true)
  setMetadata(client.metadata.UseProtocolCompression, true)
  setMetadata(client.metadata.ConnectionTimeout, timeout)
  setMetadata(client.metadata.FilterModel, 'client')
  const endpoint = await getTransactorEndpoint(token)
  const connection = await (
    await clientResources()
  ).function.GetClient(token, endpoint, {
    onConnect: reconnect,
    useGlobalRPCHandler: true
  })

  return { client: connection, endpoint }
}
