<script lang="ts">
  import { Card } from '@hanzo/board'
  import { Class, FindOptions, Ref } from '@hanzo/core'
  import { createQuery } from '@hanzo/presentation'
  import task, { Project, State } from '@hanzo/task'
  import tags from '@hanzo/tags'
  import { TableBrowser } from '@hanzo/view-resources'
  import board from '../plugin'

  export let _class: Ref<Class<Card>>
  export let space: Ref<Project>
  export let options: FindOptions<Card> | undefined

  const isArchived = { $ne: true }
  const query = createQuery()
  let states: Ref<State>[] = []
  $: query.query(task.class.State, { space, isArchived }, (result) => {
    states = result.map(({ _id }) => _id)
  })
</script>

<TableBrowser
  {_class}
  config={[
    'title',
    'status',
    {
      key: '',
      presenter: tags.component.TagsPresenter,
      label: board.string.Labels,
      sortingKey: 'labels',
      props: {
        _class: board.class.Card,
        key: 'labels'
      }
    },
    'startDate',
    'dueDate',
    { key: 'members', presenter: board.component.UserBoxList, label: board.string.Members, sortingKey: 'members' },
    'modifiedOn'
  ]}
  {options}
  query={{ isArchived, status: { $in: states } }}
/>
