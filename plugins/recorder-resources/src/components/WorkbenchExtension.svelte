<script lang="ts">
  import { getMetadata } from '@hanzo/platform'
  import { pushRootBarComponent } from '@hanzo/ui'
  import { onMount } from 'svelte'

  import recorder from '../plugin'
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hanzo/core'

  const readonly = !hasAccountRole(getCurrentAccount(), AccountRole.Guest)

  onMount(() => {
    const endpoint = getMetadata(recorder.metadata.StreamUrl) ?? ''
    if (endpoint !== '' && !readonly) {
      pushRootBarComponent('right', recorder.component.RecorderExt, 1300)
    }
  })
</script>

<div id="recorder-workbench-ext" class="hidden" />
