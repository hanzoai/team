<script lang="ts">
  import { Card } from '@hanzo/board'
  import { DocumentQuery, SortingOrder } from '@hanzo/core'
  import { createQuery, getClient } from '@hanzo/presentation'
  import { Button, Label } from '@hanzo/ui'
  import type { Action } from '@hanzo/view'
  import { invokeAction } from '@hanzo/view-resources'
  import board from '../plugin'
  import { getCardActions } from '../utils/CardActionUtils'
  import KanbanCard from './KanbanCard.svelte'

  export let query: DocumentQuery<Card> = {}

  let archivedCards: Card[]
  let actions: Action[] = []
  const client = getClient()
  const cardQuery = createQuery()
  $: cardQuery.query(
    board.class.Card,
    { ...query, isArchived: true },
    (result) => {
      archivedCards = result
    },
    { sort: { rank: SortingOrder.Descending } }
  )
  getCardActions(client, { _id: { $in: [board.action.SendToBoard, board.action.Delete] } }).then(async (result) => {
    actions = result
  })
</script>

{#if archivedCards}
  {#if archivedCards.length === 0}
    <div class="flex-center fs-title pb-4">
      <Label label={board.string.NoResults} />
    </div>
  {/if}
  {#each archivedCards as card}
    <KanbanCard object={card} />
    <div class="flex-center flex-gap-2 w-full">
      <Button
        label={board.string.SendToBoard}
        on:click={(e) => {
          const unarchiveAction = actions.find((a) => a._id === board.action.SendToBoard)
          if (unarchiveAction) {
            invokeAction(card, e, unarchiveAction)
          }
        }}
      />
      <Button
        label={board.string.Delete}
        on:click={async (e) => {
          const deleteAction = actions.find((a) => a._id === board.action.Delete)
          if (deleteAction) {
            invokeAction(card, e, deleteAction)
          }
        }}
      />
    </div>
  {/each}
{/if}
