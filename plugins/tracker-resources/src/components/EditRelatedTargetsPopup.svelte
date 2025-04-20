<script lang="ts">
  import { Space } from '@hanzo/core'
  import { Card } from '@hanzo/presentation'
  import ui from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import EditRelatedTargets from './EditRelatedTargets.svelte'

  export let value: Space
  const dispatch = createEventDispatcher()
</script>

<Card
  label={tracker.string.RelatedIssues}
  canSave={true}
  okAction={() => {
    dispatch('close')
  }}
  okLabel={ui.string.Ok}
  on:close
>
  <EditRelatedTargets {value} on:close />
</Card>
