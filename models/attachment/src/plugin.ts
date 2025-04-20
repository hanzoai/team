//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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

import type { ActivityMessage, DocUpdateMessageViewlet } from '@hanzo/activity'
import { attachmentId } from '@hanzo/attachment'
import attachment from '@hanzo/attachment-resources/src/plugin'
import type { Ref, Doc } from '@hanzo/core'
import type { IntlString, Resource } from '@hanzo/platform'
import { mergeIds } from '@hanzo/platform'
import type { AnyComponent } from '@hanzo/ui/src/types'
import type { ActionCategory } from '@hanzo/view'

export default mergeIds(attachmentId, attachment, {
  component: {
    AttachmentPresenter: '' as AnyComponent,
    PreviewWidget: '' as AnyComponent,
    PreviewPopupActions: '' as AnyComponent
  },
  string: {
    AddAttachment: '' as IntlString,
    File: '' as IntlString,
    Name: '' as IntlString,
    Size: '' as IntlString,
    Type: '' as IntlString,
    Photo: '' as IntlString,
    Date: '' as IntlString,
    LastModified: '' as IntlString,
    SavedAttachments: '' as IntlString,
    Description: '' as IntlString,
    PinAttachment: '' as IntlString,
    UnPinAttachment: '' as IntlString,
    FilterAttachments: '' as IntlString,
    RemovedAttachment: '' as IntlString,
    ContentType: '' as IntlString
  },
  ids: {
    AttachmentCreatedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>,
    AttachmentRemovedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>
  },
  activity: {
    AttachmentsUpdatedMessage: '' as AnyComponent
  },
  category: {
    Attachments: '' as Ref<ActionCategory>
  },
  filter: {
    AttachmentsFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
  }
})
