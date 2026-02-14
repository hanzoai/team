//
// Copyright @ 2024 Hanzo AI Inc.
//

import type { AnswerDataAssessFunction, OrderingAssessment, OrderingAssessmentAnswer } from '@hanzo/questions'

/** @public */
export const OrderingAssessmentAssess: AnswerDataAssessFunction<OrderingAssessment, OrderingAssessmentAnswer> = async (
  answerData,
  assessmentData
) => {
  return {
    score: answerData.order.join('~') === assessmentData.correctOrder.join('~') ? 100 : 0
  }
}
