<!--
// Copyright © 2026 Hanzo AI Inc.
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
<!--
  Unified identity cluster. Matches the console DashboardShell bottom-left /
  @hanzo/ui AppHeader identity menu: Profile · Theme · Workspace settings ·
  Usage & billing · Sign out, plus the cross-surface launcher (the ONE canonical
  surfaces list) so users can travel across Hanzo surfaces. Monochrome — reads
  the workbench theme tokens.
-->
<script lang="ts">
  import { Analytics } from '@hanzo/analytics'
  import contact, { formatName, getCurrentEmployee } from '@hanzo/contact'
  import { myEmployeeStore } from '@hanzo/contact-resources'
  import core from '@hanzo/core'
  import login, { loginId } from '@hanzo/login'
  import setting, { settingId } from '@hanzo/setting'
  import {
    Component,
    closePopup,
    fetchMetadataLocalStorage,
    getCurrentResolvedLocation,
    navigate,
    themeStore
  } from '@hanzo/ui'
  import { getContext } from 'svelte'
  import { type Readable } from 'svelte/store'
  import { logOut } from '../utils'
  import SurfaceIcon from './SurfaceIcon.svelte'
  import { otherSurfaces } from './surfaces.data'

  const { setTheme } = getContext<{ currentTheme: Readable<string>, setTheme: (theme: string) => void }>('theme')

  $: person = $myEmployeeStore
  $: isDark = $themeStore?.dark ?? true
  const account = fetchMetadataLocalStorage(login.metadata.LoginAccount) ?? ''
  $: email = account.includes('@') ? account : ''

  // Every Hanzo surface you travel to but THIS one (team) — from the ONE canonical
  // list (surfaces.data), so the switcher never diverges from the other surfaces.
  // Each carries its own glyph so the tiles are distinguishable, not identical cubes.
  const surfaces = otherSurfaces('team')

  function goSettings (category?: string): void {
    closePopup()
    const loc = getCurrentResolvedLocation()
    loc.fragment = undefined
    loc.query = undefined
    loc.path[2] = settingId
    if (category != null) {
      loc.path[3] = category
      loc.path.length = 4
    } else {
      loc.path.length = 3
    }
    navigate(loc)
  }

  function openBilling (): void {
    // The usage/wallet page the cloud binary serves beside the team API
    // (host-relative, session-gated, org-scoped).
    window.open('/v1/team/billing/ui/', '_blank', 'noopener')
  }

  function setDark (dark: boolean): void {
    setTheme(dark ? 'theme-dark' : 'theme-light')
  }

  function signOut (): void {
    closePopup()
    void logOut().then(() => {
      navigate({ path: [loginId] })
      Analytics.handleEvent('workbench.SignOut')
      Analytics.logout()
    })
  }
</script>

<div class="antiPopup identityMenu">
  <div class="header">
    {#if getCurrentEmployee() === core.employee.System}
      <div class="orgAvatar">SY</div>
      <div class="headerText"><span class="name overflow-label">System</span></div>
    {:else}
      {#if person}
        <Component is={contact.component.Avatar} props={{ person, size: 'medium', name: person.name }} />
      {/if}
      <div class="headerText">
        <span class="name overflow-label">{person ? formatName(person.name) : 'Account'}</span>
        {#if email !== ''}<span class="email overflow-label">{email}</span>{/if}
      </div>
    {/if}
  </div>

  <div class="ap-menuItem separator halfMargin" />

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="row" on:click={() => goSettings('profile')}>
    <span class="ico">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="8" cy="5" r="2.6" /><path d="M3 13.2c.7-2.3 2.6-3.4 5-3.4s4.3 1.1 5 3.4" stroke-linecap="round" />
      </svg>
    </span>
    <span class="label">Profile</span>
  </div>

  <div class="row themeRow">
    <span class="ico">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="8" cy="8" r="3.2" /><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13" stroke-linecap="round" />
      </svg>
    </span>
    <span class="label">Theme</span>
    <div class="seg" role="group" aria-label="Theme">
      <button class="segBtn" class:active={!isDark} on:click|stopPropagation={() => setDark(false)}>Light</button>
      <button class="segBtn" class:active={isDark} on:click|stopPropagation={() => setDark(true)}>Dark</button>
    </div>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="row" on:click={() => goSettings()}>
    <span class="ico">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="8" cy="8" r="2.1" />
        <path d="M8 1.4v1.3M8 13.3v1.3M14.6 8h-1.3M2.7 8H1.4M12.7 3.3l-.9.9M4.2 11.8l-.9.9M12.7 12.7l-.9-.9M4.2 4.2l-.9-.9" stroke-linecap="round" />
      </svg>
    </span>
    <span class="label">Workspace settings</span>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="row" on:click={openBilling}>
    <span class="ico">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <rect x="1.6" y="3.4" width="12.8" height="9.2" rx="1.6" /><path d="M1.6 6.4h12.8" />
      </svg>
    </span>
    <span class="label">Usage &amp; billing</span>
  </div>

  <div class="ap-menuItem separator halfMargin" />

  <div class="ap-subheader">Surfaces</div>
  <div class="surfaces">
    {#each surfaces as s (s.id)}
      <a class="surfaceTile" href={s.href} target="_blank" rel="noopener noreferrer" title={s.hint}>
        <span class="surfaceMark"><SurfaceIcon name={s.id} size={14} /></span>
        <span class="surfaceLabel overflow-label">{s.label}</span>
      </a>
    {/each}
  </div>

  <div class="ap-menuItem separator halfMargin" />

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="row signout" on:click={signOut}>
    <span class="ico">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <path d="M6 2.4H3.4A1.4 1.4 0 0 0 2 3.8v8.4a1.4 1.4 0 0 0 1.4 1.4H6" stroke-linecap="round" />
        <path d="M10.4 11 13.6 8 10.4 5M13.4 8H6.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="label">Sign out</span>
  </div>

  <div class="ap-space x2" />
</div>

<style lang="scss">
  .identityMenu {
    width: 16.5rem;
    max-width: 16.5rem;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 0.875rem 0.625rem;

    .headerText {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--theme-caption-color);
    }
    .email {
      font-size: 0.75rem;
      color: var(--theme-dark-color);
    }
  }
  .orgAvatar {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.3rem;
    background-color: var(--theme-caption-color);
    color: var(--theme-popup-color);
    font-weight: 600;
    font-size: 0.8125rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0.375rem;
    padding: 0 0.5rem;
    min-height: 2.25rem;
    border-radius: 0.375rem;
    cursor: pointer;
    color: var(--theme-caption-color);

    .ico {
      display: flex;
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: var(--theme-dark-color);
      svg {
        width: 1rem;
        height: 1rem;
      }
    }
    .label {
      flex-grow: 1;
      min-width: 0;
      font-size: 0.8125rem;
      font-weight: 500;
    }
    &:hover {
      background-color: var(--theme-popup-hover);
    }
    &.themeRow {
      cursor: default;
      &:hover {
        background-color: transparent;
      }
    }
    &.signout:hover .ico {
      color: var(--theme-caption-color);
    }
  }
  .seg {
    display: flex;
    flex-shrink: 0;
    padding: 0.125rem;
    gap: 0.125rem;
    border-radius: 0.375rem;
    background-color: var(--theme-bg-color);
    border: 1px solid var(--theme-popup-divider);

    .segBtn {
      padding: 0.125rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      background-color: transparent;
      color: var(--theme-dark-color);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;

      &.active {
        background-color: var(--theme-button-hovered);
        color: var(--theme-caption-color);
      }
    }
  }
  .surfaces {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem;
    padding: 0.25rem 0.5rem 0.125rem;
  }
  .surfaceTile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--theme-popup-divider);
    color: var(--theme-caption-color);
    text-decoration: none;
    transition: background-color 0.12s ease;

    .surfaceMark {
      display: flex;
      color: var(--theme-caption-color);
    }
    .surfaceLabel {
      max-width: 100%;
      font-size: 0.6875rem;
      font-weight: 500;
    }
    &:hover {
      background-color: var(--theme-popup-hover);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .surfaceTile {
      transition: none;
    }
  }
</style>
