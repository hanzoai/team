//
// Copyright © 2022 Hanzo AI Inc.
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

import { Analytics } from '@hanzoteam/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hanzoteam/analytics-service'
import { startBackup } from '@hanzoteam/backup-service'
import { newMetrics, type Tx } from '@hanzoteam/core'
import { initStatisticsContext, type PipelineFactory } from '@hanzoteam/server-core'
import {
  createBackupPipeline,
  getConfig,
  registerAdapterFactory,
  registerDestroyFactory,
  registerTxAdapterFactory,
  setAdapterSecurity
} from '@hanzoteam/server-pipeline'
import { join } from 'path'

import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  shutdownMongo
} from '@hanzoteam/mongo'
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  setDBExtraOptions,
  shutdownPostgres
} from '@hanzoteam/postgres'
import { readFileSync } from 'node:fs'
const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

// Register close on process exit.
process.on('exit', () => {
  shutdownPostgres().catch((err) => {
    console.error(err)
  })
  shutdownMongo().catch((err) => {
    console.error(err)
  })
})

const metricsContext = initStatisticsContext('backup', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'backup',
      {},
      {},
      newMetrics(),
      new SplitLogger('backup', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

configureAnalytics('backup', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'backup-service')

const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

setDBExtraOptions({
  prepare: usePrepare // We override defaults
})

registerTxAdapterFactory('mongodb', createMongoTxAdapter)
registerAdapterFactory('mongodb', createMongoAdapter)
registerDestroyFactory('mongodb', createMongoDestroyAdapter)

registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
registerAdapterFactory('postgresql', createPostgresAdapter, true)
registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
setAdapterSecurity('postgresql', true)

startBackup(
  metricsContext,
  (url, storageAdapter) => {
    const factory: PipelineFactory = createBackupPipeline(metricsContext, url, model, {
      externalStorage: storageAdapter,
      usePassedCtx: true
    })
    return factory
  },
  (ctx, dbUrl, workspace, branding, externalStorage) => {
    return getConfig(ctx, dbUrl, ctx, {
      externalStorage,
      disableTriggers: true
    })
  }
)
