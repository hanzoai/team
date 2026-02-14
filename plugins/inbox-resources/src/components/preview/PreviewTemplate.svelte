<!-- Copyright © 2025 Hanzo AI Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Person } from '@hanzo/contact'
  import { IntlString } from '@hanzo/platform'
  import { PreviewTemplate } from '@hanzo/communication-resources'
  import { SocialID } from '@hanzo/communication-types'

  import { isViewSettingEnabled, hideUserNamesSettingId, viewSettingsStore } from '../../settings'

  export let tooltipLabel: IntlString | undefined = undefined
  export let person: Person | undefined = undefined
  export let socialId: SocialID
  export let date: Date
  export let color: 'primary' | 'secondary' = 'primary'
  export let kind: 'default' | 'column' = 'default'
  export let padding: string | undefined = undefined
  export let fixHeight: boolean = false
  export let showSeparator: boolean = true
  export let hideHeader: boolean = false

  const hidePersonName = isViewSettingEnabled($viewSettingsStore, hideUserNamesSettingId)
</script>

<PreviewTemplate
  {tooltipLabel}
  {person}
  {socialId}
  {date}
  {color}
  {kind}
  {padding}
  {fixHeight}
  {showSeparator}
  {hideHeader}
  {hidePersonName}
>
  <svelte:fragment slot="content">
    <slot name="content" />
  </svelte:fragment>
</PreviewTemplate>
