//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceQuestion
} from '@hanzoteam/questions'
import { type Hierarchy } from '@hanzoteam/core'
import { translate } from '@hanzoteam/platform'
import type { ThemeOptions } from '@hanzoteam/theme'
import questions from '../plugin'

export const SingleChoiceQuestionInit: QuestionInitFunction<SingleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<SingleChoiceQuestion>> => {
  return {
    title: await translate(questions.string.SingleChoice, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
