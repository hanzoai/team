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
  import { AvatarType, Channel, combineName, ContactEvents, Person, SocialIdentityRef } from '@hanzo/contact'
  import {
    AccountRole,
    AttachedData,
    buildSocialIdString,
    Data,
    generateId,
    Ref,
    SocialIdType
  } from '@hanzo/core'
  import login from '@hanzo/login'
  import { getResource } from '@hanzo/platform'
  import { Card, getClient } from '@hanzo/presentation'
  import { createFocusManager, EditBox, FocusHandler, IconInfo, Label } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'
  import { ChannelsDropdown, employeeBySocialKeyStore } from '..'
  import contact from '../plugin'
  import { getAccountClient } from '../utils'
  import { Analytics } from '@hanzo/analytics'

  export let canSave: boolean = true
  export let onCreate: ((id: Ref<Person>) => Promise<void>) | undefined = undefined

  let firstName = ''
  let lastName = ''
  let email = ''

  const id: Ref<Person> = generateId()

  export function canClose (): boolean {
    return firstName === '' && lastName === '' && email === ''
  }

  let saving: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()
  const accountClient = getAccountClient()

  async function createGuest (): Promise<void> {
    try {
      saving = true
      changeEmail()
      const mail = email.trim()
      const socialString = buildSocialIdString({
        type: SocialIdType.EMAIL,
        value: mail
      })

      const existingId = await client.findOne(contact.class.SocialIdentity, { key: socialString })
      const existingPerson =
        existingId !== undefined
          ? await client.findOne(contact.class.Person, { _id: existingId.attachedTo })
          : undefined
      if (existingPerson !== undefined && client.getHierarchy().hasMixin(existingPerson, contact.mixin.Employee)) {
        return
      }

      const { uuid, socialId } = await accountClient.ensurePerson(SocialIdType.EMAIL, mail, firstName, lastName)

      const name = combineName(firstName, lastName)
      const person: Data<Person> = {
        name,
        city: '',
        avatarType: AvatarType.COLOR,
        personUuid: uuid
      }

      if (existingPerson === undefined) {
        await client.createDoc(contact.class.Person, contact.space.Contacts, person, id)
      } else {
        await client.update(existingPerson, person)
      }
      const personRef = existingPerson?._id ?? id

      await client.createMixin(personRef, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
        active: true,
        role: AccountRole.Guest
      })

      await client.addCollection(
        contact.class.SocialIdentity,
        contact.space.Contacts,
        personRef,
        contact.class.Person,
        'socialIds',
        {
          type: SocialIdType.EMAIL,
          value: mail,
          key: socialString
        },
        socialId as SocialIdentityRef
      )

      const sendInvite = await getResource(login.function.SendInvite)
      await sendInvite(mail, AccountRole.Guest)

      for (const channel of channels) {
        await client.addCollection(
          contact.class.Channel,
          contact.space.Contacts,
          id,
          contact.class.Person,
          'channels',
          {
            value: channel.value,
            provider: channel.provider
          }
        )
      }
      if (onCreate != null) {
        await onCreate(personRef)
      }
      Analytics.handleEvent(ContactEvents.PersonCreated, { id, email: mail })
      dispatch('close', id)
    } finally {
      saving = false
    }
  }

  let channels: AttachedData<Channel>[] = []

  $: emailSocialString = buildSocialIdString({
    type: SocialIdType.EMAIL,
    value: email.trim()
  })
  $: exists = $employeeBySocialKeyStore.get(emailSocialString) !== undefined

  const manager = createFocusManager()

  function changeEmail (): void {
    const index = channels.findIndex((p) => p.provider === contact.channelProvider.Email)
    if (index !== -1) {
      channels[index].value = email.trim()
    } else {
      channels.push({
        provider: contact.channelProvider.Email,
        value: email.trim()
      })
    }
    channels = channels
  }
</script>

<FocusHandler {manager} />

<Card
  label={contact.string.AddGuest}
  okAction={createGuest}
  canSave={firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0 && !exists && canSave}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="error">
    {#if exists && !saving}
      <div class="flex-row-center error-color">
        <IconInfo size={'small'} />
        <span class="text-sm overflow-label ml-2">
          <Label label={contact.string.PersonAlreadyExists} />
        </span>
      </div>
    {/if}
  </svelte:fragment>
  <div class="flex-row-center">
    <div class="flex-grow flex-col">
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
          placeholder={contact.string.Email}
          bind:value={email}
          kind={'small-style'}
          focusIndex={3}
          on:blur={changeEmail}
        />
      </div>
      <slot name="extraControls" />
    </div>
  </div>
  <svelte:fragment slot="pool">
    <ChannelsDropdown
      bind:value={channels}
      focusIndex={10}
      kind={'regular'}
      size={'large'}
      editable
      restricted={[contact.channelProvider.Email]}
    />
  </svelte:fragment>
</Card>
