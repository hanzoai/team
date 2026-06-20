//
// Copyright @ 2024 Hanzo AI Inc.
//

import { questionsId } from '@hanzoteam/questions'
import questions from '@hanzoteam/questions-resources/src/plugin'
import type { Ref } from '@hanzoteam/core'
import { mergeIds } from '@hanzoteam/platform'
import type { ActionCategory } from '@hanzoteam/view'

export default mergeIds(questionsId, questions, {
  actionCategory: {
    Questions: '' as Ref<ActionCategory>
  }
})
