//
// Copyright © 2023 Hardcore Engineering Inc.
//
import { serveAccount } from '@hanzo/account-service'
import { Analytics } from '@hanzo/analytics'
import { configureAnalytics, SplitLogger } from '@hanzo/analytics-service'
import { MeasureMetricsContext, newMetrics } from '@hanzo/core'
import { initStatisticsContext, loadBrandingMap } from '@hanzo/server-core'
import { join } from 'path'

configureAnalytics(process.env.SENTRY_DSN, {})
Analytics.setTag('application', 'account')

const metricsContext = initStatisticsContext('account', {
  factory: () =>
    new MeasureMetricsContext(
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
