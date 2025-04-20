//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Builder } from '@hanzo/model'
import core from '@hanzo/core'
import serverCore from '@hanzo/server-core'
import serverAiBot from '@hanzo/server-ai-bot'
import chunter from '@hanzo/chunter'

export { serverAiBotId } from '@hanzo/server-ai-bot'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnUserStatus,
    txMatch: {
      objectClass: core.class.UserStatus
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAiBot.trigger.OnMessageSend,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: chunter.class.ChatMessage
    },
    isAsync: true
  })
}
