<!--
  Copyright © 2023 Hardcore Engineering Inc.
-->

<script lang="ts">
  import { navigate } from '@hanzo/ui'
  import questions from '@hanzo/questions'
  import { getQuestionClasses, QuestionsCollectionEditor } from '@hanzo/questions-resources'
  import { type Training } from '@hanzo/training'
  import { trainingRoute, TrainingRouteTab } from '../routing/routes/trainingRoute'
  import { canViewTrainingQuestions } from '../utils'
  import TrainingPassingScoreSlider from './TrainingPassingScoreSlider.svelte'

  export let object: Training
  export let readonly: boolean = true

  $: if (!canViewTrainingQuestions(object)) {
    navigate(trainingRoute.build({ id: object._id, tab: TrainingRouteTab.Overview }), true)
  }

  const questionClasses = getQuestionClasses(questions.class.Assessment)
</script>

<div class="pl-6 pr-6 pt-4 max-w-240 mx-auto">
  <TrainingPassingScoreSlider {readonly} {object} />
  <QuestionsCollectionEditor {object} key="questions" {readonly} {questionClasses} />
</div>
