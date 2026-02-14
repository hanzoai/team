<!--
//
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { Icon } from '@hanzo/ui'
  import { GithubIntegrationRepository } from '@hanzo/github'
  import github from '../../plugin'

  export let value: GithubIntegrationRepository
</script>

<div class="flex-row-center">
  <Icon icon={github.icon.GithubRepository} size={'small'} />
  <span class="ml-1">{value.name}</span>
</div>
