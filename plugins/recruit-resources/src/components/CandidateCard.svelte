<!--
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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
  import attachment from '@hanzo/attachment'
  import contact, { Channel, getName, Person } from '@hanzo/contact'
  import { ChannelsEditor, Avatar } from '@hanzo/contact-resources'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { Component, Label } from '@hanzo/ui'
  import { DocNavLink } from '@hanzo/view-resources'
  import recruit from '../plugin'
  import chunter from '@hanzo/chunter'

  export let candidate: Person | undefined
  export let disabled: boolean = false

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  $: if (candidate !== undefined) {
    channelsQuery.query(
      contact.class.Channel,
      {
        attachedTo: candidate._id
      },
      (res) => {
        channels = res
      }
    )
  } else {
    channelsQuery.unsubscribe()
  }
  const client = getClient()
</script>

<div class="antiContactCard">
  <div class="label uppercase"><Label label={recruit.string.Talent} /></div>
  <Avatar person={candidate} size={'large'} name={candidate?.name} />
  {#if candidate}
    <DocNavLink object={candidate} {disabled}>
      <div class="name lines-limit-2">
        {getName(client.getHierarchy(), candidate)}
      </div>
    </DocNavLink>
    {#if client.getHierarchy().hasMixin(candidate, recruit.mixin.Candidate)}
      {@const cand = client.getHierarchy().as(candidate, recruit.mixin.Candidate)}
      {@const titleAttribute = client.getHierarchy().getAttribute(recruit.mixin.Candidate, 'title')}
      {#if !titleAttribute.hidden}
        <div class="description lines-limit-2">{cand.title ?? ''}</div>
      {/if}
    {/if}
    <div class="description overflow-label">{candidate.city ?? ''}</div>
    <div class="footer">
      <div class="flex-row-center gap-2">
        <Component
          is={chunter.component.ChatMessagesPresenter}
          props={{ value: candidate, size: 'small', showCounter: true }}
        />
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: candidate.attachments, object: candidate, size: 'small', showCounter: true }}
        />
      </div>
      {#if channels[0]}
        <ChannelsEditor
          attachedTo={channels[0].attachedTo}
          attachedClass={channels[0].attachedToClass}
          length={'short'}
          editable={false}
        />
      {/if}
    </div>
  {/if}
</div>
