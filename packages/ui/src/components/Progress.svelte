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
  import { themeStore } from '@hanzo/theme'
  import { getPlatformColor } from '../colors'
  import { createEventDispatcher } from 'svelte'
  import { deviceOptionsStore } from '..'

  export let value: number
  export let min: number = 0
  export let max: number = 100
  export let color: number | undefined = undefined
  export let editable = false

  $: proc = (max - min) / 100
  $: if (value > max) value = max
  $: if (value < min) value = min

  const dispatch = createEventDispatcher()

  function click (e: MouseEvent): void {
    if (!editable) return
    calcValue(e)
    dispatch('change', value)
  }

  function calcValue (e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left - $deviceOptionsStore.fontSize / 2
    let pos = x / (rect.width - $deviceOptionsStore.fontSize)
    if (pos > 100) pos = 100
    if (pos < 0) pos = 0
    value = (max - min) * pos + min
  }

  function save (): void {
    if (drag) {
      dispatch('change', value)
      drag = false
    }
  }

  function move (e: MouseEvent): void {
    if (!drag) return
    calcValue(e)
  }

  let drag: boolean = false

  $: position = proc !== 0 ? Math.round((value - min) / proc) : 0
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="container" class:editable on:click={click} on:mousemove={move} on:mouseleave={save} on:mouseup={save}>
  <div
    class="bar"
    style:width={`calc(calc(100% - 1rem) * ${position} / 100 + .5rem)`}
    style:background-color={color !== undefined
      ? getPlatformColor(color, $themeStore.dark)
      : 'var(--theme-toggle-on-bg-color)'}
  />
  {#if editable}
    <div
      class="control"
      on:mousedown={() => {
        drag = true
      }}
      style:left={`calc(calc(100% - 1rem) * ${position} / 100)`}
    />
  {/if}
</div>

<style lang="scss">
  .container {
    position: relative;
    height: 0.25rem;
    background-color: var(--trans-content-10);
    border-radius: 0.125rem;

    &.editable {
      height: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;

      .bar {
        border-radius: 0.5rem 0 0 0.5rem;
      }

      .control {
        position: absolute;
        top: 0;
        height: 1rem;
        width: 1rem;
        border-radius: 50%;
        background-color: var(--primary-button-color);
        border: 1px solid var(--theme-divider-color);
        box-shadow:
          inset -0.125rem -0.125rem 0.175rem rgba(0, 0, 0, 0.1),
          0 0 0.25rem rgba(0, 0, 0, 0.25);
      }
    }

    .bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 0.125rem;
    }
  }
</style>
