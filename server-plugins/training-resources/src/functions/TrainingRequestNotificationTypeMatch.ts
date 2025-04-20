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

import { Person, type Employee } from '@hanzo/contact'
import { type PersonId, type Ref, type TxCUD } from '@hanzo/core'
import type { NotificationType } from '@hanzo/notification'
import type { TriggerControl } from '@hanzo/server-core'
import type { TrainingRequest } from '@hanzo/training'
import { isTxCreateDoc } from '../utils/isTxCreateDoc'
import { isTxUpdateDoc } from '../utils/isTxUpdateDoc'

export function TrainingRequestNotificationTypeMatch (
  tx: TxCUD<TrainingRequest>,
  doc: TrainingRequest,
  person: Ref<Person>,
  user: PersonId[],
  type: NotificationType,
  control: TriggerControl
): boolean {
  if (isTxCreateDoc(tx)) {
    return doc.trainees.includes(person as Ref<Employee>)
  }

  if (isTxUpdateDoc(tx)) {
    const pushed = tx.operations.$push?.trainees
    if (pushed === undefined) {
      return false
    }

    const newTrainees = typeof pushed === 'object' ? pushed.$each : [pushed]
    return newTrainees.includes(person as Ref<Employee>)
  }

  return false
}
