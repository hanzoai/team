<script lang="ts">
  import { Integration } from '@hanzoteam/setting'
  import Connect from './Connect.svelte'

  export let integration: Integration
</script>

<Connect bind:integration on:close />
