<!--
  Copyright @ 2024 Hanzo AI Inc.
-->

<script lang="ts">
  import type { TrainingRequest } from '@hanzoteam/training'
  import type { WithLookup } from '@hanzoteam/core'
  import { DocNavLink } from '@hanzoteam/view-resources'

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
