//
// Copyright @ 2022 Hardcore Engineering Inc.
//
import { type Builder } from '@hanzo/model'

import training from '@hanzo/model-training'
import serverTraining from '@hanzo/server-training'
import core from '@hanzo/core'
import notification from '@hanzo/notification'
import serverNotification from '@hanzo/server-notification'

export { serverTrainingId } from '@hanzo/server-training/src/index'

export function createModel (builder: Builder): void {
  builder.mixin(
    training.notification.TrainingRequest,
    notification.class.NotificationType,
    serverNotification.mixin.TypeMatch,
    {
      func: serverTraining.function.TrainingRequestNotificationTypeMatch
    }
  )

  builder.mixin(training.class.TrainingRequest, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverTraining.function.TrainingRequestTextPresenter
  })

  builder.mixin(training.class.TrainingRequest, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverTraining.function.TrainingRequestHTMLPresenter
  })
}
