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

import { type Client } from '@hanzo/core'
import { getTransactorEndpoint } from '@hanzo/server-client'
import { createClient } from '@hanzo/server-client/src'

export async function getClient (token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  return await createClient(endpoint, token)
}
