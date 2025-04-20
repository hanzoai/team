//
// Copyright © 2020, 2021 Hanzo <dev@hanzo.ai>.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { type ChatMessageViewlet } from '@hanzo/chunter'
import type { Doc, Ref, Status } from '@hanzo/core'
import { leadId } from '@hanzo/lead'
import lead from '@hanzo/lead-resources/src/plugin'
import { type NotificationGroup, type NotificationType } from '@hanzo/notification'
import type { IntlString } from '@hanzo/platform'
import { mergeIds } from '@hanzo/platform'
import { type TaskTypeDescriptor } from '@hanzo/task'
import type { AnyComponent } from '@hanzo/ui/src/types'
import { type Action, type ActionCategory, type Viewlet } from '@hanzo/view'

export default mergeIds(leadId, lead, {
  string: {
    Funnel: '' as IntlString,
    Funnels: '' as IntlString,
    LeadApplication: '' as IntlString,
    Title: '' as IntlString,
    ManageFunnelStatuses: '' as IntlString,
    GotoLeadApplication: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  component: {
    CreateLead: '' as AnyComponent,
    EditLead: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    LeadPresenter: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Leads: '' as AnyComponent,
    NewItemsHeader: '' as AnyComponent
  },
  viewlet: {
    TableCustomer: '' as Ref<Viewlet>,
    TableFunnel: '' as Ref<Viewlet>,
    TableLead: '' as Ref<Viewlet>,
    ListLead: '' as Ref<Viewlet>,
    DashboardLead: '' as Ref<Viewlet>,
    KanbanLead: '' as Ref<Viewlet>
  },
  category: {
    Lead: '' as Ref<ActionCategory>
  },
  action: {
    EditStatuses: '' as Ref<Action>,
    CreateGlobalLead: '' as Ref<Action<Doc, any>>
  },
  ids: {
    LeadNotificationGroup: '' as Ref<NotificationGroup>,
    CustomerNotificationGroup: '' as Ref<NotificationGroup>,
    FunnelNotificationGroup: '' as Ref<NotificationGroup>,
    LeadCreateNotification: '' as Ref<NotificationType>,
    AssigneeNotification: '' as Ref<NotificationType>,
    LeadChatMessageViewlet: '' as Ref<ChatMessageViewlet>
  },
  descriptors: {
    Lead: '' as Ref<TaskTypeDescriptor>
  },
  taskTypeStatus: {
    Backlog: '' as Ref<Status>,
    Incoming: '' as Ref<Status>,
    Negotiation: '' as Ref<Status>,
    OfferPreparing: '' as Ref<Status>,
    MakeADecision: '' as Ref<Status>,
    ContractConclusion: '' as Ref<Status>,
    Won: '' as Ref<Status>,
    Lost: '' as Ref<Status>
  }
})
