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

import { Mixin, Model, type Builder } from '@hanzo/model'
import { TClass, TDoc } from '@hanzo/model-core'
import type { Resource } from '@hanzo/platform'

import core, { DOMAIN_MODEL } from '@hanzo/core'
import type {
  FieldTemplateComponent,
  ObjectDDParticipant,
  ObjectDDParticipantFunc,
  SearchPresenter,
  Trigger,
  TriggerFunc
} from '@hanzo/server-core'
import serverCore from '@hanzo/server-core'

export { serverCoreId } from '@hanzo/server-core'

@Model(serverCore.class.Trigger, core.class.Doc, DOMAIN_MODEL)
export class TTrigger extends TDoc implements Trigger {
  trigger!: Resource<TriggerFunc>
}

@Model(serverCore.mixin.ObjectDDParticipant, core.class.Class)
export class TObjectDDParticipant extends TClass implements ObjectDDParticipant {
  collectDocs!: Resource<ObjectDDParticipantFunc>
}

@Mixin(serverCore.mixin.SearchPresenter, core.class.Class)
export class TSearchPresenter extends TClass implements SearchPresenter {
  title!: FieldTemplateComponent
}

export function createModel (builder: Builder): void {
  builder.createModel(TTrigger, TObjectDDParticipant, TSearchPresenter)
}
