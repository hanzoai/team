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

import type { IamUser, ServiceAccount } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Map a raw IAM (Casdoor) user record to the {@link ServiceAccount} shape this
 * package works in. Casdoor's `owner` is the organization; a SA is disabled if
 * it is forbidden OR soft-deleted. This is the single point that reconciles the
 * IAM wire shape with our domain model — everything downstream is Casdoor-free.
 */
export function mapIamUser (u: IamUser): ServiceAccount {
  return {
    id: u.id,
    name: u.name,
    organization: u.owner,
    ...(u.displayName !== undefined ? { displayName: u.displayName } : {}),
    ...(u.agentModel !== undefined ? { agentModel: u.agentModel } : {}),
    disabled: u.isForbidden === true || u.isDeleted === true
  }
}

/**
 * True if a service-account id is a canonical UUID that can be used directly as
 * an AccountUuid in Space.members[]. IAM SA ids are UUIDs; anything else must be
 * resolved through the account service (ensurePerson) rather than trusted raw.
 */
export function isDirectAccountUuid (id: string): boolean {
  return UUID_RE.test(id)
}

/**
 * The stable social-id VALUE used to bind an IAM service-account to a workspace
 * account via accountClient.ensurePerson(SocialIdType.HANZO, value, ...).
 *
 * Deterministic and collision-free per SA (namespaced by the SA principal id),
 * so re-running the sync always resolves to the SAME account — never a duplicate.
 */
export function serviceAccountSocialValue (sa: Pick<ServiceAccount, 'id'>): string {
  return `iam:sa:${sa.id}`
}

/**
 * Split "<org>-<agent>" into first/last name parts for the workspace Person.
 * Falls back gracefully when the name has no separator.
 */
export function serviceAccountName (sa: ServiceAccount): { first: string, last: string } {
  const display = (sa.displayName ?? sa.name ?? sa.id).trim()
  const dash = display.indexOf('-')
  if (dash > 0 && dash < display.length - 1) {
    return { first: display.slice(0, dash), last: display.slice(dash + 1) }
  }
  return { first: display, last: 'bot' }
}

/**
 * Reconcile desired SA set against the current bot members of a workspace.
 * Pure: returns the ids to add and the account-uuids to deactivate. Disabled
 * SAs are removed; enabled SAs not yet present are added.
 */
export interface ReconcileInput {
  desired: ServiceAccount[]
  // account-uuid -> serviceAccountId currently represented as a bot member
  currentBySaId: Map<string, string> // serviceAccountId -> accountUuid
}

export interface ReconcilePlan {
  toAdd: ServiceAccount[]
  toRemove: string[] // accountUuids to deactivate
}

export function reconcileBotMembers (input: ReconcileInput): ReconcilePlan {
  const desiredEnabled = input.desired.filter((sa) => sa.disabled !== true)
  const desiredIds = new Set(desiredEnabled.map((sa) => sa.id))

  const toAdd = desiredEnabled.filter((sa) => !input.currentBySaId.has(sa.id))

  const toRemove: string[] = []
  for (const [saId, accountUuid] of input.currentBySaId.entries()) {
    if (!desiredIds.has(saId)) {
      toRemove.push(accountUuid)
    }
  }

  return { toAdd, toRemove }
}
