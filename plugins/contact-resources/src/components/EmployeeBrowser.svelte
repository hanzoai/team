<script lang="ts">
  import contact, { Employee } from '@hanzo/contact'
  import { DocumentQuery, SortingOrder } from '@hanzo/core'
  import { getClient } from '@hanzo/presentation'
  import { Scroller } from '@hanzo/ui'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let search: string = ''
  const client = getClient()
  // export let withHeader: boolean = true
  $: searchQuery = search.length ? { $search: search } : {}
  $: resultQuery = { ...searchQuery }
  let employees: Employee[] = []

  async function updateEmployees (resultQuery: DocumentQuery<Employee>) {
    employees = await client.findAll(
      contact.mixin.Employee,
      {
        ...resultQuery
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 100,
        lookup: { _id: { statuses: contact.class.Status } }
      }
    )
  }

  $: updateEmployees(resultQuery)
</script>

<Scroller padding={'var(--spacing-2)'}>
  {#each employees as employee}
    <div class="fs-title item">
      <EmployeePresenter value={employee} avatarSize="medium" />
    </div>
  {/each}
</Scroller>

<style lang="scss">
  .item {
    color: var(--theme-caption-color);
    padding: 0.5rem 0.5rem;
    border-radius: var(--medium-BorderRadius);

    &:hover,
    &:focus {
      background-color: var(--highlight-hover);
    }
  }
</style>
