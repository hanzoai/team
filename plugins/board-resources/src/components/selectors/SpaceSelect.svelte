<script lang="ts">
  import { Card } from '@hanzo/board'
  import { Ref, Space } from '@hanzo/core'
  import { IntlString, translate } from '@hanzo/platform'
  import { createQuery } from '@hanzo/presentation'
  import { DropdownLabels, DropdownTextItem, themeStore } from '@hanzo/ui'
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
