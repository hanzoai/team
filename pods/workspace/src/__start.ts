//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { Analytics } from '@hanzo/analytics'
import { configureAnalytics, SplitLogger } from '@hanzo/analytics-service'
import { MeasureMetricsContext, newMetrics, type Tx } from '@hanzo/core'
import { getPlatformQueue } from '@hanzo/kafka'
import builder, { getModelVersion, migrateOperations } from '@hanzo/model-all'
import { initStatisticsContext, loadBrandingMap } from '@hanzo/server-core'
import { serveWorkspaceAccount } from '@hanzo/workspace-service'
import { join } from 'path'

const enabled = (process.env.MODEL_ENABLED ?? '*').split(',').map((it) => it.trim())
const disabled = (process.env.MODEL_DISABLED ?? '').split(',').map((it) => it.trim())

const txes = JSON.parse(JSON.stringify(builder(enabled, disabled).getTxes())) as Tx[]

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'workspace')

// Force create server metrics context with proper logging
const metricsContext = initStatisticsContext('workspace', {
  factory: () =>
    new MeasureMetricsContext(
      'workspace',
      {},
      {},
      newMetrics(),
      new SplitLogger('workspace', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

const brandingPath = process.env.BRANDING_PATH

const queue = getPlatformQueue('workspace')

serveWorkspaceAccount(
  metricsContext,
  queue,
  getModelVersion(),
  txes,
  migrateOperations,
  loadBrandingMap(brandingPath),
  () => {}
)
