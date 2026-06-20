<!--
//
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { WithLookup } from '@hanzoteam/core'
  import { IssuePresenter } from '@hanzoteam/tracker-resources'
  import github, { GithubPullRequest } from '@hanzoteam/github'

  export let value: WithLookup<GithubPullRequest>
  export let disabled = false
  export let onClick: (() => void) | undefined = undefined
  export let shouldShowAvatar: boolean = false
  export let noUnderline = false
  export let inline = false
  export let kind: 'list' | undefined = undefined
</script>

<IssuePresenter
  {value}
  {disabled}
  {onClick}
  {shouldShowAvatar}
  {noUnderline}
  {inline}
  {kind}
  icon={github.icon.PullRequest}
/>
