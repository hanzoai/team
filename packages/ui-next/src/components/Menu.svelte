<!--TODO: Remove it or rewrite-->
<script lang="ts">
  import { Action, Menu } from '@hanzo/ui'

  export let actions: Action[] = []
</script>

<Menu {actions} on:close on:changeContent />
