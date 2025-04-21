<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import type { Emoji } from 'emojibase'
  import { Label, closeTooltip, ModernCheckbox } from '../../'
  import { generateSkinToneEmojis, skinTones, getEmojiCode } from '.'
  import type { EmojiWithGroup } from '.'

  export let emoji: number | number[] | string | Emoji | EmojiWithGroup
  export let selected: number

  const dispatch = createEventDispatcher()
  closeTooltip()

  const skins: string[] = generateSkinToneEmojis(getEmojiCode(emoji))
</script>

<div class="hanzoaiPopup-container noPadding">
  <div class="hanzoaiPopup-group">
    {#each skins as skin, index}
      {@const disabled = selected === index}
      {@const label = skinTones.get(index)}
      <button
        class="hanzoaiPopup-row withKeys"
        class:noHover={disabled}
        on:click={() => {
          if (disabled) return undefined
          dispatch('close', index)
        }}
      >
        <span style:font-size={'1.5rem'}>{skin}</span>
        {#if label}<span class="hanzoaiPopup-row__label"><Label {label} /></span>{/if}
        {#if disabled}<span class="hanzoaiPopup-row__keys"><ModernCheckbox checked disabled /></span>{/if}
      </button>
    {/each}
  </div>
</div>
