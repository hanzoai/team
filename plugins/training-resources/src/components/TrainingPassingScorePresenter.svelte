<!--
  Copyright @ 2024 Hanzo AI Inc.
-->

<script lang="ts">
  import type { Question } from '@hanzoteam/questions'
  import type { Training } from '@hanzoteam/training'
  import { createQuery } from '@hanzoteam/presentation'
  import { calculateAnswersToPass, queryQuestions } from '@hanzoteam/questions-resources'
  import { Loading } from '@hanzoteam/ui'
  import Score from './Score.svelte'

  export let value: Training

  let questions: Question<unknown>[] = []
  const query = createQuery()
  $: {
    queryQuestions(query, value, 'questions', (result) => {
      questions = result
    })
  }

  let total: number | null = null
  let needed: number | null = null
  $: {
    const calculated = calculateAnswersToPass(questions, value.passingScore)
    total = calculated.assessmentsTotal
    needed = calculated.answersNeeded
  }
</script>

{#if total === null || needed === null}
  <Loading size="small" />
{:else}
  <Score count={needed} {total} score={value.passingScore} />
{/if}
