<script lang="ts">
  import { themeStore, formatDuration } from '@hanzo/ui'
  import { WorkSlot } from '@hanzo/time'
  import { calculateEventsDuration } from '../utils'

  export let events: WorkSlot[]

  let duration: string
  $: formatDuration(calculateEventsDuration(events), $themeStore.language).then((res) => {
    duration = res
  })
</script>

{duration}
