<script lang="ts">
  import { IconSearch, StatusBarButton, showPopup } from '@hanzo/ui'
  import ActionsPopup from './ActionsPopup.svelte'

  function openPopup (): void {
    showPopup(ActionsPopup, {}, 'top')
  }
</script>

<StatusBarButton id={'statusbar-search'} on:click={openPopup} icon={IconSearch} />
