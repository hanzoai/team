<!-- //
// Copyright © 2025 Hardcore Engineering Inc.
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
// -->

<script lang="ts">
  import LinkPreviewPresenter from './LinkPreviewPresenter.svelte'
  import { type WithLookup } from '@hanzo/core'
  import { type Attachment } from '@hanzo/attachment'
  import { Scroller } from '@hanzo/ui'
  export let attachments: WithLookup<Attachment>[] = []
  export let isOwn = false
</script>

<div class="gapV-2">
  {#each attachments as attachment}
    <Scroller contentDirection={'horizontal'} horizontal scrollSnap>
      <LinkPreviewPresenter {attachment} {isOwn} />
    </Scroller>
  {/each}
</div>
