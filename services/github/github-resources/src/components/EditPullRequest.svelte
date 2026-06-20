<!--
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { GithubPullRequest } from '@hanzoteam/github'
  import PullRequestDiff from './PullRequestDiff.svelte'

  export let object: GithubPullRequest
  export let embedded = false
</script>

<div class="mt-6">
  <PullRequestDiff pullRequest={object} />
</div>
