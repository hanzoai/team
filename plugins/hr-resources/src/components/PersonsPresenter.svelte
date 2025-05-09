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
  import { Employee } from '@hanzo/contact'
  import { EmployeePresenter } from '@hanzo/contact-resources'
  import { WithLookup } from '@hanzo/core'
  import { Staff } from '@hanzo/hr'
  import { closeTooltip } from '@hanzo/ui'
  import { showMenu } from '@hanzo/view-resources'
  import hr from '../plugin'

  import { flip } from 'svelte/animate'

  export let value: WithLookup<Staff> | WithLookup<Staff>[]
  export let inline: boolean = false
  export let dragPerson: WithLookup<Staff> | undefined
  export let showDragPerson: boolean = false

  let persons: WithLookup<Employee>[] = []
  $: persons = Array.isArray(value) ? value : [value]
  function ondrag (p: Employee): void {
    dragPerson = p as WithLookup<Staff>
  }
</script>

{#if value}
  <div class="flex persons">
    {#each persons as p (p._id)}
      <div
        class="ml-2 hover-trans icon"
        draggable={true}
        animate:flip={{ duration: 200 }}
        on:drag={() => {
          ondrag(p)
        }}
        on:dragend|preventDefault|stopPropagation={() => {
          dragPerson = undefined
          closeTooltip()
        }}
        on:contextmenu={(evt) => {
          showMenu(evt, { object: p })
        }}
      >
        <EmployeePresenter
          value={p}
          avatarSize={'large'}
          shouldShowName={false}
          {inline}
          tooltipLabels={{
            personLabel: hr.string.TeamLeadTooltip,
            placeholderLabel: hr.string.AssignLead
          }}
        />
      </div>
    {/each}
    {#if showDragPerson && dragPerson !== undefined && persons.find((it) => it._id === dragPerson?._id) === undefined}
      <EmployeePresenter
        value={dragPerson}
        avatarSize={'large'}
        shouldShowName={false}
        {inline}
        tooltipLabels={{
          personLabel: hr.string.TeamLeadTooltip,
          placeholderLabel: hr.string.AssignLead
        }}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .persons {
    display: flex;
    flex-wrap: wrap;
    .icon {
      margin: 0.15rem;
      border-radius: 50%;
    }
  }
</style>
