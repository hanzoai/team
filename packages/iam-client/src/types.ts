//
// Copyright © 2025 Hanzo AI Inc.
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

/**
 * A Hanzo IAM agent service-account, as returned by
 *   GET /v1/iam/service-accounts?organization=<org>
 *
 * The `id` is the SA principal id and is treated as the AccountUuid source for
 * representing the bot as a persistent team member. `name` follows <org>-<agent>.
 */
export interface ServiceAccount {
  id: string
  name: string
  organization: string
  displayName?: string
  agentModel?: string
  disabled?: boolean
}

/**
 * A raw IAM (Casdoor) user record for a service-account principal, as it appears
 * inside the {@link IamEnvelope} `data` array. Field names are Casdoor's own:
 * `owner` is the organization, `isForbidden`/`isDeleted` are the disable flags.
 * `accessKey`/`accessSecret` are masked by the server and never consumed here.
 */
export interface IamUser {
  id: string
  name: string
  owner: string
  type: string
  displayName?: string
  agentModel?: string
  isForbidden?: boolean
  isDeleted?: boolean
}

/**
 * The canonical Casdoor response envelope. `GET /v1/iam/service-accounts`
 * returns the SA list directly in `data` (there is no `{serviceAccounts}` key).
 */
export interface IamEnvelope<T> {
  status: 'ok' | 'error'
  msg?: string
  data: T
  data2?: unknown
}
