<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { AccountRole, getCurrentAccount, hasAccountRole, Timestamp } from '@hanzo/core'
  import { copyTextToClipboard, createQuery } from '@hanzo/presentation'
  import setting from '@hanzo/setting'
  import { Button, EditBox, Grid, Label, Loading, MiniToggle, ticker } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'

  import login from '../plugin'
  import { getInviteLink } from '../utils'
  import InviteWorkspace from './icons/InviteWorkspace.svelte'

  export let role: AccountRole = AccountRole.User
  export let ignoreSettings: boolean = false

  const dispatch = createEventDispatcher()

  const query = createQuery()
  const isSecureContext = window.isSecureContext

  interface InviteParams {
    expirationTime: number
    emailMask: string
    limit: number | undefined
  }

  $: !ignoreSettings &&
    query.query(setting.class.InviteSettings, {}, (set) => {
      if (set !== undefined && set.length > 0) {
        expHours = set[0].expirationTime
        emailMask = set[0].emailMask
        limit = set[0].limit
      } else {
        expHours = 48
        limit = -1
      }

      if (limit === -1) noLimit = true

      defaultValues = {
        expirationTime: expHours,
        emailMask,
        limit
      }
    })

  function setToDefault (): void {
    expHours = defaultValues.expirationTime
    emailMask = defaultValues.emailMask
    limit = defaultValues.limit
  }

  async function getLink (expHours: number, mask: string, limit: number | undefined, role: AccountRole): Promise<void> {
    loading = true
    link = await getInviteLink(expHours, mask, limit ?? -1, role)
    loading = false
  }

  let copiedTime: Timestamp | undefined
  let copied = false

  $: if (copiedTime !== undefined && copied && $ticker - copiedTime > 1000) {
    copied = false
  }

  async function copy (): Promise<void> {
    if (!isSecureContext) return
    if (link === undefined) return

    await copyTextToClipboard(link)
    copied = true
    copiedTime = Date.now()
  }

  let expHours: number = 48
  let emailMask: string = ''
  let limit: number | undefined = undefined
  let useDefault: boolean | undefined = true
  let noLimit: boolean = false
  const isOwnerOrMaintainer: boolean = hasAccountRole(getCurrentAccount(), AccountRole.Maintainer)
  let defaultValues: InviteParams = {
    expirationTime: 48,
    emailMask: '',
    limit: undefined
  }

  let link: string | undefined
  let loading = false
</script>

<div class="antiPopup popup" class:secure={isSecureContext}>
  <div class="flex-between fs-title mb-9">
    <Label label={login.string.InviteDescription} />
    <InviteWorkspace size={'large'} />
  </div>
  {#if isOwnerOrMaintainer && !ignoreSettings}
    <Grid column={1} rowGap={1.5}>
      <MiniToggle
        bind:on={useDefault}
        label={login.string.UseWorkspaceInviteSettings}
        on:click={() => {
          setToDefault()
        }}
      />
      {#if !useDefault}
        <EditBox
          label={login.string.LinkValidHours}
          bind:value={expHours}
          format={'number'}
          on:keypress={() => (link = undefined)}
          disabled={useDefault || !isOwnerOrMaintainer}
        />
        <EditBox
          label={login.string.EmailMask}
          bind:value={emailMask}
          on:keypress={() => (link = undefined)}
          disabled={useDefault || !isOwnerOrMaintainer}
        />
        <MiniToggle bind:on={noLimit} label={login.string.NoLimit} on:change={() => noLimit && (limit = -1)} />
        {#if !noLimit}
          <EditBox
            label={login.string.InviteLimit}
            bind:value={limit}
            format={'number'}
            on:keypress={() => (link = undefined)}
            disabled={useDefault || !isOwnerOrMaintainer}
          />
        {/if}
      {/if}
    </Grid>
  {/if}
  {#if loading}
    <Loading />
  {:else if link !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="link" class:notSecure={!isSecureContext} class:over-underline={isSecureContext} on:click={copy}>
      {link}
    </div>
    <div class="buttons">
      <Button
        label={login.string.Close}
        size={'medium'}
        kind={'primary'}
        on:click={() => {
          dispatch('close')
        }}
      />
      {#if isSecureContext}
        <Button label={copied ? login.string.Copied : login.string.Copy} size={'medium'} on:click={copy} />
      {/if}
    </div>
  {:else}
    <div class="buttons">
      <Button
        label={login.string.GetLink}
        size={'medium'}
        kind={'primary'}
        on:click={() => {
          ;((limit !== undefined && limit > 0) || noLimit) && getLink(expHours, emailMask, limit, role)
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .link {
      margin: 1.75rem 0 0;
      overflow-wrap: break-word;

      &.notSecure {
        user-select: text;
      }
    }

    .buttons {
      margin-top: 1.75rem;
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }
  }
</style>
