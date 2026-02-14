//
// Copyright © 2026 Hanzo AI Inc.
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

import { type Builder, Mixin } from '@hanzo/model'
import core, { TClass } from '@hanzo/model-core'
import converter, { type MarkdownValueFormatter, type ValueFormatter } from '@hanzo/converter'
import type { Resource } from '@hanzo/platform'

export { converterId } from '@hanzo/converter'

@Mixin(converter.mixin.MarkdownValueFormatter, core.class.Class)
export class TMarkdownValueFormatter extends TClass implements MarkdownValueFormatter {
  formatter!: Resource<ValueFormatter>
}

export function createModel (builder: Builder): void {
  builder.createModel(TMarkdownValueFormatter)
}
