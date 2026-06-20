<script lang="ts">
  import { Card } from '@hanzoteam/board'
  import { Ref, Space } from '@hanzoteam/core'
  import { IntlString, translate } from '@hanzoteam/platform'
  import { createQuery } from '@hanzoteam/presentation'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hanzoteam/ui'
  import board from '../../plugin'

  export let object: Card
  export let label: IntlString
  export let selected: Ref<Space>

  let spaces: DropdownTextItem[] = []
  const spacesQuery = createQuery()
  spacesQuery.query(board.class.Board, {}, async (result) => {
    spaces = result.map(({ _id, name }) => ({ id: _id, label: name }))
    const index = spaces.findIndex(({ id }) => id === object.space)
    spaces[index].label = await translate(board.string.Current, { label: spaces[index].label }, $themeStore.language)
  })
</script>

<DropdownLabels items={spaces} {label} bind:selected />
