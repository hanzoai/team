//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { Plugin, Resource } from '@hanzo/platform'
import { TriggerControl, TriggerFunc } from '@hanzo/server-core'
import { plugin } from '@hanzo/platform'
import { Class, Doc, Mixin, Ref } from '@hanzo/core'

/**
 * @public
 */
export const serverViewId = 'server-view' as Plugin

export interface ServerLinkIdProvider extends Class<Doc> {
  encode: Resource<(doc: Doc, control: TriggerControl) => Promise<string>>
}

/**
 * @public
 */
export default plugin(serverViewId, {
  mixin: {
    ServerLinkIdProvider: '' as Ref<Mixin<ServerLinkIdProvider>>
  },
  trigger: {
    OnCustomAttributeRemove: '' as Resource<TriggerFunc>
  }
})
