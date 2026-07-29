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
  Unified top-left switcher. Matches the @hanzo/ui OrgSwitcher information
  architecture (current org prominent, org → workspaces list, create/invite),
  Slack-style: workspaces are grouped by their owning org so a user in several
  orgs sees each org's workspaces under its own heading. Monochrome — it reads
  the workbench theme tokens, so it tracks light/dark automatically.
-->
<script lang="ts">
  import { WorkspaceInfoWithStatus } from '@hanzo/core'
  import login, { loginId } from '@hanzo/login'
  import { getResource } from '@hanzo/platform'
  import {
    closePopup,
    getCurrentLocation,
    IconAdd,
    IconCheck,
    IconChevronDown,
    isSameSegments,
    locationStorageKeyId,
    locationToUrl,
    navigate,
    resolvedLocationStore,
    SearchEdit,
    showPopup,
    type Location
  } from '@hanzo/ui'
  import { workbenchId } from '@hanzo/workbench'
  import { onMount } from 'svelte'
  import { groupWorkspacesByOrg, workspaceOrg, workspacesStore } from '../utils'
  import HanzoMark from './HanzoMark.svelte'

  onMount(() => {
    void getResource(login.function.GetWorkspaces).then(async (f) => {
      $workspacesStore = await f()
    })
  })

  let search = ''
  let collapsed: Record<string, boolean> = {}

  $: currentUrl = $resolvedLocationStore.path[1]
  $: currentWs = $workspacesStore.find((ws) => ws.url === currentUrl)
  $: currentOrg = currentWs !== undefined ? workspaceOrg(currentWs) : undefined

  // Note: `q` is referenced directly below so Svelte tracks the search term.
  $: q = search.trim().toLowerCase()
  function matches (ws: WorkspaceInfoWithStatus, query: string): boolean {
    if (query === '') return true
    return (
      (ws.name ?? '').toLowerCase().includes(query) ||
      ws.url.toLowerCase().includes(query) ||
      (workspaceOrg(ws) ?? '').toLowerCase().includes(query)
    )
  }

  // Groups, current org's group first so the active tenant leads (Slack-style).
  $: groups = groupWorkspacesByOrg($workspacesStore.filter((ws) => matches(ws, q))).sort((a, b) => {
    if (a.org === currentOrg) return -1
    if (b.org === currentOrg) return 1
    return 0
  })
  $: grouped = groups.length > 1 || (groups.length === 1 && groups[0].org !== '')

  function orgLabel (org: string): string {
    return org === '' ? 'Workspaces' : org
  }

  function initials (name: string): string {
    const n = (name ?? '').trim()
    if (n === '') return '?'
    const parts = n.split(/[\s._-]+/).filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || n[0].toUpperCase()
  }

  function toggle (org: string): void {
    collapsed = { ...collapsed, [org]: !(collapsed[org] ?? false) }
  }

  function wsLink (ws: WorkspaceInfoWithStatus): string {
    return locationToUrl({ path: [workbenchId, ws.url] } as Location)
  }

  // Switch to an explicit workspace (its slug is globally unique, so it names
  // exactly one org-owned workspace — no silent org default).
  async function selectWs (e: MouseEvent, ws: WorkspaceInfoWithStatus): Promise<void> {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    closePopup()
    const current = getCurrentLocation()
    if (ws.url === current.path[1]) return
    let last: Location | undefined
    try {
      last = JSON.parse(localStorage.getItem(`${locationStorageKeyId}_${ws.url}`) ?? '')
    } catch (err: any) {
      // no stored last location for this workspace
    }
    if (last != null && isSameSegments(last, current, 2)) {
      navigate(last)
    } else {
      navigate({ path: [workbenchId, ws.url] })
    }
  }

  function createWorkspace (): void {
    closePopup()
    navigate({ path: [loginId, 'createWorkspace'] })
  }

  function invite (): void {
    closePopup()
    showPopup(login.component.InviteLink, {})
  }
</script>

<div class="antiPopup orgSwitcher">
  <div class="brand">
    <HanzoMark size={16} />
    <span class="brandName">Hanzo Team</span>
  </div>

  <div class="current">
    <div class="orgAvatar lg">{initials(currentOrg ?? currentWs?.name ?? 'Hanzo')}</div>
    <div class="currentText">
      <span class="orgName overflow-label">{orgLabel(currentOrg ?? '')}</span>
      {#if currentWs !== undefined}
        <span class="wsName overflow-label">{currentWs.name ?? currentWs.url}</span>
      {/if}
    </div>
  </div>

  {#if $workspacesStore.length > 7}
    <div class="searchRow">
      <SearchEdit bind:value={search} width={'100%'} />
    </div>
  {/if}

  <div class="ap-scroll">
    <div class="ap-box">
      {#each groups as group (group.org)}
        {@const isCollapsed = collapsed[group.org] ?? false}
        {#if grouped}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="groupHeader" on:click={() => toggle(group.org)}>
              <span class="chev" class:collapsed={isCollapsed}><IconChevronDown size={'x-small'} /></span>
              <div class="orgAvatar sm">{initials(group.org === '' ? 'Workspaces' : group.org)}</div>
              <span class="groupName overflow-label">{orgLabel(group.org)}</span>
              <span class="count">{group.workspaces.length}</span>
            </div>
          {/if}
          {#if !isCollapsed}
            {#each group.workspaces as ws (ws.uuid)}
              {@const active = ws.url === currentUrl}
              <a class="stealth" href={wsLink(ws)} on:click={(e) => selectWs(e, ws)}>
                <div class="wsRow ap-menuItem" class:grouped class:selected={active}>
                  <div class="orgAvatar sm">{initials(ws.name ?? ws.url)}</div>
                  <span class="label overflow-label">{ws.name ?? ws.url}</span>
                  <div class="ap-check">
                    {#if active}<IconCheck size={'small'} />{/if}
                  </div>
                </div>
              </a>
            {/each}
          {/if}
        {/each}
    </div>
  </div>

  <div class="ap-menuItem separator halfMargin" />
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="ap-menuItem action withIcon flex-row-center" on:click={createWorkspace}>
    <div class="icon mr-2"><IconAdd size={'small'} /></div>
    <span class="label">Create workspace</span>
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="ap-menuItem action withIcon flex-row-center" on:click={invite}>
    <div class="icon mr-2"><IconAdd size={'small'} /></div>
    <span class="label">Invite to workspace</span>
  </div>
  <div class="ap-space x2" />
</div>

<style lang="scss">
  .orgSwitcher {
    width: 19rem;
    max-width: 19rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0.875rem 0.5rem;
    color: var(--theme-dark-color);

    .brandName {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.02em;
    }
  }
  .current {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0 0.875rem 0.625rem;
    border-bottom: 1px solid var(--theme-popup-divider);

    .currentText {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .orgName {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--theme-caption-color);
    }
    .wsName {
      font-size: 0.75rem;
      color: var(--theme-dark-color);
    }
  }
  .searchRow {
    padding: 0.5rem 0.625rem 0.25rem;
  }
  .orgAvatar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.3rem;
    background-color: var(--theme-caption-color);
    color: var(--theme-popup-color);
    font-weight: 600;
    line-height: 1;

    &.lg {
      width: 2rem;
      height: 2rem;
      font-size: 0.8125rem;
    }
    &.sm {
      width: 1.25rem;
      height: 1.25rem;
      font-size: 0.5625rem;
    }
  }
  .groupHeader {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem 0.25rem;
    cursor: pointer;
    color: var(--theme-dark-color);

    .chev {
      display: flex;
      transition: transform 0.12s ease;
      &.collapsed {
        transform: rotate(-90deg);
      }
    }
    .groupName {
      flex-grow: 1;
      min-width: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .count {
      font-size: 0.6875rem;
      color: var(--theme-trans-color);
    }
    &:hover .groupName {
      color: var(--theme-caption-color);
    }
  }
  .wsRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &.grouped {
      margin-left: 1.375rem;
    }
    .label {
      flex-grow: 1;
      min-width: 0;
      font-weight: 500;
      color: var(--theme-caption-color);
    }
    .ap-check {
      margin-left: 0.5rem;
    }
  }
  .action {
    color: var(--theme-caption-color);
    .label {
      font-weight: 500;
    }
    .icon {
      color: var(--theme-dark-color);
    }
    &:hover {
      background-color: var(--theme-popup-hover);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .groupHeader .chev {
      transition: none;
    }
  }
</style>
