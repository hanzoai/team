<!--
//
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
//
-->
<script lang="ts">
  import { Drive } from '@hanzo/drive'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { Icon, tooltip } from '@hanzo/ui'
  import { DocNavLink, ObjectMention } from '@hanzo/view-resources'
  import { ObjectPresenterType } from '@hanzo/view'

  import drive from '../plugin'

  export let value: Drive
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'
</script>

{#if value}
  {#if inline}
    <ObjectMention object={value} {disabled} />
  {:else if type === 'link'}
    <DocNavLink {disabled} object={value} {accent} {noUnderline}>
      <div class="flex-presenter" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
        {#if shouldShowAvatar}
          <div class="icon">
            <Icon icon={drive.icon.Drive} size={'small'} />
          </div>
        {/if}
        <span class="label no-underline nowrap" class:fs-bold={accent}>
          {value.name}
        </span>
      </div>
    </DocNavLink>
  {:else if type === 'text'}
    <span class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(value.name) }}>
      {value.name}
    </span>
  {/if}
{/if}
