//
// Copyright © 2021, 2023 Hanzo AI Inc.
//
//

import { Ref } from '@hanzoteam/core'
import type { Metadata, Plugin, Resource } from '@hanzoteam/platform'
import { plugin } from '@hanzoteam/platform'
import { TriggerFunc } from '@hanzoteam/server-core'
import { TodoDoneTester } from '@hanzoteam/time'
import { GithubProject } from '@hanzoteam/github'

/**
 * @public
 */
export const serverGithubId = 'server-github' as Plugin

/**
 * @public
 */
export default plugin(serverGithubId, {
  trigger: {
    OnProjectChanges: '' as Resource<TriggerFunc>,
    OnProjectRemove: '' as Resource<TriggerFunc>,
    OnGithubBroadcast: '' as Resource<TriggerFunc>
  },
  functions: {
    TodoDoneTester: '' as Resource<TodoDoneTester>
  },
  metadata: {
    GithubProjects: '' as Metadata<Set<Ref<GithubProject>>>
  }
})
