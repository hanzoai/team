<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { Ref } from '@hanzo/core'
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { ButtonKind, ButtonSize } from '@hanzo/ui'
  import { HyperlinkEditor } from '@hanzo/view-resources'
  import github, { GithubIntegrationRepository } from '@hanzo/github'
  import { integrationRepositories } from './utils'

  export let value: Ref<GithubIntegrationRepository>
  export let kind: ButtonKind | undefined = undefined
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  $: repository = $integrationRepositories.get(value)
</script>

<HyperlinkEditor
  value={repository?.repository?.html_url}
  placeholder={getEmbeddedLabel(repository?.name ?? '')}
  title={repository?.name ?? ''}
  readonly
  icon={github.icon.Github}
  {kind}
  {size}
  {justify}
  {width}
/>
