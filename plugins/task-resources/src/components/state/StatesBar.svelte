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
  import core, { IdMap, Ref, Status, StatusCategory, toIdMap } from '@hanzo/core'
  import { BreadcrumbsElement, createQuery } from '@hanzo/presentation'
  import task, { Project, ProjectType, getStates } from '@hanzo/task'
  import { ScrollerBar, getColorNumberByText, getPlatformColor, themeStore } from '@hanzo/ui'
  import { statusStore } from '@hanzo/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { typeStore, type StatesBarPosition } from '../..'

  export let space: Ref<Project>
  export let state: Ref<Status> | undefined = undefined
  export let gap: 'none' | 'small' | 'big' = 'small'

  let _space: Project | undefined = undefined

  const spaceQuery = createQuery()
  spaceQuery.query(
    task.class.Project,
    {
      _id: space
    },
    (res) => {
      _space = res[0]
    }
  )

  $: states = getStates(_space, $typeStore, $statusStore.byId).filter(
    (p) => p.category !== task.statusCategory.Lost && p.category !== task.statusCategory.Won
  )
  let divScroll: HTMLElement

  const dispatch = createEventDispatcher()

  const selectItem = (ev: Event, item: Status): void => {
    const el: HTMLElement = ev.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const rectScroll = divScroll.getBoundingClientRect()
    divScroll.scrollBy({
      top: 0,
      left: rect.left + rect.width / 2 - (rectScroll.left + rectScroll.width / 2),
      behavior: 'smooth'
    })
    if (state === item._id) {
      state = undefined
    } else {
      state = item._id
    }
    dispatch('change')
  }

  const getPosition = (n: number): StatesBarPosition => {
    if (n === 0) return 'start'
    else if (n === states.length - 1) return 'end'
    else return 'middle'
  }

  let categories: IdMap<StatusCategory> = new Map()

  const q = createQuery()
  q.query(core.class.StatusCategory, {}, (res) => {
    categories = toIdMap(res)
  })

  function getColor (
    state: Status,
    _space: Project | undefined,
    typeStore: IdMap<ProjectType>,
    categories: IdMap<StatusCategory>
  ): string {
    const type = _space ? typeStore.get(_space.type) : undefined
    const category = state.category ? categories.get(state.category) : undefined
    const targetColor = type?.statuses?.find((p) => p._id === state._id)?.color ?? state.color ?? category?.color
    return getPlatformColor(targetColor ?? getColorNumberByText(state.name), $themeStore.dark)
  }
</script>

<ScrollerBar {gap} bind:scroller={divScroll}>
  {#each states as item, i (item._id)}
    <BreadcrumbsElement
      label={item.name}
      position={getPosition(i)}
      selected={item._id === state}
      color={getColor(item, _space, $typeStore, categories)}
      on:click={(ev) => {
        ev.stopPropagation()
        if (item._id !== state) selectItem(ev, item)
      }}
    />
  {/each}
</ScrollerBar>
