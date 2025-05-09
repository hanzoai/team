<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hanzo/core'
  import { ActionContext } from '@hanzo/presentation'
  import { FadeOptions, Scroller, tableSP } from '@hanzo/ui'
  import { BuildModelKey, ViewOptionModel, ViewOptions, Viewlet } from '@hanzo/view'
  import { onMount } from 'svelte'
  import { focusStore, ListSelectionProvider, SelectDirection } from '../selection'
  import { LoadingProps } from '../utils'
  import Table from './Table.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let totalQuery: DocumentQuery<Doc> | undefined = undefined
  export let showNotification: boolean = false
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: Array<BuildModelKey | string>
  // export let showFilterBar = true
  export let enableChecking = true
  export let tableId: string | undefined = undefined
  export let fade: FadeOptions = tableSP
  export let prefferedSorting: string = 'modifiedOn'
  export let viewOptions: ViewOptions | undefined = undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let viewlet: Viewlet | undefined = undefined
  export let readonly = false

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  let table: Table
  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection, noScroll?: boolean) => {
      if (dir === 'vertical') {
        // Select next
        table?.select(offset, of, noScroll)
      }
    }
  )
  const selection = listProvider.selection

  onMount(() => {
    ;(document.activeElement as HTMLElement)?.blur()
  })
</script>

<svelte:window />

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<Scroller {fade} horizontal={true}>
  <Table
    bind:this={table}
    {_class}
    {config}
    {options}
    {query}
    {totalQuery}
    {showNotification}
    {baseMenuClass}
    {loadingProps}
    highlightRows={true}
    {enableChecking}
    showFooter
    checked={$selection ?? []}
    {prefferedSorting}
    {tableId}
    {viewOptions}
    viewOptionsConfig={viewOptionsConfig ?? viewlet?.viewOptions?.other}
    selection={listProvider.current($focusStore)}
    {readonly}
    on:row-focus={(evt) => {
      listProvider.updateFocus(evt.detail)
    }}
    on:content={(evt) => {
      listProvider.update(evt.detail)
    }}
    on:check={(evt) => {
      listProvider.updateSelection(evt.detail.docs, evt.detail.value)
    }}
  />
</Scroller>
