<!--
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
  import { Doc } from '@hanzo/core'
  import { IntlString, Asset } from '@hanzo/platform'
  import { KeyedAttribute } from '@hanzo/presentation'
  import { Label, Icon } from '@hanzo/ui'
  import type { AnySvelteComponent } from '@hanzo/ui'
  import textEditor, { CollaborationUser } from '@hanzo/text-editor'

  import CollaborativeAttributeBox from './CollaborativeAttributeBox.svelte'
  import IconDescription from './icons/Description.svelte'

  export let object: Doc
  export let key: KeyedAttribute

  export let user: CollaborationUser
  export let userComponent: AnySvelteComponent | undefined = undefined

  export let label: IntlString = textEditor.string.FullDescription
  export let icon: Asset | AnySvelteComponent = IconDescription

  let element: HTMLElement | undefined
</script>

<div class="antiSection" bind:this={element}>
  <div class="antiSection-header mb-3">
    <div class="antiSection-header__icon">
      <Icon {icon} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
  </div>
  <CollaborativeAttributeBox
    {object}
    {key}
    {user}
    {userComponent}
    boundary={element?.parentElement ?? undefined}
    on:focus
    on:blur
    on:update
  />
</div>
