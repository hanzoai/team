//
// Copyright © 2024 Hanzo AI Inc
//

import { configureAnalyticsProviders } from '@hanzo/analytics-providers'
import { type Config } from './platform'

export function configureAnalytics (config: Config) {
  configureAnalyticsProviders(config)
}
