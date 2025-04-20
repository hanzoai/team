<script lang="ts">
  import { Document } from '@hanzo/controlled-documents'
  import { getCurrentEmployee } from '@hanzo/contact'
  import { DocumentQuery } from '@hanzo/core'
  import DocumentsContainer from './DocumentsContainer.svelte'

  import documents from '../plugin'
  import { IntlString } from '@hanzo/platform'
  import { createEventDispatcher } from 'svelte'

  export let query: DocumentQuery<Document> = {}
  export let config: [string, IntlString, object][] = []

  const dispatch = createEventDispatcher()
  const currentEmployee = getCurrentEmployee()

  $: resultQuery = {
    ...query,
    owner: currentEmployee
  }
</script>

<DocumentsContainer
  query={resultQuery}
  icon={documents.icon.Document}
  title={documents.string.MyDocuments}
  {config}
  on:action={(event) => dispatch('action', event.detail)}
/>
