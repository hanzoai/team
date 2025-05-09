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
  import { Person } from '@hanzo/contact'
  import { Ref } from '@hanzo/core'
  import { Button, Icon, Label, IconMoreV, Scroller } from '@hanzo/ui'
  import calendar from '../plugin'
  import AddParticipant from './AddParticipant.svelte'
  import EventParticipantItem from './EventParticipantItem.svelte'

  export let participants: Ref<Person>[]
  export let externalParticipants: string[]
  export let disabled: boolean = false
  export let focusIndex = -1

  interface IParticipants {
    participant: Ref<Person> | undefined
    externalParticipant: string | undefined
  }
  const shortListLength: number = 4
  let shown: boolean = false
  let needShort: boolean = false
  let allParticipants: IParticipants[]
  let shortParticipants: IParticipants[]
  $: if (participants || externalParticipants) {
    allParticipants = []
    participants.forEach((p) => allParticipants.push({ participant: p, externalParticipant: undefined }))
    externalParticipants.forEach((p) => allParticipants.push({ participant: undefined, externalParticipant: p }))
    needShort = allParticipants.length > shortListLength
    if (needShort) {
      shortParticipants = []
      for (let i = 0; i < shortListLength - 2; i++) shortParticipants.push(allParticipants[i])
    }
  }

  $: placeholder =
    participants.length > 0 || externalParticipants.length > 0
      ? calendar.string.AddParticipants
      : calendar.string.Participants

  function removeParticipant (_id: Ref<Person>): void {
    const index = participants.findIndex((p) => p === _id)
    if (index !== -1) {
      participants.splice(index, 1)
      participants = participants
    }
  }

  function removeExtParticipant (val: string): void {
    const index = externalParticipants.findIndex((p) => p === val)
    if (index !== -1) {
      externalParticipants.splice(index, 1)
      externalParticipants = externalParticipants
    }
  }

  function ref (e: CustomEvent<Ref<Person>>) {
    if (e.detail) {
      participants.push(e.detail)
      participants = participants
    }
  }

  function enter (e: CustomEvent<string>) {
    if (e.detail && e.detail !== '') {
      if (!externalParticipants.includes(e.detail)) {
        externalParticipants.push(e.detail)
        externalParticipants = externalParticipants
      }
    }
  }
</script>

{#if !disabled}
  <div class="flex-row-center flex-gap-1 container flex-no-shrink">
    <Icon icon={calendar.icon.Participants} size="small" />
    <AddParticipant
      {placeholder}
      excluded={participants}
      focusable
      fullSize
      {focusIndex}
      on:ref={ref}
      on:enter={enter}
    />
  </div>
{/if}
{#if allParticipants.length}
  <Scroller padding={disabled ? '.5rem 0 0 1.25rem' : '.125rem 0 0 1.25rem'} shrink>
    {#if disabled}
      <div style="position:absolute; left:0; top:1rem">
        <Icon icon={calendar.icon.Participants} size="small" />
      </div>
    {/if}
    {#if needShort && !shown}
      {#each shortParticipants as p, i}
        <EventParticipantItem
          participant={p.participant}
          externalParticipant={p.externalParticipant}
          focusIndex={focusIndex + i}
          {disabled}
          on:removeParticipant={() => {
            if (p.participant) removeParticipant(p.participant)
          }}
          on:removeExtParticipant={() => {
            if (p.externalParticipant) removeExtParticipant(p.externalParticipant)
          }}
        />
      {/each}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <div class="antiOption step-tb25" tabindex={focusIndex + shortListLength - 2}>
        <Button
          icon={IconMoreV}
          kind={'ghost'}
          size={'x-small'}
          padding={'0 .5rem'}
          focusIndex={-1}
          on:click={() => (shown = true)}
        />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="overflow-label flex-grow ml-2" style="cursor:pointer" on:click={() => (shown = true)}>
          <Label label={calendar.string.SeeAllNumberParticipants} params={{ value: allParticipants.length }} />
        </span>
      </div>
      <EventParticipantItem
        participant={allParticipants[allParticipants.length - 1].participant}
        externalParticipant={allParticipants[allParticipants.length - 1].externalParticipant}
        focusIndex={focusIndex + shortListLength - 1}
        {disabled}
        on:removeParticipant={(event) => {
          if (event.detail !== undefined) removeParticipant(event.detail)
        }}
        on:removeExtParticipant={(event) => {
          if (event.detail !== undefined) removeExtParticipant(event.detail)
        }}
      />
    {:else}
      {#each allParticipants as p, i}
        <EventParticipantItem
          participant={p.participant}
          externalParticipant={p.externalParticipant}
          focusIndex={focusIndex + i}
          {disabled}
          on:removeParticipant={() => {
            if (p.participant) removeParticipant(p.participant)
          }}
          on:removeExtParticipant={() => {
            if (p.externalParticipant) removeExtParticipant(p.externalParticipant)
          }}
        />
      {/each}
    {/if}
    <div class="antiVSpacer x0-5" />
  </Scroller>
{/if}
