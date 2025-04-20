//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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

import { type Doc, type Ref, type Space } from '@hanzo/core'
import { type IntlString, type Resource, mergeIds } from '@hanzo/platform'
import { type AnyComponent } from '@hanzo/ui/src/types'
import { workbenchId } from '@hanzo/workbench'
import workbench from '@hanzo/workbench-resources/src/plugin'
import type { ActionCategory, ViewActionAvailabilityFunction } from '@hanzo/view'

export default mergeIds(workbenchId, workbench, {
  component: {
    ApplicationPresenter: '' as AnyComponent,
    ServerManager: '' as AnyComponent
  },
  string: {
    Application: '' as IntlString,
    HiddenApplication: '' as IntlString
  },
  function: {
    HasArchiveSpaces: '' as Resource<(spaces: Space[]) => Promise<boolean>>,
    IsOwner: '' as Resource<(docs: Doc[]) => Promise<boolean>>,
    CanCloseTab: '' as Resource<ViewActionAvailabilityFunction<Doc>>
  },
  category: {
    Workbench: '' as Ref<ActionCategory>
  },
  actionImpl: {
    PinTab: '' as Resource<(doc?: Doc | Doc[]) => Promise<void>>,
    UnpinTab: '' as Resource<(doc?: Doc | Doc[]) => Promise<void>>,
    CloseTab: '' as Resource<(doc?: Doc | Doc[]) => Promise<void>>
  }
})
