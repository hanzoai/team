//
// Copyright © 2024 Hanzo AI Inc.
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

import { analyticsCollectorId } from '@hanzoteam/analytics-collector'
import { calendarId } from '@hanzoteam/calendar'
import { chunterId } from '@hanzoteam/chunter'
import { contactId } from '@hanzoteam/contact'
import { coreId } from '@hanzoteam/core'
import { documentId } from '@hanzoteam/document'
import { driveId } from '@hanzoteam/drive'
import { hrId } from '@hanzoteam/hr'
import { leadId } from '@hanzoteam/lead'
import { loveId } from '@hanzoteam/love'
import { notificationId } from '@hanzoteam/notification'
import { preferenceId } from '@hanzoteam/preference'
import { recruitId } from '@hanzoteam/recruit'
import { settingId } from '@hanzoteam/setting'
import { timeId } from '@hanzoteam/time'
import { trackerId } from '@hanzoteam/tracker'
import { viewId } from '@hanzoteam/view'
import { workbenchId } from '@hanzoteam/workbench'

import analyticsCollectorEn from '@hanzoteam/analytics-collector-assets/lang/en.json'
import calendarEn from '@hanzoteam/calendar-assets/lang/en.json'
import chunterEn from '@hanzoteam/chunter-assets/lang/en.json'
import contactEn from '@hanzoteam/contact-assets/lang/en.json'
import coreEng from '@hanzoteam/core/lang/en.json'
import documentEn from '@hanzoteam/document-assets/lang/en.json'
import driveEn from '@hanzoteam/drive-assets/lang/en.json'
import hrEn from '@hanzoteam/hr-assets/lang/en.json'
import leadEn from '@hanzoteam/lead-assets/lang/en.json'
import loveEn from '@hanzoteam/love-assets/lang/en.json'
import notificationEn from '@hanzoteam/notification-assets/lang/en.json'
import platformEng from '@hanzoteam/platform/lang/en.json'
import preferenceEn from '@hanzoteam/preference-assets/lang/en.json'
import recruitEn from '@hanzoteam/recruit-assets/lang/en.json'
import settingEn from '@hanzoteam/setting-assets/lang/en.json'
import timeEn from '@hanzoteam/time-assets/lang/en.json'
import trackerEn from '@hanzoteam/tracker-assets/lang/en.json'
import viewEn from '@hanzoteam/view-assets/lang/en.json'
import workbenchEn from '@hanzoteam/workbench-assets/lang/en.json'

import { addStringsLoader, platformId } from '@hanzoteam/platform'

export function registerLoaders (): void {
  addStringsLoader(coreId, async (lang: string) => coreEng)
  addStringsLoader(platformId, async (lang: string) => platformEng)

  addStringsLoader(analyticsCollectorId, async (lang: string) => analyticsCollectorEn)
  addStringsLoader(calendarId, async (lang: string) => calendarEn)
  addStringsLoader(chunterId, async (lang: string) => chunterEn)
  addStringsLoader(contactId, async (lang: string) => contactEn)
  addStringsLoader(documentId, async (lang: string) => documentEn)
  addStringsLoader(driveId, async (lang: string) => driveEn)
  addStringsLoader(hrId, async (lang: string) => hrEn)
  addStringsLoader(leadId, async (lang: string) => leadEn)
  addStringsLoader(loveId, async (lang: string) => loveEn)
  addStringsLoader(notificationId, async (lang: string) => notificationEn)
  addStringsLoader(preferenceId, async (lang: string) => preferenceEn)
  addStringsLoader(recruitId, async (lang: string) => recruitEn)
  addStringsLoader(settingId, async (lang: string) => settingEn)
  addStringsLoader(timeId, async (lang: string) => timeEn)
  addStringsLoader(trackerId, async (lang: string) => trackerEn)
  addStringsLoader(viewId, async (lang: string) => viewEn)
  addStringsLoader(workbenchId, async (lang: string) => workbenchEn)
}
