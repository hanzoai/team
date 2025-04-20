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

import { type Resources } from '@hanzo/platform'
import Templates from './components/Templates.svelte'
import { type TextEditorHandler } from '@hanzo/text-editor'
import { showPopup } from '@hanzo/ui'
import EditorTemplatePopup from './components/EditorTemplatePopup.svelte'
import CreateTemplateCategory from './components/CreateTemplateCategory.svelte'
import TemplatePopup from './components/TemplatePopup.svelte'
import Move from './components/Move.svelte'
import Copy from './components/Copy.svelte'
import EditGroup from './components/EditGroup.svelte'
import { getTemplateDataProvider } from './utils'

function ShowTemplates (element: HTMLElement, editor: TextEditorHandler): void {
  showPopup(EditorTemplatePopup, { editor }, element)
}

export default async (): Promise<Resources> => ({
  component: {
    Templates,
    TemplatePopup,
    CreateTemplateCategory,
    Move,
    Copy,
    EditGroup
  },
  action: {
    ShowTemplates
  },
  function: {
    GetTemplateDataProvider: getTemplateDataProvider
  }
})
