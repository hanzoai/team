<script lang="ts">
  import { CardCover } from '@hanzo/board'
  import { Button, eventToHTMLElement, Icon, IconAdd, showPopup } from '@hanzo/ui'
  import CardCoverPicker from '../popups/CardCoverPicker.svelte'
  import CardCoverPresenter from '../presenters/CardCoverPresenter.svelte'

  export let value: CardCover
  export let onChange: (value: any) => void

  const coverHandler = (ev: MouseEvent) => {
    showPopup(CardCoverPicker, { value, onChange }, eventToHTMLElement(ev))
  }
</script>

<Button kind="link" on:click={coverHandler}>
  <div slot="content">
    {#if value}
      <CardCoverPresenter {value} on:click={coverHandler} />
    {:else}
      <Icon icon={IconAdd} size="small" />
    {/if}
  </div>
</Button>
