<script lang="ts">
  import { Ref, Blob } from '@hanzo/core'

  import { getBlobRef } from '@hanzo/presentation'

  export let value: Ref<Blob> | undefined
</script>

{#if value !== undefined}
  {#await getBlobRef(value) then image}
    <span class="emoji emojiOnly"><img src={image.src} alt="test" /></span>
  {/await}
{/if}

<style lang="scss">
  .emojiOnly {
    font-size: 2rem;
    line-height: 115%;
  }
</style>
