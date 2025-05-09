<!--
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
  import {
    CategoryType,
    Class,
    Doc,
    DocumentQuery,
    FindOptions,
    generateId,
    Lookup,
    RateLimiter,
    Ref,
    Space
  } from '@hanzo/core'
  import { getResource, IntlString } from '@hanzo/platform'
  import { getClient, reduceCalls } from '@hanzo/presentation'
  import { AnyComponent, AnySvelteComponent } from '@hanzo/ui'
  import {
    AttributeModel,
    BuildModelKey,
    CategoryOption,
    Viewlet,
    ViewOptionModel,
    ViewOptions
  } from '@hanzo/view'
  import { createEventDispatcher, onDestroy, SvelteComponentTyped } from 'svelte'
  import { SelectionFocusProvider } from '../../selection'
  import {
    buildModel,
    concatCategories,
    fixedWidthStore,
    getAdditionalHeader,
    getCategories,
    getGroupByValues,
    getPresenter,
    groupBy
  } from '../../utils'
  import { CategoryQuery, noCategory } from '../../viewOptions'
  import ListCategory from './ListCategory.svelte'

  export let docs: Doc[]
  export let docKeys: Partial<DocumentQuery<Doc>> = {}
  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc> | undefined
  export let lookup: Lookup<Doc>
  export let baseMenuClass: Ref<Class<Doc>> | undefined
  export let config: Array<string | BuildModelKey>
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  export let selectedObjectIds: Doc[] = []
  export let createItemDialog: AnyComponent | AnySvelteComponent | undefined
  export let createItemDialogProps: Record<string, any> | undefined
  export let createItemLabel: IntlString | undefined
  export let createItemEvent: string | undefined
  export let viewOptions: ViewOptions
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}
  export let level: number
  export let initIndex = 0
  export let newObjectProps: (doc: Doc | undefined) => Record<string, any> | undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let dragItem: {
    doc?: Doc
    revert?: () => void
  }
  export let listDiv: HTMLDivElement
  export let selection: number | undefined
  export let groupPersistKey: string
  export let compactMode: boolean = false

  export let resultQuery: DocumentQuery<Doc>
  export let resultOptions: FindOptions<Doc>
  export let limiter: RateLimiter
  export let listProvider: SelectionFocusProvider

  $: groupByKey = viewOptions.groupBy[level] ?? noCategory
  let categories: CategoryType[] = []
  $: void updateCategories(_class, space, docs, groupByKey, viewOptions, viewOptionsConfig)

  $: groupByDocs = groupBy(docs, groupByKey, categories)

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const queryId = generateId()
  onDestroy(() => {
    CategoryQuery.remove(queryId)
  })

  const updateCategories = reduceCalls(
    async (
      _class: Ref<Class<Doc>>,
      space: Ref<Space> | undefined,
      docs: Doc[],
      groupByKey: string,
      viewOptions: ViewOptions,
      viewOptionsModel: ViewOptionModel[] | undefined
    ): Promise<void> => {
      categories = await getCategories(client, _class, space, docs, groupByKey)
      if (level === 0) {
        for (const viewOption of viewOptionsModel ?? []) {
          if (viewOption.actionTarget !== 'category') continue
          const categoryFunc = viewOption as CategoryOption
          if (viewOptions[viewOption.key] ?? viewOption.defaultValue) {
            const f = await getResource(categoryFunc.action)
            const res = hierarchy.clone(await f(_class, query, space, groupByKey, update, queryId))
            if (res !== undefined) {
              categories = concatCategories(res, categories)
              return
            }
          }
        }
      }
    }
  )

  function update (): void {
    void updateCategories(_class, space, docs, groupByKey, viewOptions, viewOptionsConfig)
  }

  let itemModels = new Map<Ref<Class<Doc>>, AttributeModel[]>()

  const getHeader = reduceCalls(async function (_class: Ref<Class<Doc>>, groupByKey: string): Promise<void> {
    if (groupByKey === noCategory) {
      headerComponent = undefined
    } else {
      await getPresenter(client, _class, { key: groupByKey }, { key: groupByKey }).then((p) => (headerComponent = p))
    }
  })

  let headerComponent: AttributeModel | undefined
  $: void getHeader(_class, groupByKey)

  let configurationsVersion = 0
  const buildModels = reduceCalls(async function (
    _class: Ref<Class<Doc>>,
    config: Array<string | BuildModelKey>,
    configurations?: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  ): Promise<void> {
    const newItemModels = new Map<Ref<Class<Doc>>, AttributeModel[]>()
    const entries = Object.entries(configurations ?? [])
    for (const [k, v] of entries) {
      const _cl = k as Ref<Class<Doc>>
      const res = await buildModel({ client, _class: _cl, keys: v, lookup })
      newItemModels.set(_cl, res)
    }

    if (!newItemModels.has(_class)) {
      const res = await buildModel({ client, _class, keys: config, lookup })
      newItemModels.set(_class, res)
    }

    itemModels = newItemModels
    for (const [, v] of Object.entries(newItemModels)) {
      // itemModels = itemModels
      ;(v as AttributeModel[]).forEach((m: AttributeModel) => {
        if (m.displayProps?.key !== undefined) {
          const key = `list_item_${m.displayProps.key}`
          if (m.displayProps.fixed) {
            $fixedWidthStore[key] = 0
          }
        }
      })
    }
    configurationsVersion = configurationsVersion + 1
  })

  $: void buildModels(_class, config, configurations)

  function getInitIndex (categories: any, i: number): number {
    let res = initIndex
    for (let index = 0; index < i; index++) {
      const cat = categories[index]
      res += groupByDocs[cat]?.length ?? 0
    }
    return res
  }

  $: extraHeaders = getAdditionalHeader(client, _class)

  const dispatch = createEventDispatcher()

  function getState (doc: Doc): number {
    let pos = 0
    for (const st of categories) {
      const stateObjs = getGroupByValues(groupByDocs, st) ?? []
      if (stateObjs.findIndex((it) => it._id === doc._id) !== -1) {
        return pos
      }
      pos++
    }
    return -1
  }

  export function select (
    offset: 2 | 1 | -2 | -1 | 0,
    of?: Doc,
    dir?: 'vertical' | 'horizontal',
    noScroll?: boolean
  ): void {
    let pos = (of != null ? docs.findIndex((it) => it._id === of._id) : selection) ?? -1
    if (pos === -1) {
      for (const st of categories) {
        const stateObjs = getGroupByValues(groupByDocs, st) ?? []
        if (stateObjs.length > 0) {
          pos = docs.findIndex((it) => it._id === stateObjs[0]._id)
          break
        }
      }
    }
    if (offset === -2 || offset === 2) {
      if (level + 1 >= viewOptions.groupBy.length) {
        if (offset === -2) {
          if (listListCategory?.[0] == null) {
            return
          }
          const obj = listListCategory[0]?.getLimited()?.[0]
          if (obj !== undefined) {
            listListCategory[0]?.expand()
            select(0, obj)
          }
          return
        } else {
          if (listListCategory?.[0] == null) {
            return
          }
          const g = listListCategory[categories.length - 1]?.getLimited() ?? []
          if (g.length > 0) {
            listListCategory[categories.length - 1].expand()
            const obj = g[g.length - 1]
            select(0, obj)
          }
          return
        }
      } else {
        if (level === 0) {
          let ci = 0
          for (const c of categories) {
            const docs = getGroupByValues(groupByDocs, c)
            if (docs.findIndex((it) => it._id === of?._id) !== -1) {
              // We need to  take next
              listListCategory[ci + offset / 2]?.expand()
              listCategory[ci + offset / 2]?.select(offset)
            }
            ci++
          }
        } else {
          if (offset === 2) {
            listListCategory[0].expand()
            listCategory[0]?.select(offset, of, dir)
          } else {
            listListCategory[listCategory.length - 1].expand()
            listCategory[listCategory.length - 1]?.select(offset, of, dir)
          }
        }
      }
      return
    }

    if (pos < 0) {
      pos = 0
    }
    if (pos >= docs.length) {
      pos = docs.length - 1
    }

    const obj = docs[pos]
    if (obj === undefined) {
      return
    }

    // We found group
    const objState = getState(obj)
    if (objState === -1) {
      return
    }

    if (level + 1 >= viewOptions.groupBy.length) {
      const stateObjs: Doc[] = getGroupByValues(groupByDocs, categories[objState]) ?? []

      const statePos = stateObjs.findIndex((it) => it._id === obj._id)
      if (statePos === undefined) {
        return
      }

      if (offset === -1) {
        if (dir === undefined || dir === 'vertical') {
          if (statePos - 1 < 0 && objState >= 0) {
            if (objState !== 0) {
              const pstateObjs = listListCategory[objState - 1]?.getLimited()
              if (pstateObjs !== undefined) {
                dispatch('select', pstateObjs[pstateObjs.length - 1])
              }
            } else {
              dispatch('select-prev', stateObjs[statePos])
            }
          } else {
            const obj = stateObjs[statePos - 1]
            if (obj !== undefined) {
              const focusDoc = listListCategory[objState]?.getLimited()?.find((it) => it._id === obj._id) ?? obj
              if (focusDoc !== undefined) {
                if (!noScroll) scrollInto(objState, focusDoc)
                dispatch('row-focus', focusDoc)
              }
            }
          }
          return
        }
      }
      if (offset === 1) {
        if (dir === undefined || dir === 'vertical') {
          const limited = listListCategory[objState]?.getLimited() ?? []
          if (statePos + 1 >= limited.length && objState < categories.length) {
            if (objState + 1 !== categories.length) {
              const pstateObjs = getGroupByValues(groupByDocs, categories[objState + 1])
              dispatch('select', pstateObjs[0])
            } else {
              dispatch('select-next', stateObjs[statePos])
            }
          } else {
            const obj = stateObjs[statePos + 1]
            if (obj !== undefined) {
              const focusDoc = listListCategory[objState]?.getLimited()?.find((it) => it._id === obj._id) ?? obj
              if (focusDoc !== undefined) {
                if (!noScroll) scrollInto(objState, focusDoc)
                dispatch('row-focus', focusDoc)
              }
            }
          }
          return
        }
      }
      if (offset === 0) {
        const focusDoc = listListCategory[objState]?.getLimited()?.find((it) => it._id === obj._id) ?? obj
        if (focusDoc !== undefined) {
          if (!noScroll) scrollInto(objState, focusDoc)
          dispatch('row-focus', focusDoc)
        }
      }
    } else {
      listCategory[objState]?.select(offset, of, dir, noScroll)
    }
  }
  function scrollInto (statePos: number, obj: Doc): void {
    listListCategory[statePos]?.scroll(obj)
    listCategory[statePos]?.scroll(obj)
  }

  const listCategory: SvelteComponentTyped[] = []
  const listListCategory: ListCategory[] = []
  function getGroupByKey (
    docKeys: Partial<DocumentQuery<Doc<Space>>>,
    category: CategoryType,
    resultQuery: DocumentQuery<Doc<Space>>
  ): Partial<DocumentQuery<Doc>> {
    return {
      ...docKeys,
      [groupByKey]:
        typeof category === 'object'
          ? category.name !== undefined
            ? { $in: category.values.flatMap((x) => x._id) }
            : resultQuery[groupByKey]?.$in?.length !== 0
              ? undefined
              : []
          : category
    }
  }
</script>

{#each categories as category, i (typeof category === 'object' ? category.name : category)}
  {@const items = groupByKey === noCategory ? docs : getGroupByValues(groupByDocs, category)}
  {@const categoryDocKeys = getGroupByKey(docKeys, category, resultQuery)}
  <ListCategory
    bind:this={listListCategory[i]}
    {extraHeaders}
    {space}
    {selectedObjectIds}
    {headerComponent}
    {baseMenuClass}
    {level}
    {viewOptions}
    {groupByKey}
    {lookup}
    {config}
    {configurations}
    {configurationsVersion}
    {itemModels}
    {_class}
    parentCategories={categories.length}
    groupPersistKey={`${groupPersistKey}_${level}_${typeof category === 'object' ? category.name : category}`}
    singleCat={level === 0 && categories.length === 1}
    oneCat={viewOptions.groupBy.length === 1}
    lastCat={i === categories.length - 1}
    {category}
    itemProj={items}
    docKeys={categoryDocKeys}
    {newObjectProps}
    {createItemDialog}
    {createItemDialogProps}
    {createItemLabel}
    {createItemEvent}
    {viewOptionsConfig}
    {compactMode}
    {resultQuery}
    {resultOptions}
    {limiter}
    {listProvider}
    on:check
    on:uncheckAll
    on:row-focus
    on:dragstart={(e) => {
      dispatch('dragstart', {
        target: e.detail.target,
        index: e.detail.index + getInitIndex(categories, i)
      })
    }}
    on:collapsed
    {flatHeaders}
    {disableHeader}
    {props}
    {listDiv}
    bind:dragItem
  >
    <svelte:fragment
      slot="category"
      let:docs
      let:_class
      let:space
      let:lookup
      let:baseMenuClass
      let:config
      let:selectedObjectIds
      let:createItemDialog
      let:createItemLabel
      let:viewOptions
      let:newObjectProps
      let:flatHeaders
      let:props
      let:level
      let:viewOptionsConfig
      let:listDiv
      let:dragstart
    >
      <svelte:self
        {docs}
        bind:this={listCategory[i]}
        {_class}
        {space}
        {lookup}
        {baseMenuClass}
        {config}
        {selectedObjectIds}
        {createItemDialog}
        {createItemLabel}
        {viewOptions}
        {newObjectProps}
        {flatHeaders}
        {props}
        {level}
        docKeys={categoryDocKeys}
        groupPersistKey={`${groupPersistKey}_${level}_${typeof category === 'object' ? category.name : category}`}
        {initIndex}
        {viewOptionsConfig}
        {listDiv}
        {resultQuery}
        {resultOptions}
        {limiter}
        {listProvider}
        bind:dragItem
        on:dragItem
        on:check
        on:uncheckAll
        on:row-focus
        on:dragstart={dragstart}
        on:select={(evt) => {
          select(0, evt.detail)
        }}
        on:select-next={(evt) => {
          if (level !== 0) {
            dispatch('select-next', evt.detail)
          } else {
            select(2, evt.detail)
          }
        }}
        on:select-prev={(evt) => {
          if (level !== 0) {
            dispatch('select-prev', evt.detail)
          } else {
            select(-2, evt.detail)
          }
        }}
      />
    </svelte:fragment>
  </ListCategory>
{/each}
