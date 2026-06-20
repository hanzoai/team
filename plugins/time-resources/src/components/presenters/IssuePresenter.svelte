<script lang="ts">
  import { Issue } from '@hanzoteam/tracker'
  import { DocReferencePresenter } from '@hanzoteam/view-resources'

  export let value: Issue
</script>

<DocReferencePresenter {value} on:click>
  <slot />
</DocReferencePresenter>
