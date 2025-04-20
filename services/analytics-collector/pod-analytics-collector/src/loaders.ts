//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { analyticsCollectorId } from '@hanzo/analytics-collector'
import { calendarId } from '@hanzo/calendar'
import { chunterId } from '@hanzo/chunter'
import { contactId } from '@hanzo/contact'
import { coreId } from '@hanzo/core'
import { documentId } from '@hanzo/document'
import { driveId } from '@hanzo/drive'
import { hrId } from '@hanzo/hr'
import { leadId } from '@hanzo/lead'
import { loveId } from '@hanzo/love'
import { notificationId } from '@hanzo/notification'
import { preferenceId } from '@hanzo/preference'
import { recruitId } from '@hanzo/recruit'
import { settingId } from '@hanzo/setting'
import { timeId } from '@hanzo/time'
import { trackerId } from '@hanzo/tracker'
import { viewId } from '@hanzo/view'
import { workbenchId } from '@hanzo/workbench'

import analyticsCollectorEn from '@hanzo/analytics-collector-assets/lang/en.json'
import calendarEn from '@hanzo/calendar-assets/lang/en.json'
import chunterEn from '@hanzo/chunter-assets/lang/en.json'
import contactEn from '@hanzo/contact-assets/lang/en.json'
import coreEng from '@hanzo/core/lang/en.json'
import documentEn from '@hanzo/document-assets/lang/en.json'
import driveEn from '@hanzo/drive-assets/lang/en.json'
import hrEn from '@hanzo/hr-assets/lang/en.json'
import leadEn from '@hanzo/lead-assets/lang/en.json'
import loveEn from '@hanzo/love-assets/lang/en.json'
import notificationEn from '@hanzo/notification-assets/lang/en.json'
import platformEng from '@hanzo/platform/lang/en.json'
import preferenceEn from '@hanzo/preference-assets/lang/en.json'
import recruitEn from '@hanzo/recruit-assets/lang/en.json'
import settingEn from '@hanzo/setting-assets/lang/en.json'
import timeEn from '@hanzo/time-assets/lang/en.json'
import trackerEn from '@hanzo/tracker-assets/lang/en.json'
import viewEn from '@hanzo/view-assets/lang/en.json'
import workbenchEn from '@hanzo/workbench-assets/lang/en.json'

import { addStringsLoader, platformId } from '@hanzo/platform'

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
