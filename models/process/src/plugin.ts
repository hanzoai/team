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

import { type CardSection } from '@hanzoteam/card'
import { type Doc, type Ref } from '@hanzoteam/core'
import { mergeIds, type IntlString } from '@hanzoteam/platform'
import { type PresentationMiddlewareFactory } from '@hanzoteam/presentation/src/pipeline'
import { processId } from '@hanzoteam/process'
import process from '@hanzoteam/process-resources/src/plugin'
import { type Action, type ViewAction } from '@hanzoteam/view'

export default mergeIds(processId, process, {
  app: {
    Process: '' as Ref<Doc>
  },
  section: {
    CardProcesses: '' as Ref<CardSection>,
    CardApproveRequest: '' as Ref<CardSection>
  },
  pipeline: {
    ProcessMiddleware: '' as Ref<PresentationMiddlewareFactory>
  },
  ids: {
    ProcessSettings: '' as Ref<Doc>,
    ProcessToDoCreated: '' as Ref<Doc>,
    ApproveRequestCreated: '' as Ref<Doc>
  },
  actionImpl: {
    ContinueExecution: '' as ViewAction
  },
  action: {
    RunProcess: '' as Ref<Action<Doc, any>>,
    ContinueExecution: '' as Ref<Action<Doc, any>>
  },
  string: {
    NewProcessToDo: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    LogAction: '' as IntlString
  }
})
