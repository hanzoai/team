//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type OrderingAssessment
} from '@hanzo/questions'
import { type Hierarchy } from '@hanzo/core'
import type { ThemeOptions } from '@hanzo/theme'
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
