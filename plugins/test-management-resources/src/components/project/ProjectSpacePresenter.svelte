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
  import { Ref, Space } from '@hanzo/core'
  import { getResource } from '@hanzo/platform'
  import { TestProject } from '@hanzo/test-management'
  import {
    IconWithEmoji,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    themeStore,
    type Action
  } from '@hanzo/ui'
  import view from '@hanzo/view'
  import { NavLink, TreeNode } from '@hanzo/view-resources'
  import { SpacesNavModel, SpecialNavModel } from '@hanzo/workbench'
  import { SpecialElement } from '@hanzo/workbench-resources'

  export let space: TestProject
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let getActions: (space: TestProject) => Promise<Action[]> = async () => []
  export let deselect: boolean = false
  export let forciblyСollapsed: boolean = false

  let specials: SpecialNavModel[] = []

  async function updateSpecials (model: SpacesNavModel, space: TestProject): Promise<void> {
    const newSpecials: SpecialNavModel[] = []
    for (const sp of model.specials ?? []) {
      let shouldAdd = true
      if (sp.visibleIf !== undefined) {
        const visibleIf = await getResource(sp.visibleIf)
        if (visibleIf !== undefined) {
          shouldAdd = await visibleIf([space])
        }
      }
      if (shouldAdd) {
        newSpecials.push(sp)
      }
    }
    specials = newSpecials
  }

  $: if (model != null) {
    void updateSpecials(model, space)
  }
  $: visible =
    (!deselect && currentSpace !== undefined && currentSpecial !== undefined && space._id === currentSpace) ||
    forciblyСollapsed
</script>

{#if specials}
  <TreeNode
    _id={space?._id}
    icon={space?.icon === view.ids.IconWithEmoji ? IconWithEmoji : space?.icon ?? model?.icon}
    iconProps={space?.icon === view.ids.IconWithEmoji
      ? { icon: space.color }
      : {
          fill:
            space.color !== undefined
              ? getPlatformColorDef(space.color, $themeStore.dark).icon
              : getPlatformColorForTextDef(space.name, $themeStore.dark).icon
        }}
    title={space.name}
    type={'nested'}
    highlighted={space._id === currentSpace}
    {visible}
    actions={() => getActions(space)}
    {forciblyСollapsed}
  >
    {#each specials as special}
      <NavLink space={space._id} special={special.id}>
        <SpecialElement
          indent
          label={special.label}
          icon={special.icon}
          selected={deselect ? false : currentSpace === space._id && special.id === currentSpecial}
        />
      </NavLink>
    {/each}

    <svelte:fragment slot="visible">
      {#if visible}
        {@const item = specials.find((sp) => sp.id === currentSpecial && currentSpace === space._id)}
        {#if item}
          <NavLink space={space._id} special={item.id}>
            <SpecialElement indent label={item.label} icon={item.icon} selected forciblyСollapsed />
          </NavLink>
        {/if}
      {/if}
    </svelte:fragment>
  </TreeNode>
{/if}
