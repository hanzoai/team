<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Milestone } from '@hanzo/tracker'
  import { ButtonSize, Icon } from '@hanzo/ui'
  import { milestoneStatusAssets } from '../../utils'
  import tracker from '../../plugin'

  export let value: Milestone['status'] | undefined
  export let size: ButtonSize = 'large'

  $: icon = value === undefined ? tracker.icon.MilestoneStatusPlanned : milestoneStatusAssets[value]?.icon
</script>

<Icon {icon} {size} />
