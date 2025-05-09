<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, Space, getCurrentAccount } from '@hanzo/core'
  import { Asset, getResource } from '@hanzo/platform'
  import { AnyComponent, AnySvelteComponent, ButtonSize } from '@hanzo/ui'
  import { ObjectCreate } from '../types'
  import { createQuery } from '../utils'
  import DocPopup from './DocPopup.svelte'
  import SpaceInfo from './SpaceInfo.svelte'
  import { ComponentType } from 'svelte'

  export let _class: Ref<Class<Space>>
  export let selected: Ref<Space> | undefined
  export let spaceQuery: DocumentQuery<Space> | undefined = {}
  export let spaceOptions: FindOptions<Space> | undefined = {}
  export let create: ObjectCreate | undefined = undefined
  export let size: ButtonSize = 'small'
  export let allowDeselect = false
  export let component: AnyComponent | AnySvelteComponent | undefined = undefined
  export let componentProps: any | undefined = undefined
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = undefined
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType | undefined = undefined

  let search: string | undefined = undefined

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => (doc as Space).name
        }
      : undefined

  const query = createQuery()
  $: query.query(
    _class,
    {
      members: getCurrentAccount().uuid,
      ...(spaceQuery ?? {}),
      ...(search !== undefined && search !== ''
        ? {
            name: { $like: `%${search}%` }
          }
        : {})
    },
    (res) => {
      spaces = res
    },
    spaceOptions
  )

  let is: AnySvelteComponent | undefined = undefined

  $: getComponent(component)

  async function getComponent (component: AnySvelteComponent | AnyComponent | undefined): Promise<void> {
    if (typeof component === 'string') {
      is = await getResource(component)
    } else {
      is = component
    }
  }

  let spaces: Space[] = []
</script>

<DocPopup
  {_class}
  objects={spaces}
  {selected}
  multiSelect={false}
  {allowDeselect}
  shadows={true}
  create={_create}
  on:update
  on:close
  on:search={(e) => (search = e.detail)}
>
  <svelte:fragment slot="item" let:item={space}>
    {#if is}
      <svelte:component this={is} {...componentProps} {size} value={space} />
    {:else}
      <SpaceInfo {size} value={space} {iconWithEmoji} {defaultIcon} />
    {/if}
  </svelte:fragment>
</DocPopup>
