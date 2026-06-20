<script lang="ts">
  import lead from '@hanzoteam/lead'
  import { Icon, IconSize } from '@hanzoteam/ui'
  export let size: IconSize = 'small'
</script>

<div class="flex-center template-icon">
  <Icon icon={lead.icon.LeadApplication} {size} />
</div>

<style lang="scss">
  .template-icon {
    width: 100%;
    height: 100%;
  }
</style>
