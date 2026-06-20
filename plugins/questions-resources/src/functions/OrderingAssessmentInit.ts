//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type OrderingAssessment
} from '@hanzoteam/questions'
import { type Hierarchy } from '@hanzoteam/core'
import type { ThemeOptions } from '@hanzoteam/theme'
import { OrderingQuestionInit } from './OrderingQuestionInit'

export const OrderingAssessmentInit: QuestionInitFunction<OrderingAssessment> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<OrderingAssessment>> => {
  return {
    ...(await OrderingQuestionInit(language, hierarchy)),
    assessmentData: {
      correctOrder: [1]
    }
  }
}
