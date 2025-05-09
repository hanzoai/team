<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import type { AttachedDoc, Class, Collection, Doc, Ref } from '@hanzo/core'
  import { IntlString, translateCB } from '@hanzo/platform'
  import { KeyedAttribute } from '@hanzo/presentation'
  import { TagElement, TagReference } from '@hanzo/tags'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@hanzo/ui'
  import { Button, showPopup, themeStore } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import TagsPopup from './TagsPopup.svelte'

  export let items: TagReference[] = []
  export let targetClass: Ref<Class<Doc>>
  export let key: KeyedAttribute
  export let newElements: TagElement[] = []
  export let countLabel: IntlString

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let focusIndex = -1

  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  let keyLabel: string = ''

  $: itemLabel = (key.attr.type as Collection<AttachedDoc>).itemLabel

  $: translateCB(itemLabel ?? key.attr.label, {}, $themeStore.language, (v) => {
    keyLabel = v
  })

  async function addRef (tag: TagElement): Promise<void> {
    dispatch('open', tag)
  }
  async function addTag (evt: Event): Promise<void> {
    showPopup(
      TagsPopup,
      {
        newElements,
        targetClass,
        selected: items.map((it) => it.tag),
        keyLabel
      },
      evt.target as HTMLElement,
      () => {},
      (result) => {
        if (result !== undefined) {
          if (result.action === 'add') {
            void addRef(result.tag)
          } else if (result.action === 'remove') {
            void removeTag(result.tag)
          }
        }
      },
      {
        refId: 'TagsPopup',
        category: 'popup',
        overlay: true
      }
    )
  }

  async function removeTag (tag: TagElement): Promise<void> {
    dispatch('delete', tag)
  }

  let countText = ''
  $: translateCB(countLabel, { count: items.length }, $themeStore.language, (res) => {
    countText = res
  })
</script>

<Button
  {disabled}
  icon={key.attr.icon ?? tags.icon.Tags}
  label={items.length > 0 ? undefined : key.attr.label}
  notSelected={items.length === 0}
  width={width ?? 'min-content'}
  {kind}
  {size}
  {justify}
  {focusIndex}
  showTooltip={{ label: key.attr.label, direction: labelDirection }}
  on:click={addTag}
>
  <svelte:fragment slot="content">
    {#if items.length > 0}
      <span class="flex-row-center flex-nowrap overflow-label disabled">
        {countText}
      </span>
    {/if}
  </svelte:fragment>
</Button>
