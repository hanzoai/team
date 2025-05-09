<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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
  import type { Asset, IntlString } from '@hanzo/platform'
  import { translateCB } from '@hanzo/platform'
  import { themeStore } from '@hanzo/theme'
  import { ComponentType, createEventDispatcher } from 'svelte'

  import plugin from '../plugin'
  import type { AnySvelteComponent } from '../types'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import IconClose from './icons/Close.svelte'
  import Spinner from './Spinner.svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType
  export let width: string | undefined = undefined
  export let value: string | undefined = ''
  export let placeholder: IntlString = plugin.string.EditBoxPlaceholder
  export let placeholderParam: any | undefined = undefined
  export let autoFocus: boolean = false
  export let kind: 'ghost' | 'secondary' = 'ghost'
  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let loading = false

  const dispatch = createEventDispatcher()
  let textHTML: HTMLInputElement
  let phTranslate: string = ''

  export function focus (): void {
    textHTML.focus()
    autoFocus = false
  }

  $: translateCB(placeholder, placeholderParam ?? {}, $themeStore.language, (res) => {
    phTranslate = res
  })
  $: if (textHTML !== undefined) {
    if (autoFocus) focus()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="flex-between editbox {kind} {size}"
  style={width != null ? 'width: ' + width : ''}
  on:click={() => {
    textHTML.focus()
  }}
>
  <div class="mr-2 content-dark-color"><Icon {icon} size={'small'} /></div>
  <input bind:this={textHTML} type="text" bind:value placeholder={phTranslate} on:change on:input on:keydown />
  <slot name="extra" />
  <div class="flex-row-center flex-no-shrink">
    {#if value}
      <div class="ml-2 flex-no-shrink">
        <Button
          icon={IconClose}
          kind={'ghost'}
          size={'small'}
          noFocus
          on:click={() => {
            value = ''
            dispatch('change', '')
            textHTML.focus()
          }}
        />
      </div>
    {/if}
    {#if loading}
      <div class="ml-1 mr-2">
        <Spinner size={'medium'} />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .editbox {
    padding: 0 0.25rem 0 0.5rem;
    min-width: 8rem;
    color: var(--theme-caption-color);
    border-radius: 0.25rem;

    &.small {
      height: 1.5rem;
    }
    &.medium {
      height: 2rem;
    }
    &.large {
      height: 2.25rem;
    }
    &:focus-within {
      background-color: var(--theme-editbox-focus-color);
      box-shadow: 0 0 0 1px var(--theme-editbox-focus-border);
    }

    input {
      width: 100%;
      caret-color: var(--theme-caret-color);
      border: none;
      border-radius: 0.25rem;

      &::placeholder {
        color: var(--theme-dark-color);
      }
    }

    &.secondary {
      padding: var(--spacing-1);
      background-color: var(--theme-button-default);
      border: 1px solid var(--theme-button-border);
      border-radius: var(--small-BorderRadius);
    }
  }
</style>
