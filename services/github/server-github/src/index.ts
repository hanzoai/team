//
// Copyright © 2021, 2023 Hardcore Engineering Inc.
//
//

import { Ref } from '@hanzo/core'
import type { Metadata, Plugin, Resource } from '@hanzo/platform'
import { plugin } from '@hanzo/platform'
import { TriggerFunc } from '@hanzo/server-core'
import { TodoDoneTester } from '@hanzo/time'
import { GithubProject } from '@hanzo/github'

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
