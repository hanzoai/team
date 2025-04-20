//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type MultipleChoiceQuestion
} from '@hanzo/questions'
import { type Hierarchy } from '@hanzo/core'
import { translate } from '@hanzo/platform'
import type { ThemeOptions } from '@hanzo/theme'
import questions from '../plugin'

export const MultipleChoiceQuestionInit: QuestionInitFunction<MultipleChoiceQuestion> = async (
  language: ThemeOptions['language'],
  hierarchy: Hierarchy
): Promise<QuestionInitFunctionResult<MultipleChoiceQuestion>> => {
  return {
    title: await translate(questions.string.MultipleChoice, {}, language),
    questionData: {
      options: [{ label: '' }]
    }
  }
}
