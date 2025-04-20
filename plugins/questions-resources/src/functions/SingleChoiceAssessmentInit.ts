//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceAssessment
} from '@hanzo/questions'
import { type Hierarchy } from '@hanzo/core'
import type { ThemeOptions } from '@hanzo/theme'
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
