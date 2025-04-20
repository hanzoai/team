<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Training } from '@hanzo/training'
  import { getClient } from '@hanzo/presentation'
  import { Label } from '@hanzo/ui'

  export let value: Training

  const label = getClient().getHierarchy().getAttribute(value._class, 'revision').label
</script>

<span>
  <Label {label} />
  {value.revision}
</span>
