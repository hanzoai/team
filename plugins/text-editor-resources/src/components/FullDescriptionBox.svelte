<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Markup } from '@hanzo/core'
  import { IntlString, Asset } from '@hanzo/platform'
  import { EmptyMarkup } from '@hanzo/text'
  import { Label, Icon } from '@hanzo/ui'
  import type { AnySvelteComponent } from '@hanzo/ui'
  import textEditor from '@hanzo/text-editor'

  import StyledTextBox from './StyledTextBox.svelte'
  import IconDescription from './icons/Description.svelte'

  export let label: IntlString = textEditor.string.FullDescription
  export let icon: Asset | AnySvelteComponent = IconDescription
  export let content: Markup = EmptyMarkup
  export let maxHeight: string = '40vh'
  export let enableBackReferences = false

  const dispatch = createEventDispatcher()

  const checkValue = (evt: CustomEvent): void => {
    const res: string | undefined = evt.detail === null ? undefined : evt.detail
    if (content !== res) dispatch('save', res)
  }
</script>

<div class="antiSection">
  <div class="antiSection-header mb-3">
    <div class="antiSection-header__icon">
      <Icon {icon} size={'small'} />
    </div>
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
  </div>
  <StyledTextBox
    {content}
    alwaysEdit
    focusable
    mode={2}
    hideExtraButtons
    {maxHeight}
    on:value={checkValue}
    {enableBackReferences}
  />
</div>
