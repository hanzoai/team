<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { SpaceTypeDescriptor, generateId } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import { ProjectTypeDescriptor, createProjectType } from '@hanzo/task'
  import { ToggleWithLabel } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'

  const client = getClient()

  export let descriptor: SpaceTypeDescriptor
  export let name: string = ''
  export const handleTypeCreated: () => Promise<void> = createType

  let classic: boolean = true
  $: projDescriptor = descriptor as ProjectTypeDescriptor

  const dispatch = createEventDispatcher()

  async function createType (): Promise<void> {
    if (projDescriptor === undefined) {
      return
    }
    await createProjectType(
      client,
      {
        name,
        descriptor: projDescriptor._id,
        description: '',
        tasks: [],
        roles: 0,
        classic: projDescriptor.allowedClassic === true ? classic : false
      },
      [],
      generateId()
    )
    dispatch('close')
  }
</script>

{#if projDescriptor?.allowedClassic === true}
  <ToggleWithLabel label={task.string.ClassicProject} bind:on={classic} />
{/if}
