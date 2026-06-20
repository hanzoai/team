<script lang="ts">
  import { themeStore } from '@hanzoteam/theme'
  import { updateCustomEmojis, updateUnicodeEmojis } from '../utils'
  import emojiPlugin from '@hanzoteam/emoji'
  import { createQuery } from '@hanzoteam/presentation'
  let parentElement: HTMLDivElement

  const customEmojisQuery = createQuery()
  $: customEmojisQuery.query(emojiPlugin.class.CustomEmoji, {}, (res) => {
    updateCustomEmojis(res)
  })

  $: void updateUnicodeEmojis($themeStore.language)
</script>

<div bind:this={parentElement} class="hidden"></div>
