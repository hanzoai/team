<script lang="ts">
  import { Event } from '@hanzo/calendar'
  import { calendarByIdStore } from '@hanzo/calendar-resources'
  import { IdMap } from '@hanzo/core'
  import { ToDo, WorkSlot } from '@hanzo/time'
  import { getCurrentEmployee } from '@hanzo/contact'
  import { groupTeamData } from '../utils'
  import PlanPerson from './PlanPerson.svelte'

  export let slots: WorkSlot[]
  export let events: Event[]
  export let showAssignee: boolean = false

  export let todos: IdMap<ToDo>

  const me = getCurrentEmployee()

  $: grouped = groupTeamData(slots, todos, events, me, $calendarByIdStore)
</script>

<div class="container flex-col background-comp-header-color">
  {#each grouped as gitem, i}
    {#if i}
      <div class="divider" />
    {/if}
    <PlanPerson {gitem} {showAssignee} />
  {/each}
</div>

<style lang="scss">
  .divider {
    border-top: 1px solid var(--theme-table-border-color);
  }

  .container {
    margin-top: 0.75rem;
    border: 1px solid var(--theme-table-border-color);
    border-radius: 0.5rem;
  }
</style>
