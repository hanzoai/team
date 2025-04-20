<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->
<script lang="ts" context="module">
  import type { ComponentProps } from 'svelte'
  import { StateTag, StateType } from '@hanzo/ui'
  import { TrainingAttemptState } from '@hanzo/training'
  import type { IntlString } from '@hanzo/platform'

  import training from '../plugin'

  export const propsByStates: Record<TrainingAttemptState, ComponentProps<StateTag<IntlString>>> = {
    [TrainingAttemptState.Draft]: {
      label: training.string.TrainingAttemptStateDraft,
      params: {},
      type: StateType.Regular
    },
    [TrainingAttemptState.Failed]: {
      label: training.string.TrainingAttemptStateFailed,
      params: {},
      type: StateType.Negative
    },
    [TrainingAttemptState.Passed]: {
      label: training.string.TrainingAttemptStatePassed,
      params: {},
      type: StateType.Positive
    }
  }
</script>

<script lang="ts">
  export let value: TrainingAttemptState
</script>

<div class="inline-flex">
  <StateTag {...propsByStates[value]} />
</div>
