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
  import { Class, Doc, Ref, SortingOrder } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import { TagCategory, TagElement } from '@hanzo/tags'
  import { ModernButton, getPlatformColorForTextDef, showPopup, themeStore, ScrollerBar } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle, TagElementInfo } from '../utils'
  import TagsCategoryPopup from './TagsCategoryPopup.svelte'

  export let targetClass: Ref<Class<Doc>>
  export let category: Ref<TagCategory> | undefined = undefined
  export let selected: Ref<TagElement>[] = []
  export let gap: 'none' | 'small' | 'big' = 'small'
  export let mode: 'item' | 'category' = 'category'
  export let tagElements: Map<Ref<TagElement>, TagElementInfo> | undefined

  let categories: TagCategory[] = []
  let visibleCategories: TagCategory[] = []

  const dispatch = createEventDispatcher()

  let elements: TagElement[] = []
  let scroller: HTMLElement

  let categoryCounts = new Map<Ref<TagCategory>, TagElement[]>()
  let categoryKeys: Ref<TagCategory>[] = []

  const elementsQuery = createQuery()
  $: if (tagElements !== undefined && tagElements.size > 0) {
    elementsQuery.query(
      tags.class.TagElement,
      { _id: { $in: Array.from(tagElements?.keys()) }, targetClass },
      (res) => {
        elements = res
      },
      {
        sort: {
          title: SortingOrder.Ascending
        }
      }
    )
  } else {
    elementsQuery.unsubscribe()
  }

  $: {
    const counts = new Map<Ref<TagCategory>, TagElement[]>()
    for (const e of elements) {
      if (e.category !== undefined) {
        if (selected.includes(e._id) && category === undefined) {
          category = e.category
        }
        const els = counts.get(e.category) ?? []
        els.push(e)
        counts.set(e.category, els)
      }
    }
    categoryCounts = counts
    categoryKeys = Array.from(categoryCounts.keys())
  }

  const categoriesQuery = createQuery()
  $: categoriesQuery.query(
    tags.class.TagCategory,
    {
      targetClass
    },
    (res) => {
      categories = res
    },
    { sort: { label: SortingOrder.Ascending } }
  )

  $: visibleCategories = categories.filter((it) => categoryKeys.includes(it._id))

  $: dispatch('categories', visibleCategories)

  const selectItem = (item: TagCategory): void => {
    if (category === item._id) {
      category = undefined
    } else {
      category = item._id
    }
    selected = (category !== undefined ? categoryCounts.get(category) ?? [] : []).map((it) => it._id)
    dispatch('change', { category, elements: selected })
  }

  function selectTag (evt: Event, category: TagCategory): void {
    showPopup(
      TagsCategoryPopup,
      {
        category,
        targetClass,
        selected,
        keyLabel: category.label,
        hideAdd: true
      },
      evt.target as HTMLElement,
      (result) => {
        if (result !== undefined) {
          selected = result.map((it: TagElement) => it._id)
          dispatch('change', { category: category._id, elements: result })
        }
      }
    )
  }
  const visibleCategoriesRef: HTMLElement[] = []

  $: visibleCategoriesRef.length = visibleCategories.length

  $: if (category !== undefined && visibleCategories.length > 0 && visibleCategoriesRef.length > 0) {
    const idx = visibleCategories.findIndex((it) => it._id === category)
    if (idx !== -1) {
      visibleCategoriesRef[idx]?.scrollIntoView({ block: 'nearest' })
    }
  }
</script>

{#if visibleCategories.length > 1}
  <div class="hanzoaiHeader-container clearPadding justify-between flex-gap-4">
    <ModernButton
      label={tags.string.AllCategories}
      kind={'tertiary'}
      size={'small'}
      on:click={() => {
        category = undefined
        dispatch('change', { category, elements: [] })
      }}
    />
    <ScrollerBar bind:scroller {gap}>
      {#each visibleCategories as item, i}
        {@const color = getPlatformColorForTextDef(item.label, $themeStore.dark)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          bind:this={visibleCategoriesRef[i]}
          class="categoryElement flex-center"
          id={item.label}
          style={getTagStyle(color, item._id === category)}
          on:click={(evt) => {
            if (mode === 'category') {
              selectItem(item)
            } else {
              selectTag(evt, item)
            }
          }}
        >
          {item.label}
          {#if item._id === category && mode === 'item'}
            ({selected.length}/{categoryCounts.get(item._id)?.length ?? ''})
          {:else}
            ({categoryCounts.get(item._id)?.length ?? ''})
          {/if}
        </div>
      {/each}
    </ScrollerBar>
  </div>
{/if}

<style lang="scss">
  .categoryElement {
    padding: 0.375rem 0.75rem;
    // height: 2.5rem;
    white-space: nowrap;
    border: 1px solid var(--divider-color);
    border-radius: 0.375rem;
    cursor: pointer;
  }
  .categoryElement + .categoryElement {
    margin-left: 0.125rem;
  }
</style>
