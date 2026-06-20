//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type MultipleChoiceAssessment
} from '@hanzoteam/questions'
import { type Hierarchy } from '@hanzoteam/core'
import type { ThemeOptions } from '@hanzoteam/theme'
import { MultipleChoiceQuestionInit } from './MultipleChoiceQuestionInit'

export const MultipleChoiceAssessmentInit: QuestionInitFunction<MultipleChoiceAssessment> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<MultipleChoiceAssessment>> => {
  return {
    ...(await MultipleChoiceQuestionInit(language, hierarchy)),
    assessmentData: {
      correctIndices: [0]
    }
  }
}
