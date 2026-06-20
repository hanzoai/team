//
// Copyright © 2022 Hanzo AI Inc.
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

import core from '@hanzoteam/core'
import inventory from '@hanzoteam/inventory'
import serverInventory from '@hanzoteam/server-inventory'
import serverNotification from '@hanzoteam/server-notification'

export { serverInventoryId } from '@hanzoteam/server-inventory'

export function createModel (builder: Builder): void {
  builder.mixin(inventory.class.Product, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverInventory.function.ProductHTMLPresenter
  })

  builder.mixin(inventory.class.Product, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverInventory.function.ProductTextPresenter
  })
}
