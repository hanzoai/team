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
  import { Icon, Label } from '@hanzo/ui'
  import { Asset, IntlString } from '@hanzo/platform'
  import activity, { DisplayDocUpdateMessage, DocUpdateMessage, DocUpdateMessageViewlet } from '@hanzo/activity'

  import DocUpdateMessageObjectValue from './DocUpdateMessageObjectValue.svelte'

  export let message: DisplayDocUpdateMessage
  export let viewlet: DocUpdateMessageViewlet | undefined
  export let objectName: IntlString | undefined
  export let collectionName: IntlString | undefined
  export let objectIcon: Asset | undefined
  export let preview = false

  const isOwn = message.objectId === message.attachedTo

  let valueMessages: DocUpdateMessage[] = []

  $: valueMessages = message.previousMessages?.length ? [...message.previousMessages, message] : [message]
  $: hasDifferentActions = message.previousMessages?.some(({ action }) => action !== message.action)
</script>

<div class="content overflow-label" class:preview>
  <span class="mr-1">
    <Icon icon={viewlet?.icon ?? objectIcon ?? activity.icon.Activity} size="small" />
  </span>
  {#if hasDifferentActions}
    <Label label={activity.string.UpdatedCollection} />
  {:else if message.action === 'create'}
    <Label label={activity.string.New} />
  {:else if message.action === 'remove' && message.updateCollection}
    <Label label={activity.string.Removed} />
  {/if}
  <span class="lower">
    {#if collectionName && (message.previousMessages?.length || !isOwn)}
      <Label label={collectionName} />:
    {:else if objectName}
      <Label label={objectName} />:
    {/if}
  </span>

  <span class="overflow-label values" class:preview>
    {#if hasDifferentActions}
      {@const removeMessages = valueMessages.filter(({ action }) => action === 'remove')}
      {@const createMessages = valueMessages.filter(({ action }) => action === 'create')}

      {@const createMessagesLen = createMessages.length}
      {@const removeMessagesLen = removeMessages.length}

      {#each createMessages as valueMessage, index}
        <DocUpdateMessageObjectValue
          attachedTo={valueMessage.attachedTo}
          objectClass={valueMessage.objectClass}
          objectId={valueMessage.objectId}
          action={valueMessage.action}
          {viewlet}
          withIcon={index === 0}
          hasSeparator={createMessagesLen > 1 && index !== createMessagesLen - 1}
          {preview}
        />
      {/each}
      {#each removeMessages as valueMessage, index}
        <DocUpdateMessageObjectValue
          attachedTo={valueMessage.attachedTo}
          objectClass={valueMessage.objectClass}
          objectId={valueMessage.objectId}
          action={valueMessage.action}
          {viewlet}
          withIcon={index === 0}
          hasSeparator={removeMessagesLen > 1 && index !== removeMessagesLen - 1}
          {preview}
        />
      {/each}
    {:else}
      {@const len = valueMessages.length}
      {#each valueMessages as valueMessage, index}
        <DocUpdateMessageObjectValue
          attachedTo={valueMessage.attachedTo}
          objectClass={valueMessage.objectClass}
          objectId={valueMessage.objectId}
          action={valueMessage.action}
          {viewlet}
          hasSeparator={len > 1 && index !== len - 1}
          {preview}
        />
      {/each}
    {/if}
  </span>
</div>

<style lang="scss">
  .content {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    flex-wrap: wrap;
    color: var(--global-primary-TextColor);

    &.preview {
      flex-wrap: nowrap;
    }
  }

  .values {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    &.preview {
      flex-wrap: nowrap;
    }
  }
</style>
