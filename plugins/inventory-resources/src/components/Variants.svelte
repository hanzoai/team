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
  import type { Doc, Ref } from '@hanzo/core'
  import { Button, eventToHTMLElement, Icon, IconAdd, Label, showPopup } from '@hanzo/ui'
  import { Table } from '@hanzo/view-resources'
  import inventory from '../plugin'
  import CreateVariant from './CreateVariant.svelte'

  export let objectId: Ref<Doc>

  export let variants: number

  const create = (ev: MouseEvent): void => {
    showPopup(CreateVariant, { product: objectId }, eventToHTMLElement(ev))
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label label={inventory.string.Variants} />
    </span>
    <Button icon={IconAdd} kind={'ghost'} on:click={create} />
  </div>
  {#if variants > 0}
    <Table
      _class={inventory.class.Variant}
      config={['', 'sku', 'modifiedOn']}
      options={{}}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: variants }}
    />
  {:else}
    <div class="antiSection-empty solid flex-col-center mt-3">
      <div class="content-color">
        <Icon size={'large'} icon={inventory.icon.Variant} />
      </div>
      <span class="text-sm content-dark-color mt-2">
        <Label label={inventory.string.NoVariantsForProduct} />
      </span>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <span class="text-sm content-color over-underline" on:click={create}>
        <Label label={inventory.string.CreateVariant} />
      </span>
    </div>
  {/if}
</div>
