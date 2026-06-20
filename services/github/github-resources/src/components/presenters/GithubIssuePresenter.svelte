<script lang="ts">
  import { Issue } from '@hanzoteam/tracker'

  import { getClient } from '@hanzoteam/presentation'
  import type { ButtonKind } from '@hanzoteam/ui'
  import { HyperlinkEditor } from '@hanzoteam/view-resources'
  import github from '../../plugin'
  import { integrationRepositories } from '../utils'

  export let value: Issue
  export let kind: ButtonKind = 'ghost'

  $: ghIssue = getClient().getHierarchy().asIf(value, github.mixin.GithubIssue)

  $: repository = ghIssue?.repository !== undefined ? $integrationRepositories.get(ghIssue?.repository) : undefined
</script>

{#if ghIssue !== undefined && ghIssue.url !== '' && repository !== undefined}
  <HyperlinkEditor
    readonly
    icon={github.icon.Github}
    {kind}
    value={ghIssue.url}
    placeholder={github.string.Issue}
    title={`${repository.name}`}
  />
{/if}
