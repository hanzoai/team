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
  import type { IntlString } from '@hanzo/platform'
  import type { ButtonSize, ButtonKind, EditStyle } from '@hanzo/ui'
  import { EditBox, Label, showPopup, eventToHTMLElement, Button } from '@hanzo/ui'
  import EditBoxPopup from './EditBoxPopup.svelte'

  // export let label: IntlString
  export let placeholder: IntlString
  export let value: string
  export let autoFocus: boolean = false
  export let select: boolean = false
  export let onChange: (value: string) => void = () => {}
  export let kind: ButtonKind | undefined = undefined
  export let readonly = false
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'
  export let editKind: EditStyle | undefined = undefined

  let shown: boolean = false

  function _onchange (ev: Event) {
    onChange((ev.target as HTMLInputElement).value)
  }
</script>

{#if kind}
  <Button
    {kind}
    {size}
    {justify}
    {width}
    on:click={(ev) => {
      if (!shown && !readonly) {
        showPopup(EditBoxPopup, { value }, eventToHTMLElement(ev), (res) => {
          if (res !== undefined) {
            value = res
            onChange(value)
          }
          shown = false
        })
      }
    }}
  >
    <svelte:fragment slot="content">
      {#if value}
        <span class="caption-color overflow-label pointer-events-none">{value}</span>
      {:else}
        <span class="content-dark-color pointer-events-none"><Label label={placeholder} /></span>
      {/if}
    </svelte:fragment>
  </Button>
{:else if readonly}
  {#if value}
    <span class="overflow-label">{value}</span>
  {:else}
    <span class="content-dark-color"><Label label={placeholder} /></span>
  {/if}
{:else}
  <EditBox {placeholder} bind:value {autoFocus} {select} on:change={_onchange} kind={editKind} />
{/if}
