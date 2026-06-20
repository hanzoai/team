<script lang="ts">
  import { WithLookup } from '@hanzoteam/core'
  import { DocumentMeta } from '@hanzoteam/controlled-documents'

  import DocumentIcon from './icons/DocumentIcon.svelte'

  export let value: WithLookup<DocumentMeta>
</script>

<div class="flex-row-center">
  <div class="flex-center p-1 content-dark-color flex-no-shrink mr-2-5">
    <DocumentIcon size={'medium'} />
  </div>
  <span class="overflow-label">
    {value.title}
  </span>
</div>
