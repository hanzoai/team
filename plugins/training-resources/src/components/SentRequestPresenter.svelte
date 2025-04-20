<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { TrainingRequest } from '@hanzo/training'
  import type { WithLookup } from '@hanzo/core'
  import { DocNavLink } from '@hanzo/view-resources'

  export let value: WithLookup<TrainingRequest>
  export let disabled: boolean = false
</script>

{#if value.$lookup?.attachedTo}
  <div class="content-halfcontent-color">
    <DocNavLink object={value} {disabled} noOverflow accent>
      <span class="whitespace-nowrap fs-bold">
        {value.$lookup.attachedTo.code}
      </span>
    </DocNavLink>
  </div>
{/if}
