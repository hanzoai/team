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
  import contact, { Channel, Organization } from '@hanzo/contact'
  import { ChannelsEditor } from '@hanzo/contact-resources'
  import { Ref, WithLookup } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { Vacancy } from '@hanzo/recruit'
  import { Component, Label } from '@hanzo/ui'
  import { DocNavLink } from '@hanzo/view-resources'
  import recruit from '../plugin'
  import VacancyIcon from './icons/Vacancy.svelte'
  import chunter from '@hanzo/chunter'

  export let vacancy: WithLookup<Vacancy> | undefined
  export let disabled: boolean = false
  export let inline: boolean = false
  let company: Organization | undefined

  $: getOrganization(vacancy, vacancy?.company)
  const client = getClient()

  async function getOrganization (
    vacancy: WithLookup<Vacancy> | undefined,
    _id: Ref<Organization> | undefined
  ): Promise<void> {
    if (vacancy?.$lookup?.company !== undefined) {
      company = vacancy.$lookup?.company
    }
    if (_id === undefined) {
      company = undefined
    } else {
      company = await client.findOne(contact.class.Organization, { _id })
    }
  }

  let channels: Channel[] = []
  const channelsQuery = createQuery()
  $: if (vacancy?.company !== undefined) {
    channelsQuery.query(
      contact.class.Channel,
      {
        attachedTo: vacancy?.company
      },
      (res) => {
        channels = res
      }
    )
  } else {
    channelsQuery.unsubscribe()
  }
</script>

<div class="antiContactCard" class:inline>
  {#if !inline}
    <div class="label uppercase"><Label label={recruit.string.Vacancy} /></div>
    <div class="flex-center logo">
      <VacancyIcon size={'large'} />
    </div>
  {/if}
  {#if vacancy}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <DocNavLink {disabled} object={vacancy}>
      <div class="name">
        {#if inline}
          <div class="flex-row-center">
            <VacancyIcon size={'small'} />
            <span class="ml-2">
              {vacancy.name}
            </span>
          </div>
        {:else}
          {vacancy.name}
        {/if}
      </div>
    </DocNavLink>
    {#if company}
      <span class="label overflow-label">{company.name}</span>
    {/if}
    {#if !inline || vacancy.description}
      <div class="description lines-limit-2 text-md">{vacancy.description ?? ''}</div>
    {/if}

    <div class="footer">
      <div class="flex-row-center gap-2">
        <Component
          is={chunter.component.ChatMessagesPresenter}
          props={{ value: vacancy, size: 'small', showCounter: true }}
        />
        <Component
          is={attachment.component.AttachmentsPresenter}
          props={{ value: vacancy.attachments, object: vacancy, size: 'small', showCounter: true }}
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
