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
  import type { Class, Ref, Space } from '@hanzo/core'
  import core from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { EditBox, Label, Scroller, Panel, Component } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import workbench from '../../plugin'
  import contact from '@hanzo/contact'

  export let _id: Ref<Space>
  export let _class: Ref<Class<Space>>

  let space: Space

  // export let label: IntlString
  // export let icon: Asset | AnySvelteComponent

  const dispatch = createEventDispatcher()

  const client = getClient()
  const clazz = client.getHierarchy().getClass(_class)

  const query = createQuery()
  $: query.query(
    core.class.Space,
    { _id },
    (result) => {
      space = result[0]
    },
    { limit: 1 }
  )

  function onNameChange (ev: Event) {
    const value = (ev.target as HTMLInputElement).value
    if (value.trim().length > 0) {
      client.updateDoc(_class, space.space, space._id, { name: value })
    } else {
      // Just refresh value
      query.query(
        core.class.Space,
        { _id },
        (result) => {
          space = result[0]
        },
        { limit: 1 }
      )
    }
  }
</script>

<Panel
  isHeader={false}
  isAside={false}
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    {#if clazz}
      <div class="title not-active"><Label label={clazz.label} /></div>
    {/if}
  </svelte:fragment>

  <Scroller>
    <div class="popupPanel-body__main-content py-10 clear-mins">
      {#if space}
        <EditBox
          label={clazz.label}
          bind:value={space.name}
          placeholder={clazz.label}
          autoFocus
          on:change={onNameChange}
        />
        <!-- <AttributeBarEditor maxWidth="39rem" object={space} key="name"/> -->
        <!-- <ToggleWithLabel label={workbench.string.MakePrivate} description={workbench.string.MakePrivateDescription}/> -->
        <div class="flex-col mt-10">
          <span class="fs-title text-xl overflow-label mb-2"><Label label={workbench.string.Members} /></span>
          <Component is={contact.component.SpaceMembers} props={{ space }} />
        </div>
      {/if}
    </div>
  </Scroller>
</Panel>
