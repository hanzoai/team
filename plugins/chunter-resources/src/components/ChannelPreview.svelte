<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createQuery } from '@hanzo/presentation'
  import chunter, { ChatMessage, DirectMessage } from '@hanzo/chunter'
  import { Label } from '@hanzo/ui'
  import { ActivityMessagePresenter } from '@hanzo/activity-resources'

  import chunterResources from '../plugin'
  import { getChannelSpace } from '../utils'

  export let object: DirectMessage

  const NUM_OF_RECENT_MESSAGES = 5 as const

  let messages: ChatMessage[] = []
  const messagesQuery = createQuery()
  $: messagesQuery.query(
    chunter.class.ChatMessage,
    { attachedTo: object._id, space: getChannelSpace(object._class, object._id, object.space) },
    (res) => {
      if (res !== undefined) {
        messages = res.sort((a, b) => (a.createdOn ?? 0) - (b.createdOn ?? 0))
      }
    },
    {
      limit: NUM_OF_RECENT_MESSAGES,
      sort: {
        createdOn: SortingOrder.Descending
      }
    }
  )
</script>

<div class="flex-col flex-gap-3 preview-container">
  {#if messages.length}
    {#each messages as message}
      <ActivityMessagePresenter value={message} skipLabel />
    {/each}
  {:else}
    <Label label={chunterResources.string.NoMessages} />
  {/if}
</div>

<style lang="scss">
  .preview-container {
    padding: 0.5rem;
    background-color: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
</style>
