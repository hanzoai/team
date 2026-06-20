<script lang="ts">
  import { Label } from '@hanzoteam/ui'
  import login from '../../plugin'

  export let displayName = 'Github'
</script>

<div class="flex-row-center flex-gap-2">
  <Github />
  <Label label={login.string.ContinueWith} params={{ provider: displayName }} />
</div>
