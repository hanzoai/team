<script lang="ts">
  import { Label } from '@hanzo/ui'
  import Google from '../icons/Google.svelte'
  import login from '../../plugin'
</script>

<div class="flex-row-center flex-gap-2">
  <Google />
  <Label label={login.string.ContinueWith} params={{ provider: 'Google' }} />
</div>
