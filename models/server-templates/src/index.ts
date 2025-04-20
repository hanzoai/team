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

import { Mixin, type Builder } from '@hanzo/model'
import { TTemplateField } from '@hanzo/model-templates'
import { type Resource } from '@hanzo/platform'
import serverTemplates, { type TemplateFieldServerFunc } from '@hanzo/server-templates'
import templates, { type TemplateField } from '@hanzo/templates'

@Mixin(serverTemplates.mixin.ServerTemplateField, templates.class.TemplateField)
export class TServerTemplateField extends TTemplateField implements TemplateField {
  serverFunc!: Resource<TemplateFieldServerFunc>
}

export { serverTemplatesId } from '@hanzo/server-templates'

export function createModel (builder: Builder): void {
  builder.createModel(TServerTemplateField)
}
