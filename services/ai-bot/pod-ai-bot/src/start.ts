//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
import { setMetadata } from '@hanzo/platform'
import serverClient, { withRetry } from '@hanzo/server-client'
import { initStatisticsContext } from '@hanzo/server-core'
import serverToken, { generateToken } from '@hanzo/server-token'

import { getClient as getAccountClient } from '@hanzo/account-client'
import { SplitLogger } from '@hanzo/analytics-service'
import { MeasureMetricsContext, newMetrics, type SocialId } from '@hanzo/core'
import { join } from 'path'
import config from './config'
import { AIControl } from './controller'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server/server'
import { getDbStorage } from './storage'
import { getAccountUuid } from './utils/account'

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.ServerSecret)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)

  registerLoaders()

  const ctx = initStatisticsContext('ai-bot-service', {
    factory: () =>
      new MeasureMetricsContext(
        'ai-bot-service',
        {},
        {},
        newMetrics(),
        new SplitLogger('ai-bot-service', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })
  ctx.info('AI Bot Service started', { firstName: config.FirstName, lastName: config.LastName })

  const personUuid = await withRetry(
    async () => await getAccountUuid(ctx),
    (_, attempt) => attempt >= 5,
    5000
  )()

  if (personUuid === undefined) {
    ctx.error('AI Bot Service failed to start. No person found.')
    process.exit()
  }
  ctx.info('AI person uuid', { personUuid })

  const storage = await getDbStorage()
  const socialIds: SocialId[] = await getAccountClient(config.AccountsURL, generateToken(personUuid)).getSocialIds()

  const aiControl = new AIControl(personUuid, socialIds, storage, ctx)

  const app = createServer(aiControl, ctx)
  const server = listen(app, config.Port)

  const onClose = (): void => {
    void aiControl.close()
    storage.close()
    server.close(() => process.exit())
  }

  process.on('SIGINT', onClose)
  process.on('SIGTERM', onClose)
  process.on('uncaughtException', (e: Error) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e: Error) => {
    console.error(e)
  })
}
