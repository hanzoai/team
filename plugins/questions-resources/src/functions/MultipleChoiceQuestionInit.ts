//
// Copyright @ 2024 Hanzo AI Inc.
//

import {
  type QuestionInitFunction,
  type QuestionInitFunctionResult,
  type MultipleChoiceQuestion
} from '@hanzoteam/questions'
import { type Hierarchy } from '@hanzoteam/core'
import { translate } from '@hanzoteam/platform'
import type { ThemeOptions } from '@hanzoteam/theme'
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
