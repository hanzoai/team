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
  import { UserBox } from '@hanzo/contact-resources'
  import type { Lead } from '@hanzo/lead'
  import { EditBox, Grid } from '@hanzo/ui'
  import contact from '@hanzo/contact'
  import { createEventDispatcher, onMount } from 'svelte'
  import lead from '../plugin'
  import { restrictionStore } from '@hanzo/view-resources'

  export let object: Lead
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldTitle: string = ''
  let rawTitle: string = ''
  $: if (oldTitle !== object.title) {
    oldTitle = object.title
    rawTitle = object.title
  }

  function change (field: string, value: any) {
    client.updateDoc(object._class, object.space, object._id, { [field]: value })
  }

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'number', 'title', 'customer', 'identifier'] })
  })
</script>

{#if object !== undefined}
  <Grid column={2} rowGap={1}>
    <EditBox
      bind:value={rawTitle}
      placeholder={lead.string.LeadPlaceholder}
      kind={'large-style'}
      disabled={readonly}
      focusable
      on:blur={() => {
        if (rawTitle !== object.title) change('title', rawTitle)
      }}
    />
    <UserBox
      _class={contact.class.Contact}
      label={lead.string.Customer}
      placeholder={lead.string.SelectCustomer}
      showNavigate={!$restrictionStore.disableNavigation}
      {readonly}
      kind={'link'}
      size={'x-large'}
      justify={'left'}
      width={'100%'}
      bind:value={object.attachedTo}
      on:change={() => {
        change('attachedTo', object.attachedTo)
      }}
    />
  </Grid>
{/if}
