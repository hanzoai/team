<!--
  Copyright @ 2024 Hanzo AI Inc.
-->

<script lang="ts">
  import type { TrainingRequest } from '@hanzoteam/training'
  import { DocumentQuery } from '@hanzoteam/core'
  import { SpecialView } from '@hanzoteam/workbench-resources'
  import type { ComponentProps } from 'svelte'
  import { getCurrentEmployeeRef } from '../utils'

  type $$Props = ComponentProps<SpecialView>
  $: ({ baseQuery, ...rest } = $$props as $$Props)

  let extendedBaseQuery: DocumentQuery<TrainingRequest>
  $: extendedBaseQuery = {
    ...((baseQuery ?? {}) as DocumentQuery<TrainingRequest>),
    trainees: getCurrentEmployeeRef(),
    canceledOn: null
  }
</script>

<SpecialView {...rest} baseQuery={extendedBaseQuery} />
