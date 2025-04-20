//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import { questionsId } from '@hanzo/questions'
import questions from '@hanzo/questions-resources/src/plugin'
import type { Ref } from '@hanzo/core'
import { mergeIds } from '@hanzo/platform'
import type { ActionCategory } from '@hanzo/view'

export default mergeIds(questionsId, questions, {
  actionCategory: {
    Questions: '' as Ref<ActionCategory>
  }
})
