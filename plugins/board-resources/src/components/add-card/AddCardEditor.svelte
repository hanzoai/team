<script lang="ts">
  import { TextAreaEditor } from '@hanzo/ui'
  import board from '../../plugin'

  export let onClose: () => void
  export let onAdd: (title: string, checkNewLine?: boolean) => Promise<any>

  let value = ''

  async function addCard (event: CustomEvent) {
    const title = event.detail
    if (!title || title.trim().length === 0) {
      return
    }
    await onAdd(title, true)
    value = ''
  }
</script>

<TextAreaEditor
  bind:value
  placeholder={board.string.CardTitlePlaceholder}
  submitLabel={board.string.AddCard}
  on:submit={addCard}
  on:cancel={onClose}
/>
