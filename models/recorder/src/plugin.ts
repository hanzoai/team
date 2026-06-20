//
// Copyright © 2024-2025 Hanzo AI Inc.
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import core from '@hanzoteam/core'
import { mergeIds } from '@hanzoteam/platform'
import { recorderId } from '@hanzoteam/recorder'
import recorder from '@hanzoteam/recorder-resources/src/plugin'
import { type AnyComponent } from '@hanzoteam/ui/src/types'

export default mergeIds(recorderId, recorder, {
  component: {
    WorkbenchExtension: '' as AnyComponent
  }
})
