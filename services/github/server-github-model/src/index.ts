//
// Copyright © 2023 Hardcore Engineering Inc.
//

import { type Builder } from '@hanzo/model'

import core from '@hanzo/core'
import serverCore from '@hanzo/server-core'
import serverGithub from '@hanzo/server-github'
import time from '@hanzo/time'
import tracker from '@hanzo/tracker'

export { serverGithubId } from '@hanzo/server-github'

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
