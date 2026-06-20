<script lang="ts">
  import { getCurrentEmployee } from '@hanzoteam/contact'
  import Documents from './Documents.svelte'

  const currentUser = getCurrentEmployee()
</script>

<Documents query={{ authors: currentUser }} />
