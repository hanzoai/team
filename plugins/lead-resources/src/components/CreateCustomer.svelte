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
  import { AvatarType, Channel, combineName, Contact, findContacts, type Organization } from '@hanzo/contact'
  import { ChannelsDropdown, EditableAvatar, PersonPresenter } from '@hanzo/contact-resources'
  import contact from '@hanzo/contact-resources/src/plugin'
  import {
    AttachedData,
    Class,
    Data,
    Doc,
    MixinData,
    Ref,
    WithLookup,
    generateId,
    makeCollabId
  } from '@hanzo/core'
  import { Customer, LeadEvents } from '@hanzo/lead'
  import { Card, createMarkup, getClient, InlineAttributeBar } from '@hanzo/presentation'
  import { StyledTextBox } from '@hanzo/text-editor-resources'
  import { EmptyMarkup, isEmptyMarkup } from '@hanzo/text'
  import {
    Button,
    createFocusManager,
    EditBox,
    eventToHTMLElement,
    FocusHandler,
    IconInfo,
    Label,
    SelectPopup,
    showPopup
  } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import { Analytics } from '@hanzo/analytics'
  import lead from '../plugin'

  let firstName = ''
  let lastName = ''
  let description = EmptyMarkup

  export function canClose (): boolean {
    return firstName === '' && lastName === ''
  }

  let avatarEditor: EditableAvatar

  const object: Customer = {
    _class: contact.class.Person
  } as unknown as Customer

  const dispatch = createEventDispatcher()
  const client = getClient()
  let customerId = generateId()

  let channels: AttachedData<Channel>[] = []
  let avatar: File | undefined

  function formatName (targetClass: Ref<Class<Doc>>, firstName: string, lastName: string, objectName: string): string {
    return targetClass === contact.class.Person ? combineName(firstName.trim(), lastName.trim()) : objectName
  }

  async function createCustomer (): Promise<void> {
    const candidate: Data<Contact> = {
      name,
      city: object.city,
      avatarType: AvatarType.COLOR
    }
    if (avatar !== undefined) {
      const info = await avatarEditor.createAvatar()
      candidate.avatar = info.avatar
      candidate.avatarType = info.avatarType
      candidate.avatarProps = info.avatarProps
    }

    if (client.getHierarchy().isDerived(targetClass._id, contact.class.Organization)) {
      ;(candidate as Organization).description = null
    }

    const candidateData: MixinData<Contact, Customer> = {
      customerDescription: null
    }

    if (!isEmptyMarkup(description)) {
      const collabId = makeCollabId(lead.mixin.Customer, customerId, 'customerDescription')
      candidateData.customerDescription = await createMarkup(collabId, description)
    }

    const id = await client.createDoc(targetClass._id, contact.space.Contacts, { ...candidate, ...object }, customerId)
    await client.createMixin(
      id as Ref<Contact>,
      targetClass._id,
      contact.space.Contacts,
      lead.mixin.Customer,
      candidateData
    )

    for (const channel of channels) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        customerId,
        targetClass._id,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }
    Analytics.handleEvent(LeadEvents.CustomerCreated, { id })
  }

  const targets = [
    client.getModel().getObject(contact.class.Person),
    client.getModel().getObject(contact.class.Organization)
  ]
  let targetClass = targets[0]

  function selectTarget (evt: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: targets.map((it) => ({ id: it._id, label: it.label, icon: it.icon })),
        placeholder: contact.string.Contacts,
        searchable: false
      },
      eventToHTMLElement(evt),
      (ref) => {
        if (ref != null) {
          const newT = targets.find((it) => it._id === ref)
          if (newT !== undefined) {
            if (targetClass._id !== newT._id) {
              targetClass = newT
              object.name = ''
              firstName = ''
              lastName = ''
              customerId = generateId()
              avatar = undefined
            }
          }
        }
      }
    )
  }
  $: name = formatName(targetClass._id, firstName, lastName, object.name)
  $: canSave = name.trim().length > 0

  const manager = createFocusManager()

  let matches: WithLookup<Contact>[] = []
  let matchedChannels: AttachedData<Channel>[] = []
  $: if (targetClass !== undefined) {
    void findContacts(client, targetClass._id, name, channels).then((p) => {
      matches = p.contacts
      matchedChannels = p.channels
    })
  }
</script>

<FocusHandler {manager} />

<Card
  label={lead.string.CreateCustomer}
  okAction={createCustomer}
  {canSave}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <Button icon={targetClass.icon} label={targetClass.label} size={'large'} on:click={selectTarget} focusIndex={100} />
  </svelte:fragment>
  {#if targetClass._id === contact.class.Person}
    <div class="flex-between flex-row-top">
      <div class="flex-col flex-grow">
        <EditBox
          placeholder={contact.string.PersonFirstNamePlaceholder}
          bind:value={firstName}
          kind={'large-style'}
          autoFocus
          focusIndex={1}
        />
        <EditBox
          placeholder={contact.string.PersonLastNamePlaceholder}
          bind:value={lastName}
          kind={'large-style'}
          focusIndex={2}
        />
        <div class="mt-1">
          <EditBox
            placeholder={contact.string.PersonLocationPlaceholder}
            bind:value={object.city}
            kind={'small-style'}
            focusIndex={3}
          />
        </div>
        <div class="mt-1">
          <StyledTextBox
            bind:content={description}
            placeholder={lead.string.IssueDescriptionPlaceholder}
            kind={'normal'}
            alwaysEdit={true}
            showButtons={false}
            focusIndex={4}
          />
        </div>
      </div>
      <div class="ml-4 flex">
        <EditableAvatar
          person={object}
          size={'large'}
          name={object.name}
          bind:this={avatarEditor}
          bind:direct={avatar}
        />
      </div>
    </div>
  {:else}
    <div class="flex-row-center clear-mins">
      <div class="mr-3">
        <Button icon={contact.icon.Company} size={'medium'} kind={'link-bordered'} noFocus />
      </div>
      <EditBox
        placeholder={contact.string.OrganizationNamePlaceholder}
        bind:value={object.name}
        kind={'large-style'}
        autoFocus
        focusIndex={1}
      />
    </div>
    <div class="flex-col flex-grow">
      <div class="mt-1">
        <StyledTextBox
          bind:content={description}
          placeholder={lead.string.IssueDescriptionPlaceholder}
          kind={'normal'}
          alwaysEdit={true}
          showButtons={false}
          focusIndex={4}
        />
      </div>
    </div>
  {/if}
  <svelte:fragment slot="pool">
    <ChannelsDropdown
      bind:value={channels}
      focusIndex={10}
      kind={'regular'}
      size={'large'}
      editable
      highlighted={matchedChannels.map((it) => it.provider)}
    />
    {#if targetClass._id === contact.class.Organization}
      <InlineAttributeBar
        _class={contact.class.Organization}
        {object}
        toClass={contact.class.Contact}
        on:update
        extraProps={{ showNavigate: false }}
      />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="footer">
    {#if matches.length > 0}
      <div class="flex-row-center error-color">
        <IconInfo size={'small'} />
        <span class="text-sm overflow-label ml-2">
          <Label label={contact.string.PersonAlreadyExists} />
        </span>
        <div class="ml-4"><PersonPresenter value={matches[0]} /></div>
      </div>
    {/if}
  </svelte:fragment>
</Card>
