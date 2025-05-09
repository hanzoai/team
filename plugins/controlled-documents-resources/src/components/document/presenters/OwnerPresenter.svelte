<!--
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
-->
<script lang="ts">
  import documents, { Document } from '@hanzo/controlled-documents'
  import { Employee, getCurrentEmployee } from '@hanzo/contact'
  import { PersonPresenter, checkMyPermission, permissionsStore } from '@hanzo/contact-resources'
  import { Ref } from '@hanzo/core'
  import { IntlString } from '@hanzo/platform'
  import { getClient } from '@hanzo/presentation'
  import { eventToHTMLElement, showPopup } from '@hanzo/ui'

  import document from '../../../plugin'
  import ChangeOwnerPopup from '../popups/ChangeOwnerPopup.svelte'

  export let _id: Ref<Employee> | undefined
  export let value: Employee | null | undefined
  export let object: Document
  export let isEditable: boolean = false
  export let shouldShowLabel: boolean = false
  export let defaultName: IntlString | undefined = undefined

  const client = getClient()
  const me = getCurrentEmployee()

  $: canChangeOwner =
    isEditable &&
    (object.owner === me ||
      checkMyPermission(documents.permission.UpdateDocumentOwner, object.space, $permissionsStore))

  const handleOwnerChanged = async (result: Employee | null | undefined) => {
    if (!isEditable || !result || result._id === object.owner) {
      return
    }

    await client.update(object, { owner: result._id })
  }

  const handleOwnerEditorOpened = async (event: MouseEvent) => {
    if (!canChangeOwner) {
      return
    }

    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      ChangeOwnerPopup,
      {
        object
      },
      eventToHTMLElement(event),
      handleOwnerChanged
    )
  }
</script>

<PersonPresenter
  {defaultName}
  value={_id ?? value?._id}
  disabled={!canChangeOwner}
  avatarSize={'x-small'}
  shouldShowPlaceholder={true}
  shouldShowName={shouldShowLabel}
  tooltipLabels={{ personLabel: document.string.AssignedTo, placeholderLabel: document.string.Unassigned }}
  onEdit={canChangeOwner ? handleOwnerEditorOpened : undefined}
/>
