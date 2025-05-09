<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { SortingOrder } from '@hanzo/core'
  import { createMessagesQuery } from '@hanzo/presentation'
  import { Grid, Section, Spinner } from '@hanzo/ui'
  import { onDestroy, onMount } from 'svelte'
  import activity from '@hanzo/activity'
  import { Card } from '@hanzo/card'
  import { MessagePresenter, MessageInput } from '@hanzo/ui-next'
  import { Message, Window } from '@hanzo/communication-types'

  export let object: Card
  export let showInput: boolean = true
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  const query = createMessagesQuery()
  let isLoading = true
  let isNextLoading = false

  let messages: Message[] = []
  let window: Window<Message> | undefined

  $: query.query(
    {
      card: object._id,
      replies: true,
      files: true,
      reactions: true,
      order: SortingOrder.Ascending,
      limit: 100
    },
    (res) => {
      messages = res.getResult()
      isLoading = false
      window = res
    }
  )

  function handleScroll (event: Event): void {
    const element = event.target as HTMLElement
    if (element != null && window != null && window.hasNextPage() && !isNextLoading) {
      const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 200
      if (isAtBottom) {
        isNextLoading = true
        void window.loadNextPage().finally(() => {
          isNextLoading = false
        })
      }
    }
  }

  onMount(() => {
    if (!boundary) return
    boundary.addEventListener('scroll', handleScroll)
  })

  onDestroy(() => {
    if (!boundary) return
    boundary.removeEventListener('scroll', handleScroll)
  })
</script>

<div class="step-tb-6">
  <Section label={activity.string.Activity} icon={activity.icon.Activity}>
    <svelte:fragment slot="header">
      {#if isLoading}
        <div class="ml-1">
          <Spinner size="small" />
        </div>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="content">
      <div class="p-activity select-text" id={activity.string.Activity}>
        {#if messages.length}
          <Grid column={1} rowGap={1}>
            {#each messages as message (message.id)}
              <MessagePresenter {message} card={object} />
            {/each}
          </Grid>
        {/if}
      </div>
      {#if showInput}
        <div class="ref-input oldest-first">
          <MessageInput cardId={object._id} cardType={object._class} placeholder={activity.string.Message} />
        </div>
      {/if}
    </svelte:fragment>
  </Section>
</div>

<style lang="scss">
  .ref-input {
    flex-shrink: 0;

    &.newest-first {
      margin-bottom: 1rem;
      padding-top: 1rem;
    }

    &.oldest-first {
      padding-bottom: 2.5rem;
    }
  }

  .p-activity {
    &.newest-first {
      padding-bottom: 1.75rem;
    }

    &:not(.newest-first) {
      margin: 1.75rem 0;
    }
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  }
</style>
