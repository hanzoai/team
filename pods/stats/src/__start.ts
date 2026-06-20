//
// Copyright © 2023 Hanzo AI Inc.
//
import { Analytics } from '@hanzoteam/analytics'
import { configureAnalytics, SplitLogger } from '@hanzoteam/analytics-service'
import { MeasureMetricsContext, metricsToString, newMetrics } from '@hanzoteam/core'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { serveStats } from './stats'

configureAnalytics('stats', process.env.VERSION ?? '0.7.0')
Analytics.setTag('application', 'stats')

const metricsContext = new MeasureMetricsContext(
  'stats',
  {},
  {},
  newMetrics(),
  new SplitLogger('stats', {
    root: join(process.cwd(), 'logs'),
    enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
  })
)

let oldMetricsValue = ''

const intTimer = setInterval(() => {
  const val = metricsToString(metricsContext.metrics, 'Stats', 140)
  if (val !== oldMetricsValue) {
    oldMetricsValue = val
    void writeFile('metrics.txt', val).catch((err) => {
      console.error(err)
    })
  }
}, 30000)

serveStats(metricsContext, () => {
  clearInterval(intTimer)
})
