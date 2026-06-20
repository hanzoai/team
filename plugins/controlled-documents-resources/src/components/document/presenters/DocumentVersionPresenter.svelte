<script lang="ts">
  import { WithLookup } from '@hanzoteam/core'
  import { Document } from '@hanzoteam/controlled-documents'
  import { Label } from '@hanzoteam/ui'
  import document from '../../../plugin'

  export let value: WithLookup<Document> | undefined
</script>

{#if value}
  <Label label={document.string.VersionValue} params={{ major: value.major, minor: value.minor }} />
{/if}
