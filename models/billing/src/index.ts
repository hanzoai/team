//
// Copyright © 2024-2025 Hanzo AI Inc.
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

import { Model, UX, type Builder } from '@hanzo/model'
import core, { TDoc } from '@hanzo/model-core'
import { type IntlString } from '@hanzo/platform'
import setting from '@hanzo/setting'
import billing, { type Tier } from '@hanzo/billing'
import { AccountRole, DOMAIN_MODEL } from '@hanzo/core'
import presentation from '@hanzo/model-presentation'
import workbench from '@hanzo/workbench'

export { billingId } from '@hanzo/billing'
export { billing as default }

@Model(billing.class.Tier, core.class.Doc, DOMAIN_MODEL)
@UX(billing.string.Tier)
export class TTier extends TDoc implements Tier {
  label!: IntlString
  description!: IntlString
  storageLimitGB!: number
  trafficLimitGB!: number

  priceMonthly!: number
  index!: number
  color?: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TTier)

  builder.createDoc(setting.class.WorkspaceSettingCategory, core.space.Model, {
    name: 'billing',
    label: billing.string.Billing,
    icon: billing.icon.Billing,
    component: billing.component.Settings,
    group: 'settings-editor',
    role: AccountRole.Owner,
    feature: 'billing',
    order: 920
  })

  builder.createDoc(
    billing.class.Tier,
    core.space.Model,
    {
      label: billing.string.Pro,
      description: billing.string.ProDescription,
      storageLimitGB: 100,
      trafficLimitGB: 100,
      priceMonthly: 20,
      index: 0,
      color: 'Sky'
    },
    billing.tier.Pro
  )

  builder.createDoc(
    billing.class.Tier,
    core.space.Model,
    {
      label: billing.string.Team,
      description: billing.string.TeamDescription,
      storageLimitGB: 1000,
      trafficLimitGB: 1000,
      priceMonthly: 200,
      index: 1,
      color: 'Orchid'
    },
    billing.tier.Team
  )

  builder.createDoc(
    billing.class.Tier,
    core.space.Model,
    {
      label: billing.string.Max,
      description: billing.string.MaxDescription,
      storageLimitGB: 10000,
      trafficLimitGB: 10000,
      priceMonthly: 500,
      index: 2,
      color: 'Orange'
    },
    billing.tier.Max
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchExtensions,
    component: billing.component.WorkbenchExtension
  })
}
