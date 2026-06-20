//
// Copyright @ 2024 Hanzo AI Inc.
//

import type {
  AnswerDataAssessFunction,
  SingleChoiceAssessment,
  SingleChoiceAssessmentAnswer
} from '@hanzoteam/questions'

/** @public */
export const SingleChoiceAssessmentAssess: AnswerDataAssessFunction<
SingleChoiceAssessment,
SingleChoiceAssessmentAnswer
> = async (answerData, assessmentData) => {
  return {
    score: answerData.selectedIndex === assessmentData.correctIndex ? 100 : 0
  }
}
