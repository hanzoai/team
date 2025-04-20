<script lang="ts">
  import { Doc, DocumentQuery } from '@hanzo/core'
  import { IntlString } from '@hanzo/platform'
  import { pluginConfigurationStore } from '@hanzo/presentation'
  import tracker, { Issue, trackerId } from '@hanzo/tracker'
  import { Icon, Label } from '@hanzo/ui'
  import QueryIssuesList from '../edit/QueryIssuesList.svelte'

  export let object: Doc
  export let label: IntlString

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }
</script>

{#if $pluginConfigurationStore.has(trackerId)}
  <QueryIssuesList {object} {query} createParams={{ relatedTo: object }} hasSubIssues>
    <svelte:fragment slot="header">
      <div class="flex-row-center">
        <div class="antiSection-header__icon">
          <Icon icon={tracker.icon.Issue} size={'small'} />
        </div>
        <span class="antiSection-header__title short">
          <Label {label} />
        </span>
      </div>
    </svelte:fragment>
  </QueryIssuesList>
{/if}
