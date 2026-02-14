<!--
// Copyright © 2024 Hanzo <dev@hanzo.ai>.
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
  import { onDestroy, onMount } from 'svelte'
  import { HanzopulseClient } from '@hanzo/hanzopulse-client'
  import { createPulseClient } from '@hanzo/presentation'

  let parentElement: HTMLDivElement

  let pulseclient: HanzopulseClient | undefined

  onMount(async () => {
    pulseclient = await createPulseClient()
  })

  onDestroy(() => {
    pulseclient?.close()
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
