<script lang="ts">
  import { IconSearch } from '@hanzo/ui'
  import { showPopup } from '@hanzo/ui/src/popups'
  import ActionsPopup from './ActionsPopup.svelte'

  function openPopup () {
    showPopup(ActionsPopup, {}, 'top')
  }
</script>

<button
  id="statusbar-search"
  class="antiButton ghost jf-center bs-none no-focus resetIconSize statusButton square"
  on:click={openPopup}
  style:color={'var(--theme-dark-color)'}
>
  <IconSearch size={'small'} />
</button>
