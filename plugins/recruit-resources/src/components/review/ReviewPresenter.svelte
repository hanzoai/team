<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { getClient } from '@hanzo/presentation'
  import type { Review } from '@hanzo/recruit'
  import recruit from '@hanzo/recruit'
  import { Icon } from '@hanzo/ui'
  import { DocNavLink } from '@hanzo/view-resources'

  export let value: Review
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false

  export let shouldShowAvatar: boolean = true

  const client = getClient()

  const label = client.getHierarchy().getClass(value?._class)?.shortLabel
</script>

{#if value && label}
  <DocNavLink object={value} {inline} {disabled} {accent} {noUnderline}>
    <div class="flex-presenter" class:inline-presenter={inline}>
      {#if shouldShowAvatar}
        <div class="icon">
          <Icon icon={recruit.icon.Review} size={'small'} />
        </div>
      {/if}
      <span class="label nowrap" class:no-underline={noUnderline || disabled} class:fs-bold={accent}>
        {label}-{value.number}
      </span>
    </div>
  </DocNavLink>
{/if}
