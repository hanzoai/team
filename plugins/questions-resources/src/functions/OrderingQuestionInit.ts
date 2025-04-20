//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type OrderingQuestion
} from '@hanzo/questions'
import { type Hierarchy } from '@hanzo/core'
import { translate } from '@hanzo/platform'
import type { ThemeOptions } from '@hanzo/theme'
import questions from '../plugin'

export const OrderingQuestionInit: QuestionInitFunction<OrderingQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<OrderingQuestion>> => {
  return {
    title: await translate(questions.string.Ordering, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
