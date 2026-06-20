<!--
//
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { WithLookup } from '@hanzoteam/core'
  import { TitlePresenter } from '@hanzoteam/tracker-resources'
  import { GithubPullRequest } from '@hanzoteam/github'

  export let value: WithLookup<GithubPullRequest>
  export let shouldUseMargin: boolean = false
  export let showParent = true
  export let kind: 'list' | undefined = undefined
  export let onClick: (() => void) | undefined = undefined
  export let disabled = false
</script>

{#if value}
  <TitlePresenter {value} {shouldUseMargin} {showParent} {kind} {onClick} {disabled} />
{/if}
