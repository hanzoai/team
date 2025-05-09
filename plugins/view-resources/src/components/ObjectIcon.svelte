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
  import view from '@hanzo/view'
  import { AnySvelteComponent, Component, Icon, IconSize } from '@hanzo/ui'
  import type { Doc } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'

  import { classIcon } from '../utils'
  import { Asset } from '@hanzo/platform'

  export let value: Doc
  export let size: IconSize = 'small'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let withObjectIcon = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getObjectIcon (value: Doc): Asset | undefined {
    if (!withObjectIcon) return undefined
    return (value as any)?.icon
  }

  $: iconMixin = hierarchy.classHierarchyMixin(value._class, view.mixin.ObjectIcon)
</script>

{#if iconMixin}
  <Component is={iconMixin.component} props={{ value, size }} />
{:else}
  {@const objectIcon = icon ?? classIcon(client, value._class) ?? getObjectIcon(value)}
  {#if objectIcon}
    <Icon icon={objectIcon} {size} />
  {/if}
{/if}
