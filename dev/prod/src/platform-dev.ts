//
// Copyright © 2020 Hanzo <dev@hanzo.ai>.
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

import { devModelId } from '@hanzo/devmodel'
import { PresentationClientHook } from '@hanzo/devmodel-resources'
import login from '@hanzo/login'
import { addLocation, setMetadata } from '@hanzo/platform'
import presentation from '@hanzo/presentation'

export function configurePlatformDevServer() {  
  // Set devmodel to hook client to be able to present all activity
  enableDevModel()
}

function enableDevModel() {
  setMetadata(presentation.metadata.ClientHook, new PresentationClientHook())
  addLocation(devModelId, () => import(/* webpackChunkName: "devmodel" */ '@hanzo/devmodel-resources'))
}
