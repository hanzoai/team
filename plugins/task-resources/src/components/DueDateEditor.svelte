<script lang="ts">
  import { getClient } from '@hanzo/presentation'
  import { DueDatePresenter, ButtonSize, ButtonKind } from '@hanzo/ui'
  import { WithLookup } from '@hanzo/core'
  import task, { Task } from '@hanzo/task'
  import { statusStore } from '@hanzo/view-resources'

  export let object: WithLookup<Task>
  export let width: string | undefined = undefined
  export let size: ButtonSize = 'medium'
  export let kind: ButtonKind = 'link'
  export let editable: boolean = true
  export let onChange: ((value: any) => void) | undefined

  const client = getClient()
  $: status = $statusStore.byId.get(object.status)

  $: shouldIgnoreOverdue = status?.category === task.statusCategory.Lost || status?.category === task.statusCategory.Won

  const handleDueDateChanged = async (newDueDate: number | undefined | null) => {
    if (newDueDate === undefined || object.dueDate === newDueDate) {
      return
    }

    if (onChange !== undefined) {
      onChange(newDueDate)
    } else {
      await client.updateCollection(
        object._class,
        object.space,
        object._id,
        object.attachedTo,
        object.attachedToClass,
        object.collection,
        { dueDate: newDueDate }
      )
    }
  }
</script>

{#if object}
  <DueDatePresenter
    {kind}
    {width}
    {size}
    value={object.dueDate}
    {editable}
    onChange={(e) => handleDueDateChanged(e)}
    {shouldIgnoreOverdue}
  />
{/if}
