//
// Copyright © 2023 Hanzo AI Inc.
//
import { serveAccount } from '@hanzoteam/account-service'
import { Analytics } from '@hanzoteam/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hanzoteam/analytics-service'
import { newMetrics } from '@hanzoteam/core'
import { initStatisticsContext, loadBrandingMap } from '@hanzoteam/server-core'
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
