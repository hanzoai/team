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
  import { Channel, chunterId } from '@hanzo/chunter'
  import { getClient } from '@hanzo/presentation'
  import { Icon, tooltip } from '@hanzo/ui'
  import { NavLink } from '@hanzo/view-resources'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { ObjectPresenterType } from '@hanzo/view'

  export let value: Channel
  export let inline: boolean = false
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'

  const client = getClient()

  $: icon = client.getHierarchy().getClass(value._class).icon
</script>

{#if value}
  {#if type === 'link'}
    <NavLink app={chunterId} space={`${value._id}|${value._class}`}>
      <div class="flex-presenter">
        {#if !inline && shouldShowAvatar}
          <div class="icon">
            {#if icon}
              <Icon {icon} size={'small'} />
            {/if}
          </div>
        {/if}
        <span class="label">{value.name}</span>
      </div>
    </NavLink>
  {:else}
    <span class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>{value.name}</span>
  {/if}
{/if}
