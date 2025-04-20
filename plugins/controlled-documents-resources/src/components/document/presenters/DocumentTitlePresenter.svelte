<script lang="ts">
  import documents, { Document } from '@hanzo/controlled-documents'
  import { Ref } from '@hanzo/core'

  import { getClient } from '@hanzo/presentation'
  import { Label } from '@hanzo/ui'
  import view from '@hanzo/view'

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
