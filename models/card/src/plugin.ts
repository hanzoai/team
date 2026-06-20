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

import type { ViewletViewAction, Action, ActionCategory, ViewAction } from '@hanzoteam/view'
import { type Card, cardId } from '@hanzoteam/card'
import card from '@hanzoteam/card-resources/src/plugin'
import type { Client, Doc, Ref } from '@hanzoteam/core'
import {} from '@hanzoteam/core'
import { mergeIds, type Resource } from '@hanzoteam/platform'
import { type TagCategory } from '@hanzoteam/tags'
import { type Location, type ResolvedLocation } from '@hanzoteam/ui/src/types'
import { type LocationData } from '@hanzoteam/workbench'
import { type NotificationGroup, type NotificationType } from '@hanzoteam/notification'

export default mergeIds(cardId, card, {
  app: {
    Card: '' as Ref<Doc>
  },
  actionImpl: {
    DeleteMasterTag: '' as ViewAction,
    DuplicateCard: '' as ViewAction,
    EditSpace: '' as ViewAction,
    CreateChild: '' as ViewAction
  },
  action: {
    DeleteMasterTag: '' as Ref<Action>,
    SetParent: '' as Ref<Action<Doc, any>>,
    UnsetParent: '' as Ref<Action<Doc, any>>,
    PublicLink: '' as Ref<Action<Doc, any>>,
    Duplicate: '' as Ref<Action>,
    CreateChild: '' as Ref<Action>
  },
  category: {
    Card: '' as Ref<ActionCategory>,
    Labels: '' as Ref<TagCategory>
  },
  specialViewAction: {
    CardRelationshipTable: '' as Ref<ViewletViewAction>,
    CardTable: '' as Ref<ViewletViewAction>,
    CopyAsMarkdownTable: '' as Ref<ViewletViewAction>,
    CopyAsMarkdownRelationshipTable: '' as Ref<ViewletViewAction>
  },
  ids: {
    MasterTags: '' as Ref<Doc>,
    ManageMasterTags: '' as Ref<Doc>,
    TagRelations: '' as Ref<Doc>,
    CardNotificationGroup: '' as Ref<NotificationGroup>,
    CardCreateNotification: '' as Ref<NotificationType>,
    CardNotification: '' as Ref<NotificationType>,
    CardMessageNotification: '' as Ref<NotificationType>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>,
    LocationData: '' as Resource<(loc: Location) => Promise<LocationData>>
  },
  function: {
    CardTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    GetCardLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    CardCustomLinkMatch: '' as Resource<(doc: Doc) => boolean>,
    CardCustomLinkEncode: '' as Resource<(doc: Doc) => Location>,
    CheckRelationsSectionVisibility: '' as Resource<(doc: Card) => Promise<boolean>>,
    CheckOldMessagesSectionVisibility: '' as Resource<(doc: Card) => Promise<boolean>>,
    CheckCommunicationMessagesSectionVisibility: '' as Resource<(doc: Card) => Promise<boolean>>
  }
})
