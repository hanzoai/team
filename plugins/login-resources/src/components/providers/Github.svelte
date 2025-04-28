<script lang="ts">
  import { Label } from '@hanzo/ui'
  import login from '../../plugin'
  import Github from '../icons/Github.svelte'
</script>

<div class="flex-row-center flex-gap-2">
  <Github />
  <Label label={login.string.ContinueWith} params={{ provider: 'Github' }} />
</div>
