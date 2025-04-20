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

import { type Ref } from '@hanzo/core'
import { type IntlString, mergeIds } from '@hanzo/platform'
import { type TagCategory, tagsId } from '@hanzo/tags'
import tags from '@hanzo/tags-resources/src/plugin'
import type { AnyComponent } from '@hanzo/ui/src/types'
import { type ViewAction } from '@hanzo/model-view'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import view from '@hanzo/view'

export default mergeIds(tagsId, tags, {
  // Without it, CLI version is failed with some svelte dependency exception.
  component: {
    Tags: '' as AnyComponent,
    TagReferencePresenter: '' as AnyComponent,
    TagsItemPresenter: '' as AnyComponent,
    TagsFilter: '' as AnyComponent,
    TagsFilterPresenter: '' as AnyComponent
  },
  string: {
    TagElementLabel: '' as IntlString,
    TitleLabel: '' as IntlString,
    DescriptionLabel: '' as IntlString,
    ColorLabel: '' as IntlString,
    WeightLabel: '' as IntlString,
    TagReferenceLabel: '' as IntlString,
    TargetClassLabel: '' as IntlString,
    TargetCategoryLabel: '' as IntlString,
    TagReference: '' as IntlString,
    AssetLabel: '' as IntlString,
    CategoryTargetClass: '' as IntlString,
    CategoryTagsLabel: '' as IntlString,
    DefaultLabel: '' as IntlString
  },
  category: {
    Category: '' as Ref<TagCategory>
  },
  actionImpl: {
    Open: '' as ViewAction
  }
})
