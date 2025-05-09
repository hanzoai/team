//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
// Copyright © 2023 Hardcore Engineering Inc.
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

import { contactId } from '@hanzo/contact'
import contact from '@hanzo/contact-resources/src/plugin'
import type { Client, Doc, DocManager, Ref } from '@hanzo/core'
import { type ObjectSearchCategory, type ObjectSearchFactory } from '@hanzo/model-presentation'
import { type NotificationGroup } from '@hanzo/notification'
import { type IntlString, mergeIds, type Resource } from '@hanzo/platform'
import { type TemplateFieldFunc } from '@hanzo/templates'
import { type AnyComponent, type Location } from '@hanzo/ui/src/types'
import { type Action, type ActionCategory, type ViewAction } from '@hanzo/view'
import { type ChatMessageViewlet } from '@hanzo/chunter'
import { type LocationData } from '@hanzo/workbench'

export default mergeIds(contactId, contact, {
  activity: {
    NameChangedActivityMessage: '' as AnyComponent
  },
  component: {
    PersonPresenter: '' as AnyComponent,
    ContactRefPresenter: '' as AnyComponent,
    ContactPresenter: '' as AnyComponent,
    EditPerson: '' as AnyComponent,
    EditOrganization: '' as AnyComponent,
    OrganizationPresenter: '' as AnyComponent,
    Contacts: '' as AnyComponent,
    ContactsTabs: '' as AnyComponent,
    OrganizationEditor: '' as AnyComponent,
    EmployeePresenter: '' as AnyComponent,
    EmployeeRefPresenter: '' as AnyComponent,
    PersonRefPresenter: '' as AnyComponent,
    PersonEditor: '' as AnyComponent,
    Members: '' as AnyComponent,
    MemberPresenter: '' as AnyComponent,
    EditMember: '' as AnyComponent,
    EmployeeArrayEditor: '' as AnyComponent,
    ContactArrayEditor: '' as AnyComponent,
    EmployeeEditor: '' as AnyComponent,
    CreateEmployee: '' as AnyComponent,
    ChannelFilter: '' as AnyComponent,
    MergePersons: '' as AnyComponent,
    ChannelPanel: '' as AnyComponent,
    ActivityChannelPresenter: '' as AnyComponent,
    EmployeeFilter: '' as AnyComponent,
    EmployeeFilterValuePresenter: '' as AnyComponent,
    ChannelIcon: '' as AnyComponent
  },
  string: {
    SearchEmployee: '' as IntlString,
    SearchPerson: '' as IntlString,
    SearchOrganization: '' as IntlString,
    ContactInfo: '' as IntlString,
    Contact: '' as IntlString,
    Channel: '' as IntlString,
    ChannelProvider: '' as IntlString,
    Value: '' as IntlString,
    Phone: '' as IntlString,
    PhonePlaceholder: '' as IntlString,
    LinkedIn: '' as IntlString,
    LinkedInPlaceholder: '' as IntlString,
    AtPlaceHolder: '' as IntlString,
    FacebookPlaceholder: '' as IntlString,
    HomepagePlaceholder: '' as IntlString,
    Twitter: '' as IntlString,
    GitHub: '' as IntlString,
    Facebook: '' as IntlString,
    TypeLabel: '' as IntlString,
    Homepage: '' as IntlString,
    Birthday: '' as IntlString,
    CreatedDate: '' as IntlString,
    Whatsapp: '' as IntlString,
    WhatsappPlaceholder: '' as IntlString,
    Skype: '' as IntlString,
    SkypePlaceholder: '' as IntlString,
    Profile: '' as IntlString,
    ProfilePlaceholder: '' as IntlString,
    Viber: '' as IntlString,
    ViberPlaceholder: '' as IntlString,

    CurrentEmployee: '' as IntlString,

    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    People: '' as IntlString
  },
  completion: {
    PersonQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeQuery: '' as Resource<ObjectSearchFactory>,
    OrganizationQuery: '' as Resource<ObjectSearchFactory>,
    EmployeeCategory: '' as Ref<ObjectSearchCategory>,
    PersonCategory: '' as Ref<ObjectSearchCategory>,
    OrganizationCategory: '' as Ref<ObjectSearchCategory>
  },
  category: {
    Contact: '' as Ref<ActionCategory>,
    Channel: '' as Ref<ActionCategory>
  },
  ids: {
    OrganizationNotificationGroup: '' as Ref<NotificationGroup>,
    PersonNotificationGroup: '' as Ref<NotificationGroup>,
    OrganizationChatMessageViewlet: '' as Ref<ChatMessageViewlet>,
    PersonChatMessageViewlet: '' as Ref<ChatMessageViewlet>,
    EmployeeChatMessageViewlet: '' as Ref<ChatMessageViewlet>
  },
  action: {
    KickEmployee: '' as Ref<Action>,
    ResendInvite: '' as Ref<Action>,
    DeleteEmployee: '' as Ref<Action>,
    MergePersons: '' as Ref<Action<Doc, any>>,
    OpenChannel: '' as Ref<Action>,
    PublicLink: '' as Ref<Action<Doc, any>>
  },
  actionImpl: {
    KickEmployee: '' as ViewAction,
    OpenChannel: '' as ViewAction,
    ResendInvite: '' as ViewAction
  },
  function: {
    GetCurrentEmployeeName: '' as Resource<TemplateFieldFunc>,
    GetCurrentEmployeeEmail: '' as Resource<TemplateFieldFunc>,
    GetCurrentEmployeePosition: '' as Resource<TemplateFieldFunc>,
    GetContactName: '' as Resource<TemplateFieldFunc>,
    GetContactFirstName: '' as Resource<TemplateFieldFunc>,
    GetContactLastName: '' as Resource<TemplateFieldFunc>,
    ContactTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    ChannelTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    ChannelIdentifierProvider: '' as Resource<(client: Client, ref: Ref<Doc>, doc?: Doc) => Promise<string>>,
    SetPersonStore: '' as Resource<(manager: DocManager<any>) => void>,
    PersonFilterFunction: '' as Resource<(doc: Doc, target: Doc) => boolean>
  },
  resolver: {
    LocationData: '' as Resource<(loc: Location) => Promise<LocationData>>
  }
})
