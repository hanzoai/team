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
  import { SortingOrder, WithLookup } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import tags from '@hanzo/tags'
  import { Component, IconMoreV2, Spinner, showPanel, Icon } from '@hanzo/ui'
  import { showMenu } from '@hanzo/view-resources'
  import time, { ToDo, ToDoPriority, WorkSlot } from '@hanzo/time'
  import plugin from '../plugin'
  import ToDoDuration from './ToDoDuration.svelte'
  import WorkItemPresenter from './WorkItemPresenter.svelte'
  import ToDoCheckbox from './ToDoCheckbox.svelte'
  import ToDoPriorityPresenter from './ToDoPriorityPresenter.svelte'

  export let todo: WithLookup<ToDo>
  export let planned: boolean = true
  export let isNew: boolean = false

  const client = getClient()
  let updating: Promise<any> | undefined = undefined

  async function markDone (): Promise<void> {
    await updating
    updating = client.update(todo, { doneOn: todo.doneOn == null ? Date.now() : null })
    await updating
    updating = undefined
  }

  let events: WorkSlot[] = []
  const query = createQuery()
  $: query.query(
    plugin.class.WorkSlot,
    {
      attachedTo: todo._id
    },
    (res) => {
      events = res
    },
    { sort: { date: SortingOrder.Descending } }
  )

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    hovered = true
    showMenu(ev, { object: todo }, () => {
      hovered = false
    })
  }

  function open (e: MouseEvent): void {
    showPanel(time.component.EditToDo, todo._id, todo._class, 'content')
  }

  $: isDone = todo.doneOn != null
</script>

<button
  class="hanzoaiToDoLine-container"
  class:hovered
  class:isDone
  on:click|stopPropagation={open}
  on:contextmenu={(e) => {
    showMenu(e, { object: todo })
  }}
>
  <div class="flex-row-center flex-grow flex-gap-2">
    <div class="hanzoaiToDoLine-statusPriority" class:isNew>
      {#if updating !== undefined}
        <Spinner size={'small'} />
      {:else}
        <button class="hanzoaiToDoLine-dragbox" on:contextmenu={onMenuClick}>
          <Icon icon={IconMoreV2} size={'small'} />
        </button>
        <ToDoPriorityPresenter value={todo.priority} muted={isDone} />
      {/if}
    </div>
    <WorkItemPresenter {todo} kind={'todo-line'} withoutSpace />
    <div class="hanzoaiToDoLine-title text-left font-regular-14 line-height-auto overflow-label">
      {todo.title}
    </div>
  </div>
  <div class="flex-row-top flex-no-shrink flex-gap-2">
    <div class="flex-row-center min-h-6 max-h-6 flex-gap-2">
      <Component
        is={tags.component.LabelsPresenter}
        props={{ object: todo, value: todo.labels, kind: 'todo-compact' }}
      />
    </div>
  </div>
  <div class="flex flex-no-shrink flex-gap-3 pl-2">
    {#if events.length > 0}
      <span class="font-regular-12 secondary-textColor">
        <ToDoDuration {events} />
      </span>
    {/if}
    {#if todo.dueDate}
      <span class="font-regular-12 secondary-textColor">
        {new Date(todo.dueDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
      </span>
    {/if}
  </div>
  <div class="hanzoaiToDoLine-checkbox" class:updating>
    <ToDoCheckbox checked={isDone} priority={todo.priority} on:value={markDone} />
  </div>
</button>
