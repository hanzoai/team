<!--
//
// Copyright © 2023 Hanzo AI Inc.
//
-->
<script lang="ts">
  import { Ref } from '@hanzoteam/core'
  import { getEmbeddedLabel } from '@hanzoteam/platform'
  import { ButtonKind, ButtonSize } from '@hanzoteam/ui'
  import { HyperlinkEditor } from '@hanzoteam/view-resources'
  import github, { GithubIntegrationRepository } from '@hanzoteam/github'
  import { integrationRepositories } from './utils'

  export let value: Ref<GithubIntegrationRepository>
  export let kind: ButtonKind | undefined = undefined
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'fit-content'

  $: repository = $integrationRepositories.get(value)
</script>

<HyperlinkEditor
  value={repository?.repository?.html_url ?? repository?.htmlURL}
  placeholder={getEmbeddedLabel(repository?.name ?? '')}
  title={repository?.name ?? ''}
  readonly
  icon={github.icon.Github}
  {kind}
  {size}
  {justify}
  {width}
/>
