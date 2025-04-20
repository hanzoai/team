<script lang="ts">
  import { Ref } from '@hanzo/core'
  import { Icon, Label } from '@hanzo/ui'
  import { GithubIntegrationRepository } from '@hanzo/github'
  import github from '../plugin'
  import { integrationRepositories } from './utils'

  export let repository: Ref<GithubIntegrationRepository> | undefined = undefined

  $: repositoryValue = repository != null ? $integrationRepositories.get(repository) : undefined
</script>

<div class="flex-row-center">
  {#if repositoryValue}
    <Label label={github.string.IssueRepositoryTarget} />
    <div class="ml-2 mr-2">
      <Icon icon={github.icon.Github} size={'small'} />
    </div>
    {repositoryValue.name}
  {/if}
</div>
