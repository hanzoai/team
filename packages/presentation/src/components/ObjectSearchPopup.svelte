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
  import { Ref, RelatedDocument, DocumentQuery } from '@hanzo/core'

  import { getResource, IntlString } from '@hanzo/platform'
  import ui, {
    createFocusManager,
    deviceOptionsStore,
    FocusHandler,
    IconSearch,
    Label,
    ListView,
    resizeObserver,
    Icon,
    tooltip,
    EditWithIcon
  } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '../plugin'
  import { ObjectSearchCategory, ObjectSearchResult } from '../types'
  import { getClient } from '../utils'
  import { hasResource, reduceCalls } from '..'

  export let query: string = ''
  export let label: IntlString | undefined = undefined
  export let relatedDocuments: RelatedDocument[] | undefined = undefined
  export let ignore: RelatedDocument[] | undefined = undefined
  export let allowCategory: Ref<ObjectSearchCategory>[] | undefined = undefined
  // export let hideButtons = false

  let items: ObjectSearchResult[] = []

  let categories: ObjectSearchCategory[] = []
  let categoryStatus: Record<Ref<ObjectSearchCategory>, number> = {}

  let category: ObjectSearchCategory | undefined
  const categoryQuery: DocumentQuery<ObjectSearchCategory> = {
    context: 'search'
  }
  if (allowCategory !== undefined) {
    categoryQuery._id = { $in: allowCategory }
  }

  void getClient()
    .findAll(presentation.class.ObjectSearchCategory, categoryQuery)
    .then((r) => {
      categories = r.filter((it) => hasResource(it.query))
      category = categories[0]
    })

  const dispatch = createEventDispatcher()

  let list: ListView
  let selection = 0

  function dispatchItem (item: ObjectSearchResult): void {
    dispatch('close', item)
  }

  export function onKeyDown (key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.key === 'Tab') {
      key.stopPropagation()
      key.preventDefault()
      const visibleCategory = categories.filter((it) => (categoryStatus[it._id] ?? 0) > 0)
      const pos = category !== undefined ? visibleCategory.findIndex((it) => it._id === category?._id) : -1
      if (pos >= 0) {
        category = visibleCategory[(pos + 1) % visibleCategory.length]
        return true
      }
    }
    if (key.key === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const item = items[selection]
      if (item != null) {
        dispatchItem(item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  export function done (): void {}

  const updateItems = reduceCalls(async function updateItems (
    cat: ObjectSearchCategory | undefined,
    query: string,
    relatedDocuments?: RelatedDocument[]
  ): Promise<void> {
    if (cat === undefined) {
      return
    }

    const newCategoryStatus: Record<Ref<ObjectSearchCategory>, number> = {}
    const f = await getResource(cat.query)

    const client = getClient()
    const result = await f(client, query, { in: relatedDocuments, nin: ignore })
    // We need to sure, results we return is for proper category.
    if (cat._id === category?._id) {
      items = result
      if (selection > items.length) {
        selection = 0
      }
      newCategoryStatus[cat._id] = result.length
    }

    // Automatic try next category and show available items if so
    for (const c of categories) {
      if (c._id !== cat._id) {
        const ff = await getResource(c.query)
        const cresult = await ff(client, query, { in: relatedDocuments, nin: ignore })
        newCategoryStatus[c._id] = cresult.length
      }
    }
    categoryStatus = newCategoryStatus

    if (items.length === 0) {
      for (const c of categories) {
        if (category !== c && (categoryStatus[c._id] ?? 0) > 0) {
          category = c
          break
        }
      }
    }
  })
  $: void updateItems(category, query, relatedDocuments)

  const manager = createFocusManager()

  const isStatusDisabled = (status: number) => status === 0
</script>

<FocusHandler {manager} />

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<form class="antiPopup" on:keydown={onKeyDown} use:resizeObserver={() => dispatch('changeSize')}>
  <div class="ap-menuHeader">
    {#if label}
      <div class="ap-subheader caption">
        <Label {label} />
      </div>
    {/if}
    <div class="tabs">
      {#each categories as c, i}
        {@const status = categoryStatus[c._id] ?? 0}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="tab"
          class:selected={category?._id === c._id}
          class:disabled={isStatusDisabled(status)}
          use:tooltip={{ label: c.label }}
          tabindex={i + 1}
          on:click={() => (category = c)}
        >
          <Icon icon={c.icon} size={'small'} />
        </div>
      {/each}
    </div>
  </div>
  <div class="pt-2 pb-1 pl-2 pr-2">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={query}
      placeholder={category?.label}
      on:input={() => updateItems(category, query, relatedDocuments)}
    />
  </div>
  <div class="ap-menuItem separator halfMargin" />
  <div class="ap-subheader">
    <Label label={ui.string.Suggested} />
  </div>
  <div class="ap-scroll">
    <div class="ap-box">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <ListView bind:this={list} bind:selection count={items.length}>
        <svelte:fragment slot="item" let:item>
          {@const doc = items[item]}
          <div
            class="ap-menuItem withComp"
            on:click={() => {
              dispatchItem(doc)
            }}
          >
            <svelte:component this={doc.component} value={doc.doc} {...doc.componentProps ?? {}} />
          </div>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
  <div class="ap-space x2" />
</form>
