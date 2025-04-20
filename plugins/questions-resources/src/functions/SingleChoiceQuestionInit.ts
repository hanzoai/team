//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type SingleChoiceQuestion
} from '@hanzo/questions'
import { type Hierarchy } from '@hanzo/core'
import { translate } from '@hanzo/platform'
import type { ThemeOptions } from '@hanzo/theme'
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
