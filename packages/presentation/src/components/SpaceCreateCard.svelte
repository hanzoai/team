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

  import { createEventDispatcher } from 'svelte'
  import { Button, Label } from '@hanzo/ui'
  import presentation from '..'

  export let label: IntlString
  export let okAction: () => void
  export let okLabel: IntlString | undefined = undefined
  export let canSave: boolean = false

  const dispatch = createEventDispatcher()
</script>

<form class="antiCard" on:submit|preventDefault={() => {}}>
  <div class="antiCard-header">
    <div class="antiCard-header__title"><Label {label} /></div>
    {#if $$slots.error}
      <div class="antiCard-header__error">
        <slot name="error" />
      </div>
    {/if}
  </div>
  <div class="antiCard-content px-6"><slot /></div>
  <div class="antiCard-footer">
    <Button
      disabled={!canSave}
      label={okLabel ?? presentation.string.Create}
      kind={'primary'}
      on:click={() => {
        okAction()
        dispatch('close')
      }}
    />
    <div class="mr-4" />
    <Button
      label={presentation.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
    />
  </div>
</form>
