//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021, 2022 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type Builder } from '@hanzoteam/model'
import serverCore from '@hanzoteam/server-core'
import core from '@hanzoteam/core'
import serverNotification from '@hanzoteam/server-notification'
import serverSetting from '@hanzoteam/server-setting'
import setting from '@hanzoteam/setting'
import serverTemplates from '@hanzoteam/server-templates'
import templates from '@hanzoteam/templates'

export { serverSettingId } from '@hanzoteam/server-setting'

export function createModel (builder: Builder): void {
  builder.mixin(setting.class.Integration, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverSetting.function.IntegrationHTMLPresenter
  })

  builder.mixin(setting.class.Integration, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverSetting.function.IntegrationTextPresenter
  })

  builder.mixin(setting.templateField.Value, templates.class.TemplateField, serverTemplates.mixin.ServerTemplateField, {
    serverFunc: serverSetting.function.GetValue
  })

  builder.mixin(
    setting.templateField.OwnerFirstName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverSetting.function.GetFirstName
    }
  )

  builder.mixin(
    setting.templateField.OwnerLastName,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverSetting.function.GetLastName
    }
  )

  builder.mixin(
    setting.templateField.OwnerPosition,
    templates.class.TemplateField,
    serverTemplates.mixin.ServerTemplateField,
    {
      serverFunc: serverSetting.function.GetOwnerPosition
    }
  )

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverSetting.trigger.OnRoleNameUpdate,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.Role
    }
  })
}
