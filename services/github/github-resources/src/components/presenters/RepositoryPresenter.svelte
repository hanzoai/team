<!--
//
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { Icon } from '@hanzoteam/ui'
  import { GithubIntegrationRepository } from '@hanzoteam/github'
  import github from '../../plugin'

  export let value: GithubIntegrationRepository
</script>

<div class="flex-row-center">
  <Icon icon={github.icon.GithubRepository} size={'small'} />
  <span class="ml-1">{value.name}</span>
</div>
