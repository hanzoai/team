<!--
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Review } from '@hanzo/recruit'
  import { Icon, tooltip } from '@hanzo/ui'
  import OpinionsPopup from './OpinionsPopup.svelte'
  import recruit from '../../plugin'

  export let value: Review
</script>

{#if value.opinions && value.opinions > 0}
  <div
    class="sm-tool-icon"
    use:tooltip={{ label: recruit.string.Opinions, component: OpinionsPopup, props: { value } }}
  >
    <span class="icon"><Icon icon={recruit.icon.Opinion} size={'small'} /></span>&nbsp;{value.opinions}
  </div>
{/if}
