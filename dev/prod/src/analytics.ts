//
// Copyright © 2024 Hardcore Engineering Inc
//

import { configureAnalyticsProviders } from '@hanzo/analytics-providers'
import { type Config } from './platform'

export function configureAnalytics (config: Config) {
  configureAnalyticsProviders(config)
}
