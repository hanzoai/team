<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { type Training } from '@hanzo/training'
  import { DocNavLink } from '@hanzo/view-resources'

  export let value: Training
  export let disabled: boolean = false
</script>

{#if value}
  <div class="content-halfcontent-color">
    <DocNavLink object={value} {disabled} noOverflow accent>
      <span class="whitespace-nowrap fs-bold">
        {value.code}
      </span>
    </DocNavLink>
  </div>
{/if}
