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
  import {
    Doc,
    FindResult,
    getObjectValue,
    Ref,
    RefTo,
    SortingOrder,
    Space,
    type WithLookup
  } from '@hanzo/core'
  import { getResourceC, translate } from '@hanzo/platform'
  import presentation, { getClient } from '@hanzo/presentation'
  import ui, {
    addNotification,
    deviceOptionsStore,
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    Loading,
    resizeObserver,
    themeStore
  } from '@hanzo/ui'
  import { Filter, GrouppingManager } from '@hanzo/view'
  import { createEventDispatcher } from 'svelte'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '../../filter'
  import view from '../../plugin'
  import { buildConfigLookup, getPresenter } from '../../utils'
  import FilterRemovedNotification from './FilterRemovedNotification.svelte'

  export let filter: Filter
  export let space: Ref<Space> | undefined = undefined
  export let onChange: (e: Filter) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const tkey = '$lookup.' + filter.key.key
  const key = { key: tkey }
  const lookup = buildConfigLookup(hierarchy, filter.key._class, [tkey])
  const promise = getPresenter(client, filter.key._class, key, key, lookup)
  filter.modes = filter.modes ?? [view.filter.FilterObjectIn, view.filter.FilterObjectNin]
  filter.mode = filter.mode ?? filter.modes[0]

  let values: Array<Doc | undefined | null> = []
  let objectsPromise: Promise<FindResult<Doc>> | undefined
  let grouppingManager: GrouppingManager | undefined

  const targets = new Set<any>()
  $: targetClass = (filter.key.attribute.type as RefTo<Doc>).to
  $: clazz = hierarchy.getClass(targetClass)
  $: mixin = hierarchy.classHierarchyMixin(targetClass, view.mixin.Groupping)
  $: if (mixin?.grouppingManager !== undefined) {
    getResourceC(mixin.grouppingManager, (mgr) => (grouppingManager = mgr))
  } else {
    grouppingManager = undefined
  }

  let filterUpdateTimeout: any | undefined

  async function getValues (search: string): Promise<void> {
    if (objectsPromise !== undefined) {
      await objectsPromise
    }
    targets.clear()

    const baseObjects: WithLookup<Doc>[] = await client.findAll(
      filter.key._class,
      space !== undefined
        ? {
            space
          }
        : {},
      {
        projection: { [filter.key.key]: 1 },
        limit: 1000
      }
    )
    if (baseObjects.length === 1000) {
      // We have more so let's fetch all
      const ninTarget = Array.from(new Set(baseObjects.map((it) => getObjectValue(filter.key.key, it) ?? undefined)))
      const extraObjects = await client.findAll(
        filter.key._class,
        {
          ...(space !== undefined ? { space } : {}),
          [filter.key.key]: {
            $nin: ninTarget
          }
        },
        {
          projection: { [filter.key.key]: 1 }
        }
      )
      baseObjects.push(...extraObjects)
    }

    for (const object of baseObjects) {
      const value = getObjectValue(filter.key.key, object) ?? undefined
      targets.add(value)
    }
    for (const object of filter.value) {
      targets.add(object)
    }

    const resultQuery =
      search !== '' && clazz.filteringKey !== undefined
        ? {
            [clazz.filteringKey]: { $like: '%' + search + '%' },
            _id: { $in: Array.from(targets.keys()) }
          }
        : {
            _id: { $in: Array.from(targets.keys()) }
          }
    const options = clazz.sortingKey !== undefined ? { sort: { [clazz.sortingKey]: SortingOrder.Ascending } } : {}
    objectsPromise = client.findAll(targetClass, resultQuery, options)
    values = await objectsPromise
    if (grouppingManager !== undefined) {
      values = grouppingManager.groupValues(values as Doc[], targets)
    }
    if (targets.has(undefined)) {
      values.unshift(undefined)
    }
    if (values.length !== targets.size) {
      const oldSize = filter.value.length
      filter.value = filter.value.filter((p) => targets.has(p))
      const removed = oldSize - (filter.value.length ?? 0)
      if (removed > 0) {
        onChange(filter)
        addNotification(
          await translate(view.string.FilterUpdated, {}, $themeStore.language),
          filter.key.label,
          FilterRemovedNotification,
          {
            description: await translate(view.string.FilterRemoved, { count: removed }, $themeStore.language)
          }
        )
      }
    }
    values = sortFilterValues(values, (v) => isSelected(v, filter.value))
    objectsPromise = undefined
  }

  function isSelected (value: Doc | undefined | null, values: any[]): boolean {
    if (value != null && grouppingManager !== undefined) {
      return grouppingManager.hasValue(value, values)
    }
    return values.includes(value?._id ?? value)
  }

  function handleFilterToggle (value: any): void {
    if (isSelected(value, filter.value)) {
      filter.value = filter.value.filter((p) => (value ? p !== value._id : p != null))
    } else {
      if (value) {
        filter.value = [...filter.value, value._id]
      } else {
        filter.value = [...filter.value, undefined]
      }
    }

    updateFilter()
  }

  function updateFilter (): void {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  let search: string = ''

  const dispatch = createEventDispatcher()
  $: if (targetClass !== undefined) getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  {#if clazz.filteringKey}
    <div class="header">
      <EditWithIcon
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        placeholder={presentation.string.Search}
      />
    </div>
  {:else}
    <div class="menu-space" />
  {/if}
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#if objectsPromise}
          <Loading />
        {:else}
          {#each values as value}
            <button
              class="menu-item no-focus content-pointer-events-none"
              on:click={() => {
                handleFilterToggle(value)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  {#if value}
                    {#key value._id}
                      <svelte:component this={attribute.presenter} {value} {...attribute.props} disabled oneLine />
                    {/key}
                  {:else}
                    <Label label={ui.string.NotSelected} />
                  {/if}
                </div>
                <div class="pointer-events-none">
                  {#if isSelected(value, filter.value)}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {/if}
      {/await}
    </div>
  </div>
  <div class="menu-space" />
</div>
