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
  import { getDay, Timestamp } from '@hanzo/core'
  import { DateRangePopup, showPopup } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'

  export let selectedDate: Timestamp | undefined
  export let fixed: boolean = false
  export let idPrefix: string = ''
  export let visible: boolean = true

  let div: HTMLDivElement | undefined
  const dispatch = createEventDispatcher()

  $: time = selectedDate ? getDay(selectedDate) : undefined

  $: isCurrentYear = time ? new Date(time).getFullYear() === new Date().getFullYear() : undefined
</script>

<div id={fixed ? '' : `${idPrefix}${time?.toString()}`} class="flex-center clear-mins dateSelector">
  {#if visible}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      bind:this={div}
      class="border-radius-4 dateSelectorButton clear-mins"
      on:click={() => {
        showPopup(DateRangePopup, {}, div, (v) => {
          if (v) {
            v.setHours(0, 0, 0, 0)
            dispatch('jumpToDate', { date: v.getTime() })
          }
        })
      }}
    >
      {#if time}
        {new Date(time).toLocaleDateString('default', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: isCurrentYear ? undefined : 'numeric'
        })}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .dateSelector {
    position: relative;
    flex-shrink: 0;
    margin: 0.25rem 0;
    height: 1.875rem;
    font-size: 0.75rem;

    &:not(:first-child)::after {
      position: absolute;
      content: '';
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--highlight-select-border);
    }

    .dateSelectorButton {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      height: max-content;
      color: var(--theme-content-color);
      background-color: var(--highlight-select);
      border: 1px solid var(--highlight-select-border);
      font-weight: 500;
      z-index: 10;
    }
  }
</style>
