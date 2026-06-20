//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { Answer, Question, QuestionMixin } from '@hanzoteam/questions'
import type { Class, Ref } from '@hanzoteam/core'
import { getClient } from '@hanzoteam/presentation'
import questions from '../plugin'

export function getQuestionMixin<Q extends Question<any>> (
  questionClassRef: Ref<Class<Q>>
): QuestionMixin<Q, Answer<Q, unknown>> {
  const hierarchy = getClient().getHierarchy()
  const questionClass = hierarchy.getClass<Q>(questionClassRef)
  if (!hierarchy.hasMixin(questionClass, questions.mixin.QuestionMixin)) {
    throw new Error(`Mixin ${questions.mixin.QuestionMixin} not found for question class ${questionClass._id}`)
  }
  return hierarchy.as(questionClass, questions.mixin.QuestionMixin)
}
