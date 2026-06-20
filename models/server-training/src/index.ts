//
// Copyright @ 2022 Hanzo AI Inc.
//
import { type Builder } from '@hanzoteam/model'

import training from '@hanzoteam/model-training'
import serverTraining from '@hanzoteam/server-training'
import core from '@hanzoteam/core'
import notification from '@hanzoteam/notification'
import serverNotification from '@hanzoteam/server-notification'

export { serverTrainingId } from '@hanzoteam/server-training/src/index'

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
