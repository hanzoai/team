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
  // import { Doc } from '@hanzo/core'
  import type { Blob, Ref } from '@hanzo/core'
  import { Button, Dialog, EmbeddedPDF, Label, Spinner } from '@hanzo/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import presentation, { getFileUrl } from '..'
  import ActionContext from './ActionContext.svelte'
  import Download from './icons/Download.svelte'

  export let file: Ref<Blob> | undefined
  export let name: string
  export let contentType: string | undefined
  // export let popupOptions: PopupOptions
  // export let value: Doc
  export let showIcon = true
  export let fullSize = false
  export let isLoading = false
  export let css: string | undefined = undefined

  const dispatch = createEventDispatcher()

  function iconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }
  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }
  })
  let download: HTMLAnchorElement

  $: src = file !== undefined ? getFileUrl(file, name) : undefined

  $: isImage = contentType !== undefined && contentType.startsWith('image/')
</script>

<ActionContext context={{ mode: 'browser' }} />
<Dialog
  isFullSize
  on:fullsize
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      {#if showIcon}
        <div class="wrapped-icon">
          <div class="flex-center icon">
            {iconLabel(name)}
          </div>
        </div>
      {/if}
      <span class="wrapped-title">{name}</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {#if !isLoading && src !== ''}
      <a class="no-line" href={src} download={name} bind:this={download}>
        <Button
          icon={Download}
          kind={'ghost'}
          on:click={() => {
            download.click()
          }}
          showTooltip={{ label: presentation.string.Download }}
        />
      </a>
    {/if}
  </svelte:fragment>

  {#if !isLoading}
    {#if src === '' || src === undefined}
      <div class="centered">
        <Label label={presentation.string.FailedToPreview} />
      </div>
    {:else if isImage}
      <div class="pdfviewer-content img">
        <img class="img-fit" {src} alt="" />
      </div>
    {:else}
      <EmbeddedPDF {src} {name} {css} fit />
    {/if}
  {:else}
    <div class="centered">
      <Spinner size="medium" />
    </div>
  {/if}
</Dialog>

<style lang="scss">
  .icon {
    position: relative;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
  }
  .pdfviewer-content {
    flex-grow: 1;
    overflow: auto;
    border: none;

    &.img {
      display: flex;
      align-items: center;
      min-width: 0;
      min-height: 0;
    }
  }
  .img-fit {
    margin: 0 auto;
    width: fit-content;
    height: fit-content;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .centered {
    flex-grow: 1;
    width: 100;
    height: 100;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
