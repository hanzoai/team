//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { serveAccount } from '@hanzo/account-service'
import { Analytics } from '@hanzo/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hanzo/analytics-service'
import { newMetrics } from '@hanzo/core'
import { initStatisticsContext, loadBrandingMap } from '@hanzo/server-core'
import { join } from 'path'

configureAnalytics('account', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'account')

const metricsContext = initStatisticsContext('account', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'account',
      {},
      {},
      newMetrics(),
      new SplitLogger('account', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

const brandingPath = process.env.BRANDING_PATH

serveAccount(metricsContext, loadBrandingMap(brandingPath), () => {})
