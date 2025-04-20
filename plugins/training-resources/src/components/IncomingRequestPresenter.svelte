<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { TrainingAttempt, TrainingRequest } from '@hanzo/training'
  import type { WithLookup } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import { DocNavLink } from '@hanzo/view-resources'
  import { queryLatestOwnAttempt } from '../utils'

  export let value: WithLookup<TrainingRequest>
  export let disabled: boolean = false

  let attempt: TrainingAttempt | null = null
  const query = createQuery()
  $: queryLatestOwnAttempt(query, value, (result) => {
    attempt = result ?? null
  })
</script>

{#if value.$lookup?.attachedTo}
  <div class="content-halfcontent-color">
    <DocNavLink object={attempt ?? value} {disabled} noOverflow accent>
      <span class="whitespace-nowrap fs-bold">
        {value.$lookup.attachedTo.code}
      </span>
    </DocNavLink>
  </div>
{/if}
