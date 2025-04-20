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

import { type Resources } from '@hanzo/platform'

import CreateFunnel from './components/CreateFunnel.svelte'
import CreateLead from './components/CreateLead.svelte'
import EditLead from './components/EditLead.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import LeadPresenter from './components/LeadPresenter.svelte'
import Leads from './components/Leads.svelte'
import LeadsPresenter from './components/LeadsPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import CreateCustomer from './components/CreateCustomer.svelte'
import NewItemsHeader from './components/NewItemsHeader.svelte'
import EditFunnel from './components/EditFunnel.svelte'
import MyLeads from './components/MyLeads.svelte'
import TitlePresenter from './components/TitlePresenter.svelte'

import { getLeadId, getLeadTitle } from './utils'

export default async (): Promise<Resources> => ({
  component: {
    CreateFunnel,
    CreateLead,
    EditLead,
    KanbanCard,
    LeadPresenter,
    TemplatesIcon,
    LeadsPresenter,
    Leads,
    CreateCustomer,
    NewItemsHeader,
    EditFunnel,
    MyLeads,
    TitlePresenter
  },
  function: {
    LeadTitleProvider: getLeadTitle,
    LeadIdProvider: getLeadId
  }
})
