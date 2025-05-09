<script lang="ts">
  import { ActionIcon, IconAdd, showPopup, ModernEditbox, Spinner } from '@hanzo/ui'
  import { SortingOrder } from '@hanzo/core'
  import { getCurrentEmployee } from '@hanzo/contact'
  import { TimeEvents, ToDoPriority } from '@hanzo/time'
  import { getClient } from '@hanzo/presentation'
  import CreateToDoPopup from './CreateToDoPopup.svelte'
  import time from '../plugin'
  import { makeRank } from '@hanzo/task'
  import { Analytics } from '@hanzo/analytics'

  export let fullSize: boolean = false
  let value: string = ''
  let disabled: boolean = false

  const client = getClient()
  const me = getCurrentEmployee()

  async function save (): Promise<void> {
    let [name, description] = value.split('//')
    name = name.trim()
    if (name.length === 0) return
    description = description?.trim() ?? ''
    const ops = client.apply(undefined, 'save-todo')
    const latestTodo = await ops.findOne(
      time.class.ToDo,
      {
        user: me,
        doneOn: null
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    const id = await ops.addCollection(
      time.class.ToDo,
      time.space.ToDos,
      time.ids.NotAttached,
      time.class.ToDo,
      'todos',
      {
        title: name,
        description,
        user: me,
        workslots: 0,
        priority: ToDoPriority.NoPriority,
        visibility: 'private',
        rank: makeRank(undefined, latestTodo?.rank)
      }
    )
    await ops.commit()
    Analytics.handleEvent(TimeEvents.ToDoCreated, { id })
    clear()
  }

  function clear () {
    value = ''
  }

  function openPopup () {
    showPopup(CreateToDoPopup, {}, 'top')
  }
</script>

<div class="flex-row-center flex-gap-1 container" on:blur={clear}>
  <ModernEditbox
    label={time.string.CreateToDo}
    width={fullSize ? '100%' : ''}
    size={'medium'}
    autoAction={false}
    {disabled}
    bind:value
    on:keydown={(e) => {
      if (e.key === 'Enter') {
        disabled = true
        save().finally(() => (disabled = false))
        e.preventDefault()
        e.stopPropagation()
      }
    }}
  >
    {#if disabled}
      <Spinner size={'small'} />
    {:else}
      <ActionIcon icon={IconAdd} action={openPopup} size={'small'} />
    {/if}
  </ModernEditbox>
</div>

<style lang="scss">
  .container {
    padding: var(--spacing-2) var(--spacing-2) var(--spacing-2_5);
    min-height: calc(4.875rem - 0.5px);
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
