<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
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
  import type { Ref } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import type { ProjectType, ProjectTypeDescriptor } from '@hanzo/task'
  import task from '@hanzo/task'
  import type { DropdownTextItem } from '@hanzo/ui'
  import { ButtonKind, ButtonSize, DropdownLabels } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'

  export let descriptors: Ref<ProjectTypeDescriptor>[]
  export let type: Ref<ProjectType> | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let focusIndex = -1
  export let disabled: boolean = false

  let types: ProjectType[] = []
  const typesQ = createQuery()
  const query = {
    descriptor: { $in: descriptors }
  }
  $: typesQ.query(task.class.ProjectType, query, (result) => {
    types = result
  })

  let items: DropdownTextItem[] = []
  $: items = types.map((x) => ({ id: x._id, label: x.name }))

  let selectedItem: string | undefined = type

  const dispatch = createEventDispatcher()
  $: {
    type = selectedItem === undefined ? undefined : (selectedItem as Ref<ProjectType>)
    dispatch('change', type)
  }
</script>

<DropdownLabels
  {focusIndex}
  {items}
  {kind}
  {size}
  {disabled}
  icon={task.icon.ManageTemplates}
  bind:selected={selectedItem}
  label={plugin.string.States}
/>
