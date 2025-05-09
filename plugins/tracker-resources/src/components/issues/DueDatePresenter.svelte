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
  import { WithLookup } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import task from '@hanzo/task'
  import { Issue } from '@hanzo/tracker'
  import { ButtonKind, ButtonSize, DueDatePresenter } from '@hanzo/ui'

  export let value: WithLookup<Issue>
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'medium'
  export let isEditable = true

  const client = getClient()

  $: dueDateMs = value.dueDate

  const handleDueDateChanged = async (newDate: number | null) => {
    await client.updateCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection,
      { dueDate: newDate }
    )
  }

  $: shouldRenderPresenter = dueDateMs != null

  $: ignoreOverDue =
    value.$lookup?.status?.category === task.statusCategory.Won ||
    value.$lookup?.status?.category === task.statusCategory.Lost
</script>

<DueDatePresenter
  value={dueDateMs}
  shouldRender={shouldRenderPresenter}
  onChange={handleDueDateChanged}
  editable={isEditable}
  {size}
  {kind}
  shouldIgnoreOverdue={ignoreOverDue}
  on:resize
/>
