<script lang="ts">
  import { Ref, Space } from '@hanzo/core'
  import ui, { ModernButton } from '@hanzo/ui'
  import { GithubProject } from '@hanzo/github'
  import github from '../plugin'
  import { githubAuth, githubProjects, onAuthorize } from './utils'
  import { getMetadata } from '@hanzo/platform'

  export let space: Ref<Space>
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let readonly: boolean = false

  $: auth = $githubAuth

  $: spaceObj = $githubProjects.get(space as Ref<GithubProject>)
</script>

{#if spaceObj !== undefined}
  {#if auth === undefined || auth.login === '' || auth.error != null}
    {#if !readonly}
      <ModernButton
        label={github.string.Authorize}
        labelParams={{ title: getMetadata(ui.metadata.PlatformTitle) }}
        icon={github.icon.Github}
        kind={'primary'}
        size={'small'}
        on:click={() => {
          void onAuthorize()
        }}
      />
    {/if}
  {:else}
    <ModernButton
      icon={github.icon.Github}
      label={github.string.AuthorizeAs}
      labelParams={{ login: auth.login }}
      disabled={true}
      {kind}
      size={'small'}
    />
  {/if}
{/if}
