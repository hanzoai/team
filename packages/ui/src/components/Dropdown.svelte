<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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
  import type { Asset, IntlString } from '@hanzo/platform'
  import { createEventDispatcher } from 'svelte'
  import { getFocusManager } from '../focus'
  import { showPopup } from '../popups'
  import type { AnySvelteComponent, ButtonKind, ButtonSize, ListItem, TooltipAlignment } from '../types'
  import Button from './Button.svelte'
  import DropdownPopup from './DropdownPopup.svelte'
  import Label from './Label.svelte'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let placeholder: IntlString
  export let items: ListItem[] = []
  export let selected: ListItem | undefined = undefined
  export let disabled: boolean = false
  export let padding: string = '0 .75rem'

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let stretchWidth: boolean | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let focusIndex = -1

  export let withSearch: boolean = true

  let container: HTMLElement
  let opened: boolean = false

  const dispatch = createEventDispatcher()
  const mgr = getFocusManager()
</script>

<div
  bind:this={container}
  class={stretchWidth ? 'flex-row-center' : 'min-w-0'}
  style={stretchWidth ? 'flex: 1' : undefined}
>
  <Button
    {focusIndex}
    icon={icon !== undefined ? selected?.icon ?? icon : undefined}
    iconProps={selected?.iconProps}
    width={stretchWidth ? 'unset' : width ?? 'min-content'}
    flex={stretchWidth ? '1' : undefined}
    {size}
    {kind}
    {justify}
    {disabled}
    {padding}
    showTooltip={{ label, direction: labelDirection }}
    on:click={() => {
      if (!opened && !disabled) {
        opened = true
        showPopup(DropdownPopup, { title: label, items, icon, withSearch }, container, (result) => {
          if (result) {
            selected = result
            dispatch('selected', result)
          }
          opened = false
          mgr?.setFocusPos(focusIndex)
        })
      }
    }}
  >
    <span slot="content" class="overflow-label disabled">
      {#if selected}
        {selected.label}
      {:else}
        <div style="color: var(--theme-darker-color);">
          <Label label={placeholder} />
        </div>
      {/if}
    </span>
  </Button>
</div>
