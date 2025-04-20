<script lang="ts">
  import { WithLookup } from '@hanzo/core'
  import { Document } from '@hanzo/controlled-documents'
  import { Label } from '@hanzo/ui'
  import document from '../../../plugin'

  export let value: WithLookup<Document> | undefined
</script>

{#if value}
  <Label label={document.string.VersionValue} params={{ major: value.major, minor: value.minor }} />
{/if}
