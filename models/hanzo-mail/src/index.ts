//
// Copyright © 2025 Hanzo AI Inc.
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

import { hanzoMailIntegrationKind } from '@hanzo/hanzo-mail'
import { type Builder } from '@hanzo/model'
import core from '@hanzo/model-core'
import setting from '@hanzo/setting'

import hanzoMail from './plugin'

export { hanzoMailId } from '@hanzo/hanzo-mail'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: hanzoMail.string.IntegrationLabel,
      description: hanzoMail.string.IntegrationDescription,
      icon: hanzoMail.component.IconHanzoMail,
      allowMultiple: true,
      createComponent: hanzoMail.component.Connect,
      onDisconnect: hanzoMail.handler.DisconnectHandler,
      onDisconnectAll: hanzoMail.handler.DisconnectAllHandler,
      reconnectComponent: hanzoMail.component.Connect,
      configureComponent: hanzoMail.component.Configure,
      stateComponent: hanzoMail.component.IntegrationState,
      kind: hanzoMailIntegrationKind
    },
    hanzoMail.integrationType.HanzoMail
  )
}
