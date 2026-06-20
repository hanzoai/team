<script lang="ts">
  import documents, { Document } from '@hanzoteam/controlled-documents'
  import { Ref } from '@hanzoteam/core'

  import { getClient } from '@hanzoteam/presentation'
  import { Label } from '@hanzoteam/ui'
  import view from '@hanzoteam/view'

  export let value: Ref<Document> | undefined

  let document: Document | undefined = undefined
  const client = getClient()

  $: if (value) {
    client.findOne(documents.class.Document, { _id: value }).then((result) => {
      document = result
    })
  }
</script>

{#if document}
  {document.title}
{:else}
  <Label label={view.string.LabelNA} />
{/if}
