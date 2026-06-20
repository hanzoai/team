//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceAssessment
} from '@hanzoteam/questions'
import { type Hierarchy } from '@hanzoteam/core'
import type { ThemeOptions } from '@hanzoteam/theme'
import { SingleChoiceQuestionInit } from './SingleChoiceQuestionInit'

export const SingleChoiceAssessmentInit: QuestionInitFunction<SingleChoiceAssessment> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<SingleChoiceAssessment>> => {
  return {
    ...(await SingleChoiceQuestionInit(language, hierarchy)),
    assessmentData: {
      correctIndex: 0
    }
  }
}
