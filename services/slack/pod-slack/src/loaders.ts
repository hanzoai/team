//
// Copyright © 2025 Hanzo AI Inc.
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

import { slackId } from '@hanzoteam/slack'
import { addStringsLoader, platformId } from '@hanzoteam/platform'
import { coreId } from '@hanzoteam/core'
import coreEng from '@hanzoteam/core/lang/en.json'
import platformEng from '@hanzoteam/platform/lang/en.json'
import slackEng from '@hanzoteam/slack-assets/lang/en.json'

export function registerLoaders (): void {
  addStringsLoader(coreId, async (_lang: string) => coreEng)
  addStringsLoader(platformId, async (_lang: string) => platformEng)
  addStringsLoader(slackId, async (_lang: string) => slackEng)
}
