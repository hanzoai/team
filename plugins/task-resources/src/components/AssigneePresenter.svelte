<!--
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
-->
<script lang="ts">
  import contact, { Employee, Person, getName } from '@hanzo/contact'
  import { Class, Doc, Ref, Space } from '@hanzo/core'
  import { Task } from '@hanzo/task'
  import { getClient } from '@hanzo/presentation'
  import { UsersPopup, employeeByIdStore } from '@hanzo/contact-resources'
  import { AttributeModel } from '@hanzo/view'
  import { eventToHTMLElement, showPopup } from '@hanzo/ui'
  import { getObjectPresenter } from '@hanzo/view-resources'
  import { IntlString, getEmbeddedLabel } from '@hanzo/platform'
  import task from '../plugin'

  export let value: Ref<Person> | Person | null | undefined
  export let issueId: Ref<Task>
  export let defaultClass: Ref<Class<Doc>> | undefined = undefined
  export let currentSpace: Ref<Space> | undefined = undefined
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = false
  export let defaultName: IntlString | undefined = undefined
  export let placeholderLabel: IntlString | undefined = undefined

  $: employeeValue = typeof value === 'string' ? $employeeByIdStore.get(value as Ref<Employee>) : value

  const client = getClient()

  let presenter: AttributeModel | undefined

  $: if (employeeValue || defaultClass) {
    if (employeeValue) {
      getObjectPresenter(client, employeeValue._class, { key: '' }).then((p) => {
        presenter = p
      })
    } else if (defaultClass) {
      getObjectPresenter(client, defaultClass, { key: '' }).then((p) => {
        presenter = p
      })
    }
  }

  const handleAssigneeChanged = async (result: Employee | null | undefined) => {
    if (!isEditable || result === undefined) {
      return
    }

    const currentIssue = await client.findOne(task.class.Task, { space: currentSpace, _id: issueId })

    if (currentIssue === undefined) {
      return
    }

    const newAssignee = result === null ? null : result._id

    await client.updateCollection(
      currentIssue._class,
      currentIssue.space,
      currentIssue._id,
      currentIssue.attachedTo,
      currentIssue.attachedToClass,
      currentIssue.collection,
      { assignee: newAssignee }
    )
  }

  const handleAssigneeEditorOpened = async (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    event?.preventDefault()
    event?.stopPropagation()

    showPopup(
      UsersPopup,
      {
        _class: contact.mixin.Employee,
        selected: employeeValue?._id,
        docQuery: {
          active: true
        },
        allowDeselect: true,
        placeholder: placeholderLabel ?? presenter?.label ?? task.string.AssignThisTask
      },
      eventToHTMLElement(event),
      handleAssigneeChanged
    )
  }
</script>

{#if presenter}
  <svelte:component
    this={presenter.presenter}
    {value}
    {defaultName}
    avatarSize={'x-small'}
    disabled={false}
    shouldShowPlaceholder={true}
    shouldShowName={shouldShowLabel}
    onEmployeeEdit={handleAssigneeEditorOpened}
    onEdit={handleAssigneeEditorOpened}
    tooltipLabels={{
      personLabel: employeeValue ? getEmbeddedLabel(getName(client.getHierarchy(), employeeValue)) : undefined,
      placeholderLabel: placeholderLabel ?? presenter.label
    }}
  />
  <!-- TODO: Change assignee -->
{/if}
