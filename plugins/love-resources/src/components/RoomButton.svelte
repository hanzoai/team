<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getEmbeddedLabel } from '@hanzo/platform'
  import { Avatar, personByIdStore } from '@hanzo/contact-resources'
  import { tooltip, deviceOptionsStore as deviceInfo, checkAdaptiveMatching } from '@hanzo/ui'
  import { ParticipantInfo } from '@hanzo/love'
  import { formatName } from '@hanzo/contact'
  import ParticipantsList from './ParticipantsList.svelte'

  export let label: string
  export let participants: (ParticipantInfo & { onclick?: (e: MouseEvent) => void })[]
  export let active: boolean = false
  export let limit: number = 4

  $: overLimit = participants.length > limit
  $: adaptive = checkAdaptiveMatching($deviceInfo.size, 'md') || overLimit
</script>

{#if adaptive}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="hanzoaiStatusBarButton"
    class:active
    use:tooltip={{ component: ParticipantsList, props: { items: participants }, direction: 'bottom' }}
    on:click
  >
    <span class="hanzoaiStatusBarButton-label">{label}</span>
    <div class="hanzoaiCombineAvatars-container">
      {#each participants.slice(0, limit) as participant, i (participant._id)}
        <div
          class="hanzoaiCombineAvatar tiny"
          data-over={i === limit - 1 && overLimit ? `+${participants.length - limit + 1}` : undefined}
        >
          <Avatar
            name={$personByIdStore.get(participant.person)?.name ?? participant.name}
            size={'card'}
            person={$personByIdStore.get(participant.person)}
          />
        </div>
      {/each}
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="hanzoaiStatusBarButton" class:active on:click>
    <span class="hanzoaiStatusBarButton-label">{label}</span>
    <div class="hanzoaiStatusBarButton-icons">
      {#each participants as participant (participant._id)}
        <div
          use:tooltip={{ label: getEmbeddedLabel(formatName(participant.name)), direction: 'bottom' }}
          on:click={participant.onclick}
        >
          <Avatar
            name={$personByIdStore.get(participant.person)?.name ?? participant.name}
            size={'card'}
            person={$personByIdStore.get(participant.person)}
          />
        </div>
      {/each}
    </div>
  </div>
{/if}
