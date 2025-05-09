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
  import { Widget, WidgetTab } from '@hanzo/workbench'
  import { createEventDispatcher } from 'svelte'
  import presentation from '@hanzo/presentation'
  import { Action, Component } from '@hanzo/ui'
  import view from '@hanzo/view'

  import SidebarTab from './SidebarTab.svelte'
  import { closeWidgetTab, pinWidgetTab, unpinWidgetTab } from '../../sidebar'

  export let tabs: WidgetTab[] = []
  export let widget: Widget
  export let selected: string | undefined = undefined

  const dispatch = createEventDispatcher()

  function getActions (tab: WidgetTab): Action[] {
    const pinAction: Action = {
      label: view.string.Pin,
      icon: view.icon.Pin,
      action: async () => {
        pinWidgetTab(widget, tab.id)
      }
    }
    const unpinAction: Action = {
      label: view.string.Unpin,
      icon: view.icon.Pin,
      action: async () => {
        unpinWidgetTab(widget, tab.id)
      }
    }
    const closeAction: Action = {
      label: presentation.string.Close,
      icon: view.icon.Delete,
      action: async () => {
        void closeWidgetTab(widget, tab.id)
      }
    }
    return [tab.isPinned ? unpinAction : pinAction, closeAction]
  }
</script>

<div class="tabs">
  {#each tabs as tab}
    {#if widget.tabComponent}
      <Component
        is={widget.tabComponent}
        props={{ tab, widget, selected: tab.id === selected, actions: getActions(tab) }}
        on:close={() => dispatch('close', tab.id)}
        on:click={() => {
          dispatch('open', tab.id)
        }}
      />
    {:else}
      <SidebarTab
        {tab}
        {widget}
        actions={getActions(tab)}
        selected={tab.id === selected}
        on:close={() => dispatch('close', tab.id)}
        on:click={() => {
          dispatch('open', tab.id)
        }}
      />
    {/if}
  {/each}
</div>

<style lang="scss">
  .tabs {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    width: 2rem;
    min-width: 2rem;
    max-width: 2rem;
    height: 100%;
    border-left: 1px solid var(--theme-divider-color);
    gap: 0.25rem;
    align-items: center;
    padding: 0.25rem 0;
  }
</style>
