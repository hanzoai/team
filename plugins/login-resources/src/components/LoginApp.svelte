<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hanzo AI Inc.
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
  import { getMetadata, setMetadata } from '@hanzoteam/platform'
  import presentation from '@hanzoteam/presentation'
  import {
    Location,
    Popup,
    Scroller,
    deviceOptionsStore as deviceInfo,
    fetchMetadataLocalStorage,
    getCurrentLocation,
    location,
    setMetadataLocalStorage,
    themeStore
  } from '@hanzoteam/ui'
  import { onDestroy, onMount } from 'svelte'
  import { Pages, getAccount, pages } from '..'
  import login from '../plugin'
  import Auth from './Auth.svelte'
  import AuthCallback from './AuthCallback.svelte'
  import AutoJoin from './AutoJoin.svelte'
  import Confirmation from './Confirmation.svelte'
  import ConfirmationSend from './ConfirmationSend.svelte'
  import CreateWorkspaceForm from './CreateWorkspaceForm.svelte'
  import Join from './Join.svelte'
  import LoginForm from './LoginForm.svelte'
  import ProvidersOnlyForm from './ProvidersOnlyForm.svelte'
  import PasswordRequest from './PasswordRequest.svelte'
  import PasswordRestore from './PasswordRestore.svelte'
  import SelectWorkspace from './SelectWorkspace.svelte'
  import SignupForm from './SignupForm.svelte'

  import loginLogo from "../../img/logo-dark.svg"
  import AdminWorkspaces from './AdminWorkspaces.svelte'
  import ChangePassword from './ChangePassword.svelte'

  export let page: Pages = 'signup'

  const signUpDisabled = getMetadata(login.metadata.DisableSignUp) ?? false
  const localLoginHidden = getMetadata(login.metadata.HideLocalLogin) ?? false
  const useOTP = getMetadata(presentation.metadata.MailUrl) != null && getMetadata(presentation.metadata.MailUrl) !== ''
  let navigateUrl: string | undefined

  onDestroy(location.subscribe(updatePageLoc))

  function updatePageLoc (loc: Location): void {
    const token = getMetadata(presentation.metadata.Token)
    page = (loc.path[1] as Pages) ?? (token != null ? 'selectWorkspace' : 'login')
    if (page === 'join' && loc.query?.autoJoin !== undefined) {
      page = 'autoJoin'
    }

    const allowedUnauthPages: Pages[] = [
      'login',
      'signup',
      'password',
      'recovery',
      'join',
      'autoJoin',
      'confirm',
      'confirmationSend',
      'auth',
      "authCallback",
      "callback"
    ]
    if (token === undefined ? !allowedUnauthPages.includes(page) : !pages.includes(page)) {
      const account = fetchMetadataLocalStorage(login.metadata.LastAccount)
      page = account != null ? 'login' : 'signup'
    }

    navigateUrl = loc.query?.navigateUrl ?? undefined
  }

  async function chooseToken (): Promise<void> {
    if (page === 'auth') {
      // token handled by auth page
      return
    } else if (page === 'autoJoin') {
      // there's a separate workflow for auto join
      return
    }

    if (getMetadata(presentation.metadata.Token) == null) {
      const lastAccount = fetchMetadataLocalStorage(login.metadata.LastAccount)
      if (lastAccount != null) {
        try {
          const loginInfo = await getAccount(false)
          if (loginInfo != null) {
            setMetadata(presentation.metadata.Token, loginInfo.token)
            setMetadataLocalStorage(login.metadata.LoginAccount, loginInfo.account)
            updatePageLoc(getCurrentLocation())
          }
        } catch (err: any) {
          // do nothing
        }
      }
    }
  }

  onMount(chooseToken)
</script>

{#if page === 'admin'}
  <AdminWorkspaces />
{:else}
  <div
    class="w-full h-full backd"
    class:paneld={$deviceInfo.docWidth <= 768}
    class:white={!$themeStore.dark}
  >
    <!-- The ground is flat black, and nothing is painted on it. The halftone
         field that used to sit here (six upstream files, avif/webp/png at 1x and
         2x) is the one decorative element on the one screen where a person is
         reading a form and typing a password, and it is not ours: every other
         Hanzo surface — console, chat, app, id — signs you in on plain
         `--background`. A texture here is what made this door look like a
         different company's. -->
    <div class="bg-image clear-mins" class:back={$deviceInfo.docWidth > 768} class:p-4={$deviceInfo.docWidth > 768}>
      <div
        style:position="fixed"
        style:left={$deviceInfo.docWidth <= 480 ? '.75rem' : '1.75rem'}
        style:top={'calc(3rem + var(--hanzo-top-indent, 0rem))'}
        class="flex-row-center"
      >
      <img
            src={loginLogo}
            srcset={`${loginLogo} 1x, ${loginLogo} 2x`}
            alt=""
            style="width: 30px; height: 30px"

    />
    <!-- The lockup names the product in full. The mark alone is the Hanzo H,
         which every Hanzo surface wears, so "Team" beside it read as the whole
         name of the thing — and a visitor who arrives from hanzo.ai cannot tell
         whose door this is. Mark plus full name, the way console and id do it. -->
    <span class="fs-title ml-2" style="color: #fff;">Hanzo Team</span>
      </div>

      <div class="panel-base" class:panel={$deviceInfo.docWidth > 768} class:white={!$themeStore.dark}>
        <Scroller padding={'1rem 0'}>
          <div class="form-content">
            {#if page === 'login'}
              {#if localLoginHidden}
                <ProvidersOnlyForm />
              {:else}
                <LoginForm {navigateUrl} {signUpDisabled} {useOTP} />
              {/if}
            {:else if page === 'signup'}
              <SignupForm {navigateUrl} {signUpDisabled} {localLoginHidden} {useOTP} />
            {:else if page === 'createWorkspace'}
              <CreateWorkspaceForm />
            {:else if page === 'password'}
              <PasswordRequest {signUpDisabled} />
            {:else if page === 'recovery'}
              <PasswordRestore />
            {:else if page === 'selectWorkspace'}
              <SelectWorkspace {navigateUrl} />
            {:else if page === 'join'}
              <Join />
            {:else if page === 'autoJoin'}
              <AutoJoin />
            {:else if page === 'confirm'}
              <Confirmation />
            {:else if page === 'ConfirmationSend'}
              <ConfirmationSend />
            {:else if page === 'auth'}
              <Auth />
            {:else if page === 'authCallback' || page === 'callback'}
              <AuthCallback />
            {:else if page === 'changePassword'}
              <ChangePassword />
            {/if}
          </div>
        </Scroller>
      </div>

      <Popup />
    </div>
  </div>
{/if}

<style lang="scss">
  .backd {
    position: relative;
    background-color: #000000;

    .bg-image {
      display: flex;
      flex-direction: row-reverse;
      width: 100%;
      height: 100%;
    }
    &.paneld {
      background: rgba(0, 0, 0, 0.9);

      .panel-base {
        padding-top: 5rem;
        padding-bottom: 1rem;
        width: 100%;
      }
    }
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 50%;
    height: 100%;
    min-width: 35rem;
    max-width: 41rem;
    background: rgba(10, 10, 10, 0.95);
    mix-blend-mode: normal;
    box-shadow: -30px 1.52px 173.87px rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(157.855px);
    border-radius: 1rem;

    &::after {
      overflow: hidden;
      position: absolute;
      content: '';
      inset: 0;
      background: #0a0a0a;
      border-radius: 1rem;
      z-index: -1;
    }
    &::before {
      position: absolute;
      content: '';
      inset: 0;
      padding: 1px;
      background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.15) 0%,
          rgba(255, 255, 255, 0.05) 50%,
          rgba(255, 255, 255, 0.1) 100%
        )
        border-box;
      -webkit-mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      border-radius: 1rem;
      transform: rotate(180deg);
      transition: opacity 0.15s var(--timing-main);
      opacity: 0.5;
    }
  }
  .backd.paneld::after,
  .panel::after {
    overflow: hidden;
    position: absolute;
    content: '';
    inset: 0;
    background: #0a0a0a;
    z-index: -1;
  }
  .panel::after {
    border-radius: 1rem;
  }
  .form-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
    height: max-content;
  }
</style>
