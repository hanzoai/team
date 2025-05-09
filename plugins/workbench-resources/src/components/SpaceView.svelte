<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
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
  import core, { Class, Doc, Ref, Space, WithLookup } from '@hanzo/core'
  import { IntlString } from '@hanzo/platform'
  import { getClient, reduceCalls } from '@hanzo/presentation'
  import { AnyComponent, Component, resolvedLocationStore } from '@hanzo/ui'
  import view, { ViewOptions, Viewlet } from '@hanzo/view'
  import {
    activeViewlet,
    getViewOptions,
    makeViewletKey,
    updateActiveViewlet,
    viewOptionStore
  } from '@hanzo/view-resources'
  import type { ViewConfiguration } from '@hanzo/workbench'
  import { onDestroy } from 'svelte'
  import SpaceContent from './SpaceContent.svelte'
  import SpaceHeader from './SpaceHeader.svelte'

  export let currentSpace: Ref<Space> | undefined
  export let currentView: ViewConfiguration | undefined
  export let createItemDialog: AnyComponent | undefined = undefined
  export let createItemLabel: IntlString | undefined = undefined

  let search: string = ''
  let viewlet: WithLookup<Viewlet> | undefined = undefined
  let viewOptions: ViewOptions | undefined
  let space: Space | undefined
  let _class: Ref<Class<Doc>> | undefined = undefined
  let header: AnyComponent | undefined

  const client = getClient()

  let viewlets: Array<WithLookup<Viewlet>> = []

  let key = makeViewletKey()
  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      key = makeViewletKey(loc)
    })
  )

  $: active = $activeViewlet[key]

  const update = reduceCalls(async function update (
    active: Ref<Viewlet> | null,
    currentSpace?: Ref<Space>,
    attachTo?: Ref<Class<Doc>>
  ): Promise<void> {
    if (currentSpace === undefined) {
      space = undefined
      return
    }
    space = await client.findOne(core.class.Space, { _id: currentSpace })
    if (space === undefined) {
      header = undefined
    } else {
      header = await getHeader(space._class)
    }
    if (attachTo) {
      viewlets = await client.findAll(
        view.class.Viewlet,
        { attachTo, variant: { $exists: false } },
        {
          lookup: {
            descriptor: view.class.ViewletDescriptor
          }
        }
      )
      if (header !== undefined) {
        viewlet = updateActiveViewlet(viewlets, active)
        viewOptions = getViewOptions(viewlet, $viewOptionStore)
      }
      _class = attachTo
    }
  })

  $: void update(active, currentSpace, currentView?.class)

  const hierarchy = client.getHierarchy()
  async function getHeader (_class: Ref<Class<Space>>): Promise<AnyComponent | undefined> {
    const clazz = hierarchy.getClass(_class)
    const headerMixin = hierarchy.as(clazz, view.mixin.SpaceHeader)
    if (headerMixin?.header == null && clazz.extends != null) return await getHeader(clazz.extends)
    return headerMixin.header
  }
  function setViewlet (e: CustomEvent<WithLookup<Viewlet>>): void {
    viewlet = e.detail
  }
</script>

{#if _class && space}
  {#if header}
    <Component
      is={header}
      props={{ spaceId: space._id, viewlets, viewlet, createItemDialog, createItemLabel }}
      on:change={setViewlet}
    />
  {:else}
    <SpaceHeader
      viewletQuery={{ attachTo: currentView?.class, variant: { $exists: false } }}
      spaceId={space._id}
      {_class}
      {createItemDialog}
      {createItemLabel}
      bind:viewOptions
      bind:search
      bind:viewlet
    />
  {/if}
  {#if viewOptions}
    <SpaceContent space={space._id} {_class} {createItemDialog} {viewOptions} {createItemLabel} bind:search {viewlet} />
  {/if}
{/if}
