//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { setMetadata } from '@hanzoteam/platform'
import serverClient from '@hanzoteam/server-client'
import { initStatisticsContext } from '@hanzoteam/server-core'
import serverToken from '@hanzoteam/server-token'

import config from './config'
import { SlackController } from './controller'
import { createServer, listen } from './server'
import { registerLoaders } from './loaders'

const ctx = initStatisticsContext('slack')

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, config.ServiceId)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceId)
  registerLoaders()

  const controller = new SlackController(ctx)
  const app = createServer(ctx, controller)
  const server = listen(app, ctx, config.Port)

  const shutdown = (): void => {
    void controller.close().then(() => {
      server.close(() => process.exit(0))
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    ctx.error('uncaughtException', { error: e })
  })
  process.on('unhandledRejection', (e) => {
    ctx.error('unhandledRejection', { error: e })
  })
}
