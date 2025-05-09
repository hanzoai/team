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
  import { createEventDispatcher } from 'svelte'
  import { NoteKind } from '@hanzo/text'
  import textEditor from '@hanzo/text-editor'
  import { Card } from '@hanzo/presentation'
  import { Button, Label, PlainTextEditor } from '@hanzo/ui'

  export let text: string
  export let kind: NoteKind = NoteKind.Neutral
  export let isNew: boolean
  export let handleUpdate: (text: string, kind: NoteKind) => void
  export let handleRemove: () => void

  const kindPalette = [
    NoteKind.Neutral,
    NoteKind.PrimaryLight,
    NoteKind.PositiveLight,
    NoteKind.WarningLight,
    NoteKind.DangerousLight,
    NoteKind.Primary,
    NoteKind.Positive,
    NoteKind.Warning,
    NoteKind.Dangerous
  ]

  const dispatch = createEventDispatcher()

  function handleOk (): void {
    handleUpdate(text, kind)
  }

  function handleRemoveClick (): void {
    handleRemove()
    dispatch('close')
  }
</script>

<Card
  label={textEditor.string.ConfigureNote}
  okLabel={isNew ? textEditor.string.Set : textEditor.string.Update}
  okAction={handleOk}
  canSave
  width="medium"
  on:close
  on:changeContent
>
  <div class="kindControl">
    <span class="sample theme-text-editor-note-anchor {kind}"><Label label={textEditor.string.SampleText} /></span>

    <div class="kindPalette">
      {#each kindPalette as k}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="colorBox theme-text-editor-note-anchor {k}"
          on:click={() => (kind = k)}
          class:selected={kind === k}
        />
      {/each}
    </div>
  </div>

  <PlainTextEditor bind:value={text} placeholder={textEditor.string.NotePlaceholder} />
  <svelte:fragment slot="buttons">
    {#if !isNew}
      <Button label={textEditor.string.Remove} kind="ghost" on:click={handleRemoveClick} />
    {/if}
  </svelte:fragment>
</Card>

<style lang="scss">
  .kindControl {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .kindPalette {
    display: flex;
    gap: 0.25rem;
  }

  .sample {
    color: var(--theme-text-primary-color);
  }

  .colorBox {
    position: relative;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid var(--theme-button-border);
    cursor: pointer;

    &.selected::after {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 32 32'%3E%3Cpath fill='%23333333' d='M23.6,10.9c-0.6-0.6-1.5-0.6-2.1,0l-6.9,6.9l-3.4-3.4c-0.6-0.6-1.5-0.6-2.1,0c-0.6,0.6-0.6,1.5,0,2.1l5.6,5.6l9.1-9.1C24.1,12.5,24.1,11.5,23.6,10.9z'/%3E%3C/svg%3E%0A");
    }
  }

  :global(.theme-dark .colorBox) {
    &.selected::after {
      background-image: url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 32 32'%3E%3Cpath fill='%23CCCCCC' d='M23.6,10.9c-0.6-0.6-1.5-0.6-2.1,0l-6.9,6.9l-3.4-3.4c-0.6-0.6-1.5-0.6-2.1,0c-0.6,0.6-0.6,1.5,0,2.1l5.6,5.6l9.1-9.1C24.1,12.5,24.1,11.5,23.6,10.9z'/%3E%3C/svg%3E%0A");
    }
  }
</style>
