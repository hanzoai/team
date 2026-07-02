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

import type { AccountClient } from '@hanzoteam/account-client'
import core, {
  AccountRole,
  type AccountUuid,
  buildSocialIdString,
  type MeasureContext,
  type Ref,
  SocialIdType,
  type Space,
  type TxOperations,
  type WorkspaceUuid
} from '@hanzoteam/core'
import contact, { type Employee, type ServiceAccount as ServiceAccountMixin } from '@hanzoteam/contact'
import {
  type IamClient,
  reconcileBotMembers,
  type ServiceAccount,
  serviceAccountName,
  serviceAccountSocialValue
} from '@hanzoteam/iam-client'

/**
 * Reconciles a workspace's persistent bot members against the org's IAM agent
 * service-accounts. Idempotent: safe to run on a schedule and on agent-created
 * events. Each SA maps to exactly one workspace account (deterministic social
 * value), so re-runs never create duplicates.
 */
export class BotMemberSync {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly iam: IamClient,
    private readonly account: AccountClient,
    private readonly client: TxOperations,
    private readonly workspace: WorkspaceUuid,
    private readonly organization: string
  ) {}

  /** SocialIdentity key for an SA, used to find its workspace Employee. */
  private socialKey (sa: Pick<ServiceAccount, 'id'>): string {
    return buildSocialIdString({ type: SocialIdType.HANZO, value: serviceAccountSocialValue(sa) })
  }

  /**
   * Resolve (creating if needed) the workspace account for an SA, then ensure it
   * is a workspace member and carries the ServiceAccount mixin (bot badge).
   * Returns the bound AccountUuid.
   */
  async ensureBotMember (sa: ServiceAccount): Promise<AccountUuid> {
    const { first, last } = serviceAccountName(sa)
    // 1. Global person + hanzo social id — deterministic per SA (no dupes on re-sync).
    const { uuid } = await this.account.ensurePerson(SocialIdType.HANZO, serviceAccountSocialValue(sa), first, last)
    const accountUuid = uuid as AccountUuid

    // 2. Make it a workspace member with the least-privilege User role.
    await this.account.assignWorkspace(accountUuid, this.workspace, AccountRole.User)

    // 3. Mark the resulting Employee as a bot service-account (badge + presence key).
    const social = await this.client.findOne(contact.class.SocialIdentity, { key: this.socialKey(sa) })
    if (social != null) {
      const employee = await this.client.findOne(contact.mixin.Employee, {
        _id: social.attachedTo as Ref<Employee>
      })
      const alreadyBot: boolean =
        employee != null && this.client.getHierarchy().hasMixin(employee, contact.mixin.ServiceAccount)
      if (employee != null && !alreadyBot) {
        await this.client.createMixin<Employee, ServiceAccountMixin>(
          employee._id,
          contact.mixin.Employee,
          employee.space,
          contact.mixin.ServiceAccount,
          { serviceAccountId: sa.id, organization: sa.organization, agentModel: sa.agentModel }
        )
      }
    }

    this.ctx.info('bot member ensured', { sa: sa.id, accountUuid, workspace: this.workspace })
    return accountUuid
  }

  /** Deactivate a bot member: mark the Employee inactive so it leaves pickers/presence. */
  async removeBotMember (accountUuid: AccountUuid): Promise<void> {
    const employees = await this.client.findAll(contact.mixin.Employee, { personUuid: accountUuid })
    for (const emp of employees) {
      if (emp.active === true) {
        await this.client.update(emp, { active: false })
      }
    }
    this.ctx.info('bot member removed', { accountUuid, workspace: this.workspace })
  }

  /** Current SA-id -> AccountUuid map for bot members in this workspace. */
  private async currentBotMembers (): Promise<Map<string, string>> {
    const bots = await this.client.findAll(contact.mixin.ServiceAccount, { organization: this.organization })
    const map = new Map<string, string>()
    for (const b of bots) {
      if (b.personUuid != null && b.active === true) {
        map.set(b.serviceAccountId, b.personUuid)
      }
    }
    return map
  }

  /** Full reconcile pass: add new/enabled SAs, remove disabled/deleted ones. */
  async sync (): Promise<void> {
    const desired = await this.iam.listServiceAccounts(this.organization)
    const currentBySaId = await this.currentBotMembers()
    const plan = reconcileBotMembers({ desired, currentBySaId })

    for (const sa of plan.toAdd) {
      await this.ensureBotMember(sa)
    }
    for (const accountUuid of plan.toRemove) {
      await this.removeBotMember(accountUuid as AccountUuid)
    }
    this.ctx.info('bot member sync complete', {
      workspace: this.workspace,
      added: plan.toAdd.length,
      removed: plan.toRemove.length
    })
  }

  /** Add a bot's account to a specific Space.members[] (channel membership). */
  async addToSpace (space: Ref<Space>, accountUuid: AccountUuid): Promise<void> {
    const s = await this.client.findOne(core.class.Space, { _id: space })
    if (s === undefined) return
    const members: AccountUuid[] = s.members
    if (!members.includes(accountUuid)) {
      await this.client.update(s, { $push: { members: accountUuid } })
    }
  }

  /** Remove a bot's account from a specific Space.members[]. */
  async removeFromSpace (space: Ref<Space>, accountUuid: AccountUuid): Promise<void> {
    const s = await this.client.findOne(core.class.Space, { _id: space })
    if (s === undefined) return
    const members: AccountUuid[] = s.members
    if (members.includes(accountUuid)) {
      await this.client.update(s, { $pull: { members: accountUuid } })
    }
  }
}
