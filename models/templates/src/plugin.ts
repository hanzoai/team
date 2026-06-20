//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hanzo AI Inc.
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

import { type Doc, type Ref } from '@hanzoteam/core'
import { type IntlString, mergeIds, type Resource } from '@hanzoteam/platform'
import { type SettingsCategory } from '@hanzoteam/setting'
import { templatesId } from '@hanzoteam/templates'
import templates from '@hanzoteam/templates-resources/src/plugin'

import { type RefInputAction, type RefInputActionItem } from '@hanzoteam/model-text-editor'
import type { AnyComponent } from '@hanzoteam/ui/src/types'
import { type Action, type ActionCategory } from '@hanzoteam/view'

export default mergeIds(templatesId, templates, {
  ids: {
    Templates: '' as Ref<SettingsCategory>,
    TemplatePopupAction: '' as Ref<RefInputActionItem>
  },
  component: {
    Move: '' as AnyComponent,
    Copy: '' as AnyComponent,
    EditGroup: '' as AnyComponent
  },
  action: {
    Copy: '' as Ref<Action<Doc, any>>,
    Move: '' as Ref<Action<Doc, any>>,
    EditGroup: '' as Ref<Action<Doc, any>>,
    ShowTemplates: '' as Resource<RefInputAction>
  },
  category: {
    MessageTemplate: '' as Ref<ActionCategory>
  },
  string: {
    Title: '' as IntlString,
    Message: '' as IntlString
  }
})
