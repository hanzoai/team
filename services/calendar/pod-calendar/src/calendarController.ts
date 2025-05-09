//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Event } from '@hanzo/calendar'
import {
  PersonId,
  PersonUuid,
  RateLimiter,
  WorkspaceUuid,
  isActiveMode,
  isDeletingMode,
  parseSocialIdString,
  systemAccountUuid
} from '@hanzo/core'
import { generateToken } from '@hanzo/server-token'
import { Collection, type Db } from 'mongodb'
import { type CalendarClient } from './calendar'
import config from './config'
import { type Token, type User } from './types'
import { WorkspaceClient } from './workspaceClient'
import { getAccountClient } from '@hanzo/server-client'

export class CalendarController {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient | Promise<WorkspaceClient>> = new Map<
  WorkspaceUuid,
  WorkspaceClient | Promise<WorkspaceClient>
  >()

  private readonly tokens: Collection<Token>

  protected static _instance: CalendarController

  private constructor (private readonly mongo: Db) {
    this.tokens = mongo.collection<Token>('tokens')
    CalendarController._instance = this
    setInterval(() => {
      if (this.workspaces.size > 0) {
        console.log('active workspaces', this.workspaces.size)
      }
    }, 60000)
  }

  static getCalendarController (mongo?: Db): CalendarController {
    if (CalendarController._instance !== undefined) {
      return CalendarController._instance
    }
    if (mongo === undefined) throw new Error('CalendarController not exist')
    return new CalendarController(mongo)
  }

  async startAll (): Promise<void> {
    const tokens = await this.tokens.find().toArray()
    const groups = new Map<WorkspaceUuid, Token[]>()
    console.log('start calendar service', tokens.length)
    for (const token of tokens) {
      const group = groups.get(token.workspace)
      if (group === undefined) {
        groups.set(token.workspace, [token])
      } else {
        group.push(token)
        groups.set(token.workspace, group)
      }
    }

    const limiter = new RateLimiter(config.InitLimit)
    const token = generateToken(systemAccountUuid)
    const ids = [...groups.keys()]
    console.log('start workspaces', ids)
    const infos = await getAccountClient(token).getWorkspacesInfo(ids)
    console.log('infos', infos)
    for (const info of infos) {
      const tokens = groups.get(info.uuid)
      if (tokens === undefined) {
        console.log('no tokens for workspace', info.uuid)
        continue
      }
      if (isDeletingMode(info.mode)) {
        if (tokens !== undefined) {
          for (const token of tokens) {
            await this.tokens.deleteOne({ userId: token.userId, workspace: token.workspace })
          }
        }
        continue
      }
      if (!isActiveMode(info.mode)) {
        continue
      }
      await limiter.add(async () => {
        console.log('start workspace', info.uuid)
        const workspace = await this.startWorkspace(info.uuid, tokens)
        await workspace.sync()
      })
    }
  }

  async startWorkspace (workspace: WorkspaceUuid, tokens: Token[]): Promise<WorkspaceClient> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    for (const token of tokens) {
      try {
        const timeout = setTimeout(() => {
          console.warn('init client hang', token.workspace, token.userId)
        }, 60000)
        console.log('init client', token.workspace, token.userId)
        await workspaceClient.createCalendarClient(token)
        clearTimeout(timeout)
      } catch (err) {
        console.error(`Couldn't create client for ${workspace} ${token.userId}`)
      }
    }
    return workspaceClient
  }

  async push (personId: PersonId, mode: 'events' | 'calendar', calendarId?: string): Promise<void> {
    const email = parseSocialIdString(personId).value
    const tokens = await this.tokens.find({ email, access_token: { $exists: true } }).toArray()
    const token = generateToken(systemAccountUuid)
    const workspaces = [...new Set(tokens.map((p) => p.workspace))]
    const infos = await getAccountClient(token).getWorkspacesInfo(workspaces)
    for (const token of tokens) {
      const info = infos.find((p) => p.uuid === token.workspace)
      if (info === undefined) {
        continue
      }
      if (isDeletingMode(info.mode)) {
        await this.tokens.deleteOne({ userId: token.userId, workspace: token.workspace })
        continue
      }
      if (!isActiveMode(info.mode)) {
        continue
      }
      const workspace = await this.getWorkspaceClient(token.workspace)
      const calendarClient = await workspace.createCalendarClient(token)
      if (mode === 'calendar') {
        await calendarClient.syncCalendars()
      }
      if (mode === 'events' && calendarId !== undefined) {
        await calendarClient.sync(calendarId)
      }
    }
  }

  async pushEvent (workspace: WorkspaceUuid, event: Event, type: 'create' | 'update' | 'delete'): Promise<void> {
    const workspaceController = await this.getWorkspaceClient(workspace)
    await workspaceController.pushEvent(event, type)
  }

  async getUserId (account: PersonUuid, workspace: WorkspaceUuid): Promise<PersonId> {
    const workspaceClient = await this.getWorkspaceClient(workspace)

    return await workspaceClient.getUserId(account)
  }

  async signout (workspace: WorkspaceUuid, value: PersonId): Promise<void> {
    const workspaceClient = await this.getWorkspaceClient(workspace)
    const clients = await workspaceClient.signout(value)
    if (clients === 0) {
      this.removeWorkspace(workspace)
    }
  }

  removeWorkspace (workspace: WorkspaceUuid): void {
    this.workspaces.delete(workspace)
  }

  async close (): Promise<void> {
    for (let workspace of this.workspaces.values()) {
      if (workspace instanceof Promise) {
        workspace = await workspace
      }
      await workspace.close()
    }
    this.workspaces.clear()
  }

  async createClient (user: Token): Promise<CalendarClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.createCalendarClient(user)
    return newClient
  }

  async newClient (user: User, code: string): Promise<CalendarClient> {
    const workspace = await this.getWorkspaceClient(user.workspace)
    const newClient = await workspace.newCalendarClient(user, code)
    return newClient
  }

  private async getWorkspaceClient (workspace: WorkspaceUuid): Promise<WorkspaceClient> {
    const res = this.workspaces.get(workspace)
    if (res !== undefined) {
      if (res instanceof Promise) {
        return await res
      }
      return res
    }
    try {
      const client = WorkspaceClient.create(this.mongo, workspace, this)
      this.workspaces.set(workspace, client)
      const res = await client
      this.workspaces.set(workspace, res)
      return res
    } catch (err) {
      console.error(`Couldn't create workspace worker for ${workspace}, reason: ${JSON.stringify(err)}`)
      throw err
    }
  }
}
