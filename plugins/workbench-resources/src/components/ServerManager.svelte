<script lang="ts">
  import ServerManagerServerStatistics from './ServerManagerServerStatistics.svelte'

  import ServerManagerUsers from './ServerManagerUsers.svelte'

  import ServerManagerGeneral from './ServerManagerGeneral.svelte'

  import { getEmbeddedLabel } from '@hanzo/platform'
  import presentation from '@hanzo/presentation'
  import { Breadcrumb, ButtonIcon, Header, IconClose, IconSettings, Switcher, TabItem } from '@hanzo/ui'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  const tabs: TabItem[] = [
    {
      id: 'general',
      labelIntl: getEmbeddedLabel('General')
    },
    {
      id: 'statistics',
      labelIntl: getEmbeddedLabel('Servers')
    },
    {
      id: 'users',
      labelIntl: getEmbeddedLabel('Users')
    }
  ]
  let selectedTab: string | number = tabs[0].id
</script>

<div class="hanzoaiComponent">
  <Header type={'type-panel'} freezeBefore>
    <svelte:fragment slot="beforeTitle">
      <ButtonIcon
        icon={IconClose}
        kind={'secondary'}
        size={'small'}
        tooltip={{ label: presentation.string.Close }}
        on:click={() => dispatch('close')}
      />
    </svelte:fragment>

    <Breadcrumb icon={IconSettings} title={'Server manager'} size={'large'} isCurrent />

    <svelte:fragment slot="actions">
      <Switcher
        name={'swManagerMode'}
        items={tabs}
        bind:selected={selectedTab}
        kind={'subtle'}
        on:select={(result) => {
          selectedTab = result.detail.id
        }}
      />
    </svelte:fragment>
  </Header>

  <div class="hanzoaiComponent-content__column content">
    {#if selectedTab === 'general'}
      <ServerManagerGeneral />
    {:else if selectedTab === 'users'}
      <ServerManagerUsers />
    {:else if selectedTab === 'statistics'}
      <ServerManagerServerStatistics />
    {/if}
  </div>
</div>
