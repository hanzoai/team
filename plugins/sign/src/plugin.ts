//
// Copyright © 2024 Hanzo AI Inc.
//

import { type Plugin, plugin, Metadata } from '@hanzoteam/platform'

export const signId = 'sign' as Plugin

export const sign = plugin(signId, {
  metadata: {
    SignURL: '' as Metadata<string>
  }
})

export default sign
