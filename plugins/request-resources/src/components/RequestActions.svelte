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
  import { AttachmentRefInput } from '@hanzo/attachment-resources'
  import chunter, { ChatMessage } from '@hanzo/chunter'
  import { getCurrentEmployee } from '@hanzo/contact'
  import { AttachedData, getCurrentAccount, Markup } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import { Request, RequestStatus } from '@hanzo/request'
  import { EmptyMarkup, isEmptyMarkup } from '@hanzo/text'
  import { type RefAction } from '@hanzo/text-editor'
  import { Button } from '@hanzo/ui'

  import request from '../plugin'
  import Comments from './icons/Comments.svelte'
  import DocFail from './icons/DocFail.svelte'
  import DocSuccess from './icons/DocSuccess.svelte'

  export let value: Request

  const client = getClient()
  const account = getCurrentAccount()
  const myPerson = getCurrentEmployee()

  const approvable =
    value.requested.filter((a) => a === myPerson).length > value.approved.filter((a) => a === myPerson).length

  async function approve () {
    await saveComment()
    await client.update(value, {
      $push: {
        approved: myPerson
      }
    })
  }

  $: disabled = commentIsEmpty(message, attachments)

  async function reject () {
    await saveComment()
    await client.update(value, {
      rejected: myPerson,
      status: RequestStatus.Rejected
    })
  }

  let message: Markup = EmptyMarkup
  let attachments: number | undefined = 0

  async function onUpdate (event: CustomEvent<AttachedData<ChatMessage>>) {
    message = event.detail.message
    attachments = event.detail.attachments
  }

  async function saveComment (): Promise<void> {
    const _id = await client.addCollection(
      chunter.class.ChatMessage,
      value.space,
      value._id,
      value._class,
      'comments',
      {
        message,
        attachments
      }
    )

    await client.createMixin(_id, chunter.class.ChatMessage, value.space, request.mixin.RequestDecisionComment, {})

    refInput.createAttachments()
    loading = false
  }

  async function comment (): Promise<void> {
    await client.addCollection(chunter.class.ChatMessage, value.space, value._id, value._class, 'comments', {
      message,
      attachments
    })

    loading = false
  }

  function commentIsEmpty (message: string, attachments: number | undefined): boolean {
    return isEmptyMarkup(message) && !((attachments ?? 0) > 0)
  }

  let refInput: AttachmentRefInput
  let extraActions: RefAction[]
  $: extraActions = [
    {
      label: request.string.Approve,
      icon: DocSuccess,
      action: () => {
        void approve()
      },
      order: 1000,
      fill: 'var(--theme-won-color)',
      disabled
    },
    {
      label: request.string.Reject,
      icon: DocFail,
      action: () => {
        void reject()
      },
      order: 2000,
      fill: 'var(--theme-lost-color)',
      disabled
    }
  ]
  let loading = false

  async function cancel () {
    await client.update(value, {
      status: RequestStatus.Cancelled
    })
  }
</script>

{#if value.status === RequestStatus.Active}
  {#if value.createdBy !== undefined && account.socialIds.includes(value.createdBy)}
    <div class="mt-2">
      <Button label={request.string.Cancel} on:click={cancel} />
    </div>
  {/if}
  <div class="mt-2">
    <AttachmentRefInput
      bind:this={refInput}
      space={value.space}
      _class={value._class}
      objectId={value._id}
      iconSend={Comments}
      labelSend={request.string.Comment}
      on:message={comment}
      on:update={onUpdate}
      placeholder={request.string.PleaseTypeMessage}
      extraActions={approvable ? extraActions : undefined}
      bind:loading
    />
  </div>
{/if}
