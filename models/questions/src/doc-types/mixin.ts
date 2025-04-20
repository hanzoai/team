//
// Copyright @ 2024 Hardcore Engineering Inc.
//

import type {
  Answer,
  AnswerDataAssessFunction,
  Assessment,
  Question,
  QuestionInitFunction,
  QuestionMixin,
  QuestionDataPresenter,
  QuestionDataEditor,
  AnswerDataPresenter,
  AnswerDataEditor
} from '@hanzo/questions'
import type { Class, Ref } from '@hanzo/core'
import { Mixin } from '@hanzo/model'
import core, { TClass } from '@hanzo/model-core'
import type { Resource } from '@hanzo/platform'
import questions from '../plugin'

/** @public */
@Mixin(questions.mixin.QuestionMixin, core.class.Class)
export class TQuestionMixin<Q extends Question<any>, A extends Answer<Q, any>>
  extends TClass
  implements QuestionMixin<Q, A> {
  questionInit!: Resource<QuestionInitFunction<Q>>
  questionDataPresenter!: Resource<QuestionDataPresenter<Q>>
  questionDataEditor!: Resource<QuestionDataEditor<Q>>
  answerClassRef!: Ref<Class<A>>
  answerDataPresenter!: Resource<AnswerDataPresenter<Q, A>>
  answerDataEditor!: Resource<AnswerDataEditor<Q, A>>
  answerDataAssess!: Q extends Assessment<any, any> ? Resource<AnswerDataAssessFunction<Q, A>> : null
}
