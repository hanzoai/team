//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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

import attachment from '@hanzo/attachment'
import core from '@hanzo/core'
import serverAttachment from '@hanzo/server-attachment'
import serverCore from '@hanzo/server-core'

export { serverAttachmentId } from '@hanzo/server-attachment'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverAttachment.trigger.OnAttachmentDelete,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: attachment.class.Attachment
    }
  })
}
