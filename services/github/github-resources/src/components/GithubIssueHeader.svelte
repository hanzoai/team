<script lang="ts">
  import { Ref, WithLookup } from '@hanzo/core'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { NavLink, createQuery, getClient, isAdminUser } from '@hanzo/presentation'
  import { Issue } from '@hanzo/tracker'
  import { ButtonKind, showPopup } from '@hanzo/ui'
  import Button from '@hanzo/ui/src/components/Button.svelte'
  import Icon from '@hanzo/ui/src/components/Icon.svelte'
  import { DocSyncInfo, GithubIntegrationRepository, GithubProject } from '@hanzo/github'
  import github from '../plugin'
  import MarkdownDescriptionDiff from './MarkdownDescriptionDiff.svelte'
  import RepositoryPresenterRefEditor from './RepositoryPresenterRefEditor.svelte'
  import { githubProjects, integrationRepositories } from './utils'

  export let space: Ref<GithubProject>
  export let kind: ButtonKind = 'regular'
  export let readonly: boolean = false
  export let value: WithLookup<Issue>
  const client = getClient()

  $: ghProject = $githubProjects.get(space)
  $: ghIssue = client.getHierarchy().asIf(value, github.mixin.GithubIssue)

  $: repository = ghIssue?.repository !== undefined ? $integrationRepositories.get(ghIssue.repository) : undefined

  async function assignRepository (repository: Ref<GithubIntegrationRepository>): Promise<void> {
    if (ghIssue !== undefined) {
      // We just need to assign the repository to the issue
      await getClient().update(ghIssue, { repository })
    } else {
      // We need to create a new issue
      await getClient().createMixin(value._id, value._class, value.space, github.mixin.GithubIssue, {
        repository,
        url: '',
        githubNumber: 0
      })
    }
  }

  const syncInfoQuery = createQuery()
  let docSyncInfo: DocSyncInfo | undefined

  $: if (isAdminUser()) {
    syncInfoQuery.query(github.class.DocSyncInfo, { _id: value._id as any }, (info) => {
      ;[docSyncInfo] = info
    })
  }
</script>

{#if ghIssue !== undefined || ghProject !== undefined}
  <div class="ml-2">
    {#if ghIssue?.repository == null}
      <RepositoryPresenterRefEditor
        label={github.string.CreateGithubIssue}
        kind={'regular'}
        showIcon={true}
        {space}
        disabled={readonly}
        onChange={(val) => {
          if (val !== undefined) {
            void assignRepository(val)
          }
        }}
      />
    {:else if ghIssue.url !== ''}
      <div class="flex flex-row-center">
        {#if repository !== undefined}
          <Icon icon={github.icon.Github} size={'small'} />
          <span class="ml-1">
            {repository?.name}
          </span>
        {/if}
        <NavLink
          disabled={readonly}
          href={ghIssue.url}
          accent={true}
          noOverflow={true}
          onClick={() => {
            window.open(ghIssue.url, '_blank')
          }}
        >
          <span class="ml-2">
            #{ghIssue.githubNumber}
          </span>
        </NavLink>
      </div>
    {/if}
  </div>
  {#if isAdminUser() && docSyncInfo?.markdown !== undefined}
    <div class="ml-2">
      <Button
        label={getEmbeddedLabel('Diff')}
        on:click={(evt) => {
          showPopup(MarkdownDescriptionDiff, { issue: docSyncInfo }, 'center')
        }}
      />
    </div>
  {/if}
{/if}
