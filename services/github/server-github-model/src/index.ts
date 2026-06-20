//
// Copyright © 2023 Hanzo AI Inc.
//

import { type Builder } from '@hanzoteam/model'

import core from '@hanzoteam/core'
import serverCore from '@hanzoteam/server-core'
import serverGithub from '@hanzoteam/server-github'
import time from '@hanzoteam/time'
import tracker from '@hanzoteam/tracker'

export { serverGithubId } from '@hanzoteam/server-github'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverGithub.trigger.OnProjectChanges,
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverGithub.trigger.OnProjectRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: tracker.class.Project
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverGithub.trigger.OnGithubBroadcast,
    isAsync: false
  })

  // We should skip activity github mixin stuff.
  builder.createDoc(time.class.TodoAutomationHelper, core.space.Model, {
    onDoneTester: serverGithub.functions.TodoDoneTester
  })
}
