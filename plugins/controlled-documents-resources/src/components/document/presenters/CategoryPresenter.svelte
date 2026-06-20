<script lang="ts">
  import documents, { DocumentCategory } from '@hanzoteam/controlled-documents'
  import { Ref } from '@hanzoteam/core'

  import { getClient } from '@hanzoteam/presentation'
  import { Label } from '@hanzoteam/ui'
  import view from '@hanzoteam/view'
  import { createEventDispatcher } from 'svelte'

  export let value: Ref<DocumentCategory> | undefined
  export let editable: boolean = false

  let category: DocumentCategory | undefined = undefined
  const client = getClient()

  const dispatch = createEventDispatcher()

  $: if (value) {
    client.findOne(documents.class.DocumentCategory, { _id: value }).then((result) => {
      category = result
    })
  }

  function handleClick (event: MouseEvent): void {
    if (!editable) {
      return
    }

    dispatch('edit', event)
  }
</script>

{#if category}
  <a
    class="flex-presenter inline-presenter noBold"
    class:no-underline={!editable}
    class:cursor-inherit={!editable}
    href={undefined}
    on:click={handleClick}
  >
    {category.title}
  </a>
{:else}
  <Label label={view.string.LabelNA} />
{/if}
