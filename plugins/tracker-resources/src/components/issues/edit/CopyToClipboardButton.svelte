<!--
// Copyright © 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { Asset, IntlString } from '@hanzo/platform'
  import { copyTextToClipboard } from '@hanzo/presentation'
  import { Button } from '@hanzo/ui'

  export let icon: Asset
  export let title: IntlString
  export let text: string
  export let dataId: string | undefined = undefined
</script>

<Button
  {icon}
  iconProps={{ size: 'medium' }}
  kind={'icon'}
  showTooltip={{ label: title, direction: 'bottom' }}
  {dataId}
  on:click={() => copyTextToClipboard(text)}
/>
