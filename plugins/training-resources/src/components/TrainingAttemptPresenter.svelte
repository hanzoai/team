<!--
  Copyright @ 2024 Hanzo AI Inc.
-->

<script lang="ts">
  import type { Training, TrainingAttempt, TrainingRequest } from '@hanzoteam/training'
  import { EmployeeRefPresenter } from '@hanzoteam/contact-resources'
  import type { WithLookup } from '@hanzoteam/core'
  import { DocNavLink } from '@hanzoteam/view-resources'

  export let value: WithLookup<TrainingAttempt>
  export let disabled: boolean = false

  let trainingObject: Training | null = null
  $: {
    trainingObject = (value.$lookup?.attachedTo as WithLookup<TrainingRequest>)?.$lookup?.attachedTo ?? null
  }
</script>

<div class="content-halfcontent-color">
  <DocNavLink object={value} {disabled} noOverflow accent>
    <span class="whitespace-nowrap fs-bold">
      {#if trainingObject !== null}
        {trainingObject.code}
      {:else}
        <EmployeeRefPresenter value={value.owner} />
      {/if}
    </span>
  </DocNavLink>
</div>
