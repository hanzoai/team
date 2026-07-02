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

import core, {
  AccountRole,
  type Class,
  type Doc,
  generateId,
  type MeasureContext,
  type Ref,
  type Space,
  TxOperations,
  type WorkspaceUuid
} from '@hanzoteam/core'
import { getAccountClient, getTransactorEndpoint, createClient } from '@hanzoteam/server-client'
import { generateToken, decodeToken } from '@hanzoteam/server-token'
import { KmsKeyWrapper } from '@hanzoteam/kms-client'
import { IamClient } from '@hanzoteam/iam-client'
import contact from '@hanzoteam/contact'
import slack, { signOAuthState, type SlackRouteDecision, verifyOAuthState } from '@hanzoteam/slack'
import type { AccountClient } from '@hanzoteam/account-client'

import config from './config'
import { SlackTokenStorage } from './tokens'
import { SlackRelay } from './relay'
import { exchangeCode } from './slackapi'
import { BotMemberSync } from './botmembers'

interface WsCtx {
  ops: TxOperations
  botSocialId: string
  tokens: SlackTokenStorage
  accountClient: AccountClient
  organization: string
}

export interface BotMemberInfo {
  serviceAccountId: string
  accountUuid: string
  organization: string
  name: string
  agentModel?: string
  active: boolean
}

export interface BotMemberRequest {
  serviceAccountId: string
  space?: string // optional channel to also add/remove the bot from
}

export interface MapChannelRequest {
  slackTeamId: string
  slackChannelId: string
  slackChannelName: string
  hulyChannel: string
  hulyChannelClass: string
  enabled?: boolean
}

/**
 * Orchestrates the Slack service: per-workspace transactor clients, KMS-backed
 * token storage, incoming relay, and channel mapping. Constructed once; opens
 * workspace clients lazily and caches them.
 */
export class SlackController {
  private readonly wrapper: KmsKeyWrapper
  private readonly workspaces = new Map<WorkspaceUuid, WsCtx>()

  constructor (private readonly ctx: MeasureContext) {
    this.wrapper = new KmsKeyWrapper({ url: config.KmsURL, token: config.KmsToken, keyId: config.KmsKeyId })
  }

  private serviceToken (workspace: WorkspaceUuid): string {
    return generateToken(core.systemAccountUuid ?? '', workspace, { service: config.ServiceId })
  }

  private async openWorkspace (workspace: WorkspaceUuid, organization?: string): Promise<WsCtx> {
    const cached = this.workspaces.get(workspace)
    if (cached !== undefined) return cached

    const token = this.serviceToken(workspace)
    const endpoint = await getTransactorEndpoint(token)
    const client = await createClient(endpoint, token)
    const accountClient = getAccountClient(token)
    const socialIds = await accountClient.getSocialIds()
    const botSocialId = socialIds[0]?._id
    if (botSocialId === undefined) {
      throw new Error('no social id for slack service account')
    }
    const ops = new TxOperations(client, botSocialId)
    const tokens = new SlackTokenStorage(accountClient, this.wrapper, workspace)
    const wsCtx: WsCtx = { ops, botSocialId, tokens, accountClient, organization: organization ?? '' }
    this.workspaces.set(workspace, wsCtx)
    return wsCtx
  }

  /** Organization for a request: prefer the IAM `owner` claim, else config default. */
  private orgOf (userToken: string): string {
    const decoded = decodeToken(userToken)
    return (decoded.extra?.owner as string) ?? ''
  }

  /**
   * Authorize a mutating request: the CALLER (not the service) must be a
   * Maintainer or higher in the target workspace. Uses the caller's own token
   * against the account service — never trusts a self-asserted role claim.
   * Throws on insufficient privilege; returns the workspace on success.
   */
  private async assertAdmin (userToken: string): Promise<WorkspaceUuid> {
    const { workspace } = decodeToken(userToken)
    const info = await getAccountClient(userToken).getLoginWithWorkspaceInfo()
    const role = info.workspaces?.[workspace]?.role
    const rank: Record<string, number> = {
      [AccountRole.ReadOnlyGuest]: 0,
      [AccountRole.DocGuest]: 1,
      [AccountRole.Guest]: 2,
      [AccountRole.User]: 3,
      [AccountRole.Maintainer]: 4,
      [AccountRole.Owner]: 5,
      [AccountRole.Admin]: 6
    }
    if (role == null || rank[role] < rank[AccountRole.Maintainer]) {
      throw new Error('forbidden: workspace maintainer role required')
    }
    return workspace
  }

  private botSync (ws: WsCtx, workspace: WorkspaceUuid, organization: string): BotMemberSync {
    return new BotMemberSync(this.ctx, this.getIamClient(), ws.accountClient, ws.ops, workspace, organization)
  }

  /**
   * Begin OAuth (admin-only): returns the Slack authorize URL carrying a signed
   * `state` bound to the workspace. The browser is sent here; Slack redirects
   * back to /v1/slack/oauth with code+state (no JWT), verified by state MAC.
   */
  async initiateConnect (userToken: string, scopes: string): Promise<string> {
    const workspace = await this.assertAdmin(userToken)
    const state = signOAuthState(config.Secret, workspace)
    const url = new URL('https://slack.com/oauth/v2/authorize')
    url.searchParams.set('client_id', config.SlackClientId)
    url.searchParams.set('scope', scopes)
    url.searchParams.set('redirect_uri', config.SlackRedirectUri)
    url.searchParams.set('state', state)
    return url.toString()
  }

  /**
   * OAuth callback: verify the signed `state` (CSRF + workspace binding), then
   * exchange the code and store the envelope-encrypted token. No JWT here — the
   * state MAC is the authorization proof that an admin started this flow.
   */
  async connectWorkspace (code: string, state: string): Promise<void> {
    const workspace = verifyOAuthState(config.Secret, state)
    if (workspace === undefined) {
      throw new Error('invalid or expired oauth state')
    }
    const ws = await this.openWorkspace(workspace as WorkspaceUuid)
    const token = await exchangeCode({
      clientId: config.SlackClientId,
      clientSecret: config.SlackClientSecret,
      code,
      redirectUri: config.SlackRedirectUri
    })
    await ws.tokens.save(ws.botSocialId as any, token)
    this.ctx.info('slack workspace connected', { workspace, team: token.teamId })
  }

  /** Persist a Hanzo<->Slack channel mapping (admin, IAM-authenticated). */
  async mapChannel (userToken: string, req: MapChannelRequest): Promise<void> {
    const workspace = await this.assertAdmin(userToken)
    const ws = await this.openWorkspace(workspace)
    await ws.ops.addCollection(
      slack.class.SlackChannelMapping,
      req.hulyChannel as Ref<Space>,
      req.hulyChannel as Ref<Doc>,
      req.hulyChannelClass as Ref<Class<Doc>>,
      'slackMappings',
      {
        hulyChannel: req.hulyChannel as Ref<Space>,
        hulyChannelClass: req.hulyChannelClass as Ref<Class<Doc>>,
        slackChannelId: req.slackChannelId,
        slackChannelName: req.slackChannelName,
        slackTeamId: req.slackTeamId,
        enabled: req.enabled ?? true
      },
      generateId()
    )
    this.ctx.info('slack channel mapped', { workspace, slack: req.slackChannelId, huly: req.hulyChannel })
  }

  /** Relay an inbound, verified Slack message into the mapped Hanzo channel. */
  async relayIncoming (decision: Extract<SlackRouteDecision, { kind: 'relay' }>): Promise<void> {
    // Resolve which workspace owns this Slack team by scanning connected teams.
    // (One team maps to one workspace via the stored integration.)
    for (const [workspace, ws] of this.workspaces.entries()) {
      const relay = new SlackRelay(this.ctx, ws.ops, ws.botSocialId as any)
      const posted = await relay.relayIncoming({
        teamId: decision.teamId,
        slackChannelId: decision.slackChannelId,
        slackUserId: decision.slackUserId,
        text: decision.text
      })
      if (posted !== undefined) {
        this.ctx.info('slack relay posted', { workspace })
        return
      }
    }
  }

  // --- Bot-member admin surface (IAM-authenticated) ---

  /** List the persistent bot members of the caller's workspace. */
  async listBotMembers (userToken: string): Promise<BotMemberInfo[]> {
    const { workspace } = decodeToken(userToken)
    const org = this.orgOf(userToken)
    const ws = await this.openWorkspace(workspace, org)
    const bots = await ws.ops.findAll(contact.mixin.ServiceAccount, {})
    return bots.map((b) => ({
      serviceAccountId: b.serviceAccountId,
      accountUuid: String(b.personUuid ?? ''),
      organization: b.organization,
      name: b.name,
      agentModel: b.agentModel,
      active: b.active
    }))
  }

  /** Reconcile the workspace's bot members against the org's IAM service-accounts. */
  async syncBotMembers (userToken: string): Promise<void> {
    const workspace = await this.assertAdmin(userToken)
    const org = this.orgOf(userToken)
    const ws = await this.openWorkspace(workspace, org)
    await this.botSync(ws, workspace, org).sync()
  }

  /** Add a single bot (by IAM service-account id) as a member; optionally to a channel. */
  async addBotMember (userToken: string, req: BotMemberRequest): Promise<void> {
    const workspace = await this.assertAdmin(userToken)
    const org = this.orgOf(userToken)
    const ws = await this.openWorkspace(workspace, org)
    const sync = this.botSync(ws, workspace, org)
    const sas = await this.getIamClient().listServiceAccounts(org)
    const sa = sas.find((s) => s.id === req.serviceAccountId)
    if (sa === undefined) {
      throw new Error(`service account not found: ${req.serviceAccountId}`)
    }
    const accountUuid = await sync.ensureBotMember(sa)
    if (req.space !== undefined) {
      await sync.addToSpace(req.space as Ref<Space>, accountUuid)
    }
  }

  /** Remove a bot member (deactivate); optionally just from one channel. */
  async removeBotMember (userToken: string, req: BotMemberRequest): Promise<void> {
    const workspace = await this.assertAdmin(userToken)
    const org = this.orgOf(userToken)
    const ws = await this.openWorkspace(workspace, org)
    const bot = await ws.ops.findOne(contact.mixin.ServiceAccount, { serviceAccountId: req.serviceAccountId })
    if (bot?.personUuid == null) return
    const sync = this.botSync(ws, workspace, org)
    if (req.space !== undefined) {
      await sync.removeFromSpace(req.space as Ref<Space>, bot.personUuid)
    } else {
      await sync.removeBotMember(bot.personUuid)
    }
  }

  getIamClient (): IamClient {
    return new IamClient({ url: config.IamURL, token: config.IamToken })
  }

  async close (): Promise<void> {
    this.workspaces.clear()
  }
}
