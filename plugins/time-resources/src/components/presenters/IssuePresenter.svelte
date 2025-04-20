<script lang="ts">
  import { Issue } from '@hanzo/tracker'
  import { DocReferencePresenter } from '@hanzo/view-resources'

  export let value: Issue
</script>

<DocReferencePresenter {value} on:click>
  <slot />
</DocReferencePresenter>
