<script lang="ts">
  import core, { AccountRole, getCurrentAccount, type Ref } from '@hanzo/core'
  import type { Application } from '@hanzo/workbench'
  import { createQuery } from '@hanzo/presentation'
  import workbench from '@hanzo/workbench'
  import { hideApplication, isAllowedToRole, showApplication } from '../utils'
  import { Loading, IconCheck, Label, Icon } from '@hanzo/ui'
  import { getMetadata } from '@hanzo/platform'
  // import Drag from './icons/Drag.svelte'

    export let apps: Application[] = []
    export let plan: string

    let activeElement: HTMLElement
    const btns: HTMLElement[] = []

    let loaded = false
    let hiddenAppsIds: Array<Ref<Application>> = []

    const me = getCurrentAccount()
    const hiddenAppsIdsQuery = createQuery()

    // ✅ Auto-hide apps only ONCE on mount (for cloud:free)
    onMount(() => {
      hiddenAppsIdsQuery.query(
        workbench.class.HiddenApplication,
        { space: core.space.Workspace },
        async (res) => {
          hiddenAppsIds = res.map((r) => r.attachedTo)
          loaded = true

          // 🔒 Only auto-hide if plan is cloud:free AND there’s no hidden apps yet
          if (plan === 'cloud:free' && hiddenAppsIds.length === 0) {
            for (let i = 2; i < apps.length; i++) {
              const app = apps[i]
              await hideApplication(app)
              hiddenAppsIds.push(app._id)
            }
          }

          // ✅ Auto-show all apps if upgraded plan
          if (plan !== 'cloud:free') {
            for (const app of apps) {
              if (hiddenAppsIds.includes(app._id)) {
                await showApplication(app)
                hiddenAppsIds = hiddenAppsIds.filter(id => id !== app._id)
              }
            }
          }
        }
      )
    })

    function showUpgradePopup() {
      alert('Please upgrade account to use this feature.')
      window.open('https://cloud.hanzo.ai', '_blank')
    }

    function focusTarget(target: HTMLElement): void {
      activeElement = target
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      const n = btns.indexOf(activeElement) ?? 0
      if (ev.key === 'ArrowDown' && n < btns.length - 1) {
        ev.preventDefault()
        activeElement = btns[n + 1]
      } else if (ev.key === 'ArrowUp' && n > 0) {
        ev.preventDefault()
        activeElement = btns[n - 1]
      }
    }
  </script>

  <!-- UI -->
  <div class="antiPopup min-w-60" on:keydown={handleKeyDown}>
    <div class="ap-space x2" />
    <div class="ap-scroll">
      <div class="ap-box">
        {#if loaded}
        {#each apps as app, i}
        <button
          bind:this={btns[i]}
          class="ap-menuItem withIcon flex-row-center flex-grow"
          class:hover={btns[i] === activeElement}
          class:locked={plan === 'cloud:free' && i >= 2}
          aria-disabled={plan === 'cloud:free' && i >= 2}
          title={plan === 'cloud:free' && i >= 2 ? 'Upgrade to unlock' : ''}
          on:mousemove={() => focusTarget(btns[i])}
          on:click={async () => {
            if (plan === 'cloud:free' && i >= 2) {
              showUpgradePopup()
              return
            }

            if (hiddenAppsIds.includes(app._id)) {
              await showApplication(app)
              hiddenAppsIds = hiddenAppsIds.filter(id => id !== app._id)
            } else {
              await hideApplication(app)
              hiddenAppsIds.push(app._id)
            }
          }}
        >
          <div class="icon mr-2"><Icon icon={app.icon} size={'small'} /></div>
          <span class="label overflow-label flex-grow">
            <Label label={app.label} />
          </span>

  const filteredApps = apps.filter(
    (it) =>
      !hiddenAppsIds.includes(it._id) &&
      isAllowedToRole(it.accessLevel, me) &&
      it.position !== 'top' &&
      !isExcludedApp(it.alias)
  )

  function isExcludedApp (alias: string): boolean {
    const me = getCurrentAccount()

    if (me.role === AccountRole.ReadOnlyGuest || me.role === AccountRole.Guest) {
      return (getMetadata(workbench.metadata.ExcludedApplicationsForAnonymous) ?? []).includes(alias)
    } else {
      return false
    }
  }
</script>

        {:else}
          <div class="ap-menuItem empty">
            <Loading />
          </div>
        {/if}
      </div>
    </div>
    <div class="ap-space x2" />
  </div>

  <style>
    .ap-menuItem.locked {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .ap-menuItem.locked:hover {
      background-color: #fdd;
    }

    .ap-menuItem.locked .label::after {
      content: "🔒";
      color: red;
      font-weight: bold;
      margin-left: 4px;
    }
  </style>
