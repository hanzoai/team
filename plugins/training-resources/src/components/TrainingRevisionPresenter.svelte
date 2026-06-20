<!--
  Copyright @ 2024 Hanzo AI Inc.
-->

<script lang="ts">
  import type { Training } from '@hanzoteam/training'
  import { getClient } from '@hanzoteam/presentation'
  import { Label } from '@hanzoteam/ui'

  export let value: Training

  const label = getClient().getHierarchy().getAttribute(value._class, 'revision').label
</script>

<span>
  <Label {label} />
  {value.revision}
</span>
