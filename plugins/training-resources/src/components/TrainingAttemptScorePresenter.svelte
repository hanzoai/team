<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { TrainingAttempt } from '@hanzo/training'
  import Score from './Score.svelte'

  export let value: TrainingAttempt
</script>

{#if value.score !== null && value.assessmentsTotal !== null && value.assessmentsPassed !== null}
  <Score count={value.assessmentsPassed} total={value.assessmentsTotal} score={value.score} />
{/if}
