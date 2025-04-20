<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Question } from '@hanzo/questions'
  import type { Training } from '@hanzo/training'
  import { createQuery } from '@hanzo/presentation'
  import { calculateAnswersToPass, queryQuestions } from '@hanzo/questions-resources'
  import { Loading } from '@hanzo/ui'
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
