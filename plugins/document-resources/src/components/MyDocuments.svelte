<script lang="ts">
  import { getCurrentEmployee } from '@hanzo/contact'
  import Documents from './Documents.svelte'

  const currentUser = getCurrentEmployee()
</script>

<Documents query={{ authors: currentUser }} />
