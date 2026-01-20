<script lang="ts">
  import { Label } from '@hanzo/ui'
  import login from '../../plugin'

  export let displayName = 'Google'
</script>

<div class="flex-row-center flex-gap-2">
  <Google />
  <Label label={login.string.ContinueWith} params={{ provider: displayName }} />
</div>
