<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { onDestroy } from 'svelte'
  import {
    AnyComponent,
    AnySvelteComponent,
    Button,
    Breadcrumb,
    Component,
    IconAdd,
    IconMenuOpen,
    IconMenuClose,
    ButtonIcon,
    Header,
    Separator,
    showPopup,
    getLocation,
    resolvedLocationStore,
    deviceOptionsStore as deviceInfo,
    defineSeparators,
    twoPanelsSeparators,
    resizeObserver
  } from '@hanzo/ui'
  import { Doc, DocumentQuery, Ref, Space, mergeQueries } from '@hanzo/core'
  import { IntlString, Asset } from '@hanzo/platform'

  export let space: Ref<Space> | undefined = undefined
  export let navigationComponent: AnyComponent
  export let navigationComponentProps: Record<string, any> | undefined = undefined
  export let navigationComponentLabel: IntlString
  export let navigationComponentIcon: Asset | undefined = undefined
  export let createComponent: AnyComponent | undefined = undefined
  export let createComponentProps: Record<string, any> = {}
  export let mainComponentLabel: IntlString
  export let mainComponentIcon: Asset | undefined = undefined
  export let mainHeaderComponent: AnyComponent | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let syncWithLocationQuery: boolean = true
  export let mainComponent: AnyComponent | AnySvelteComponent
  export let mainComponentProps = {}
  export let showNavigator: boolean = false
  export let parentKey: string = 'attachedTo'

  const FLOAT_LIMIT = 760
  let container: HTMLDivElement

  let parentQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}
  let spaceQuery: DocumentQuery<Doc> = {}
  $: spaceQuery = space !== undefined ? { space } : {}
  $: resultQuery = mergeQueries(query, mergeQueries(spaceQuery, parentQuery)) ?? {}

  if (syncWithLocationQuery) {
    parentQuery = getLocation()?.query as any
    onDestroy(
      resolvedLocationStore.subscribe((newLocation) => {
        parentQuery = newLocation?.query ?? {}
      })
    )
  }

  function onSelected (e: CustomEvent<any>): void {
    if (syncWithLocationQuery) return
    parentQuery = { [parentKey]: e.detail }
  }

  function showCreateDialog (): void {
    if (createComponent === undefined) return
    showPopup(createComponent, { ...createComponentProps, space }, 'top')
  }

  defineSeparators('parentsNavigator', twoPanelsSeparators)

  const getVisibleNavigator = (): boolean => !(localStorage.getItem('componentNavigator') === 'hidden')
  let visibleNavigator: boolean = getVisibleNavigator()
  let floatNavigator: boolean = false

  const toggleNavigator = (): void => {
    visibleNavigator = !visibleNavigator
    if (visibleNavigator) {
      if (!floatNavigator && container !== undefined && container.getBoundingClientRect().width < FLOAT_LIMIT) {
        floatNavigator = true
      }
      localStorage.removeItem('componentNavigator')
    } else localStorage.setItem('componentNavigator', 'hidden')
  }

  if (showNavigator && !visibleNavigator) {
    toggleNavigator()
  }
</script>

<div
  bind:this={container}
  class="hanzoaiComponent-content__container columns relative"
  use:resizeObserver={(element) => {
    if (visibleNavigator && !floatNavigator && element.clientWidth < FLOAT_LIMIT) {
      floatNavigator = true
      visibleNavigator = false
    } else if (floatNavigator && element.clientWidth >= FLOAT_LIMIT) {
      floatNavigator = false
      visibleNavigator = getVisibleNavigator()
    }
  }}
>
  {#if visibleNavigator}
    {#if floatNavigator}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="cover" class:mobile={$deviceInfo.isMobile} on:click={toggleNavigator} />
    {/if}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} second"
      class:float={floatNavigator}
      class:inner={!$deviceInfo.navigator.float}
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="hanzoaiComponent-content__column">
        <Header adaptive={'disabled'}>
          <Breadcrumb icon={navigationComponentIcon} label={navigationComponentLabel} size={'large'} isCurrent />
          <svelte:fragment slot="actions">
            {#if createComponent}
              <Button
                icon={IconAdd}
                kind={'icon'}
                showTooltip={navigationComponentProps?.createLabel !== undefined
                  ? { label: navigationComponentProps.createLabel }
                  : undefined}
                on:click={() => {
                  showCreateDialog()
                }}
              />
            {/if}
          </svelte:fragment>
        </Header>
        <Component
          is={navigationComponent}
          props={{
            ...navigationComponentProps,
            query: spaceQuery
          }}
          on:select={onSelected}
        />
      </div>
      {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
        <Separator
          name={'parentsNavigator'}
          float={floatNavigator ? 'navigator' : true}
          index={0}
          color={'var(--theme-divider-color)'}
        />
      {/if}
    </div>
    <Separator name={'parentsNavigator'} float={floatNavigator} index={0} color={'var(--theme-divider-color)'} />
  {/if}
  <div class="hanzoaiComponent-content__column">
    <Header adaptive={'disabled'}>
      <svelte:fragment slot="beforeTitle">
        <ButtonIcon
          icon={visibleNavigator ? IconMenuClose : IconMenuOpen}
          kind={'tertiary'}
          size={'small'}
          pressed={!visibleNavigator}
          on:click={toggleNavigator}
        />
      </svelte:fragment>

      <Breadcrumb icon={mainComponentIcon} label={mainComponentLabel} size={'large'} isCurrent />
      <svelte:fragment slot="actions">
        {#if mainHeaderComponent}
          <Component
            is={mainHeaderComponent}
            props={{
              query: resultQuery,
              space
            }}
          />
        {/if}
      </svelte:fragment>
    </Header>
    <Component
      is={mainComponent}
      props={{
        ...(mainComponentProps ?? {}),
        query: resultQuery,
        totalQuery: resultQuery
      }}
    />
  </div>
</div>

<style lang="scss">
  .cover {
    position: fixed;
    display: block;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10;

    &.mobile {
      background-color: var(--theme-overlay-color);
    }
  }
</style>
