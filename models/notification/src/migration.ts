//
// Copyright © 2022 Hardcore Engineering Inc.
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

import chunter from '@hanzo/chunter'
import contact, { type PersonSpace } from '@hanzo/contact'
import core, {
  DOMAIN_TX,
  MeasureMetricsContext,
  type PersonId,
  type Class,
  type Doc,
  type DocumentQuery,
  type Ref,
  type Space,
  type AccountUuid
} from '@hanzo/core'
import {
  migrateSpace,
  type MigrateUpdate,
  type MigrationDocumentQuery,
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hanzo/model'
import notification, {
  notificationId,
  type BrowserNotification,
  type DocNotifyContext,
  type InboxNotification
} from '@hanzo/notification'
import { DOMAIN_PREFERENCE } from '@hanzo/preference'

import {
  DOMAIN_SPACE,
  getSocialKeyByOldAccount,
  getUniqueAccounts,
  getAccountUuidBySocialKey,
  getAccountUuidByOldAccount,
  getUniqueAccountsFromOldAccounts,
  getSocialIdBySocialKey,
  getSocialIdFromOldAccount
} from '@hanzo/model-core'
import { DOMAIN_DOC_NOTIFY, DOMAIN_NOTIFICATION, DOMAIN_USER_NOTIFY } from './index'

export async function removeNotifications (
  client: MigrationClient,
  query: DocumentQuery<DocNotifyContext>
): Promise<void> {
  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.DocNotifyContext,
        ...query
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      return
    }

    const ids = contexts.map(({ _id }) => _id)

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.CommonInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.ActivityInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.MentionInboxNotification,
      docNotifyContext: { $in: ids }
    })

    await client.deleteMany(DOMAIN_NOTIFICATION, {
      _class: notification.class.DocNotifyContext,
      _id: { $in: ids }
    })
  }
}

export async function migrateNotificationsSpace (client: MigrationClient): Promise<void> {
  const personSpaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace }, {})

  await client.update(
    DOMAIN_DOC_NOTIFY,
    {
      _class: notification.class.DocNotifyContext,
      objectSpace: { $exists: false }
    },
    { $rename: { space: 'objectSpace' } }
  )

  for (const space of personSpaces) {
    await client.update(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.ActivityInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.CommonInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
    await client.update(
      DOMAIN_NOTIFICATION,
      {
        _class: notification.class.MentionInboxNotification,
        user: { $in: space.members }
      },
      { space: space._id }
    )
  }

  await client.deleteMany(DOMAIN_DOC_NOTIFY, { space: { $nin: personSpaces.map(({ _id }) => _id) } })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.ActivityInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.CommonInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })
  await client.deleteMany(DOMAIN_NOTIFICATION, {
    _class: notification.class.MentionInboxNotification,
    space: { $nin: personSpaces.map(({ _id }) => _id) }
  })

  while (true) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        attachedTo: { $exists: true }
      },
      { limit: 500 }
    )

    if (contexts.length === 0) {
      break
    }

    const classesOfSpace = new Set<Ref<Class<Doc>>>()

    for (const context of contexts) {
      const _class = (context as any).attachedToClass
      if (client.hierarchy.isDerived(_class, core.class.Space)) {
        classesOfSpace.add(_class)
      }
    }
    if (classesOfSpace.size > 0) {
      await client.update<DocNotifyContext>(
        DOMAIN_DOC_NOTIFY,
        { objectClass: { $in: Array.from(classesOfSpace) } },
        { objectSpace: core.space.Space }
      )
      await client.update<DocNotifyContext>(
        DOMAIN_DOC_NOTIFY,
        { objectClass: { $in: Array.from(classesOfSpace) } },
        { $rename: { attachedTo: 'objectId', attachedToClass: 'objectClass' } }
      )
    }
    await client.update(
      DOMAIN_DOC_NOTIFY,
      {
        _class: notification.class.DocNotifyContext,
        _id: { $in: contexts.map(({ _id }) => _id) }
      },
      { $rename: { attachedTo: 'objectId', attachedToClass: 'objectClass' } }
    )
  }

  await client.deleteMany(DOMAIN_NOTIFICATION, { _class: notification.class.BrowserNotification })
  await client.deleteMany(DOMAIN_USER_NOTIFY, { _class: notification.class.BrowserNotification })
}

export async function migrateDuplicateContexts (client: MigrationClient): Promise<void> {
  const personSpaces = await client.find<PersonSpace>(DOMAIN_SPACE, { _class: contact.class.PersonSpace }, {})

  for (const space of personSpaces) {
    const contexts = await client.find<DocNotifyContext>(
      DOMAIN_DOC_NOTIFY,
      { _class: notification.class.DocNotifyContext, space: space._id },
      {}
    )
    const toRemove = new Set<Ref<DocNotifyContext>>()
    const contextByUser = new Map<string, DocNotifyContext>()

    for (const context of contexts) {
      const key = context.objectId + '.' + context.user
      const existContext = contextByUser.get(key)

      if (existContext != null) {
        const existLastViewedTimestamp = existContext.lastViewedTimestamp ?? 0
        const newLastViewedTimestamp = context.lastViewedTimestamp ?? 0
        if (existLastViewedTimestamp > newLastViewedTimestamp) {
          toRemove.add(context._id)
        } else {
          toRemove.add(existContext._id)
          contextByUser.set(key, context)
        }
      } else {
        contextByUser.set(key, context)
      }
    }
    if (toRemove.size > 0) {
      await client.deleteMany(DOMAIN_DOC_NOTIFY, { _id: { $in: Array.from(toRemove) } })
      await client.deleteMany(DOMAIN_NOTIFICATION, { docNotifyContext: { $in: Array.from(toRemove) } })
    }
  }
}

/**
 * Migrates old accounts to new accounts/social ids.
 * Should be applied to prodcution directly without applying migrateSocialIdsToAccountUuids
 * @param client
 * @returns
 */
async function migrateAccounts (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('notification migrateAccounts', {})
  const hierarchy = client.hierarchy
  const socialKeyByAccount = await getSocialKeyByOldAccount(client)
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  const socialIdByOldAccount = new Map<string, PersonId | null>()
  const accountUuidByOldAccount = new Map<string, AccountUuid | null>()

  ctx.info('processing collaborators ', {})
  for (const domain of client.hierarchy.domains()) {
    ctx.info('processing domain ', { domain })
    let processed = 0
    const iterator = await client.traverse(domain, {})

    try {
      while (true) {
        const docs = await iterator.next(200)
        if (docs === null || docs.length === 0) {
          break
        }

        const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

        for (const doc of docs) {
          const mixin = hierarchy.as(doc, notification.mixin.Collaborators)
          const oldCollaborators = mixin.collaborators

          if (oldCollaborators === undefined || oldCollaborators.length === 0) continue

          const newCollaborators = await getUniqueAccountsFromOldAccounts(
            client,
            oldCollaborators,
            socialKeyByAccount,
            accountUuidByOldAccount
          )

          operations.push({
            filter: { _id: doc._id },
            update: {
              [`${notification.mixin.Collaborators}`]: {
                collaborators: newCollaborators
              }
            }
          })
        }

        if (operations.length > 0) {
          await client.bulk(domain, operations)
        }

        processed += docs.length
        ctx.info('...processed', { count: processed })
      }

      ctx.info('finished processing domain ', { domain, processed })
    } finally {
      await iterator.close()
    }
  }
  ctx.info('finished processing collaborators ', {})

  ctx.info('processing notifications fields ', {})
  function chunkArray<T> (array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []
  const groupByUser = await client.groupBy<any, Doc>(DOMAIN_NOTIFICATION, 'user', {
    _class: {
      $in: [
        notification.class.DocNotifyContext,
        notification.class.BrowserNotification,
        notification.class.PushSubscription,
        notification.class.InboxNotification,
        notification.class.ActivityInboxNotification,
        notification.class.CommonInboxNotification
      ]
    }
  })

  for (const oldAccId of groupByUser.keys()) {
    if (oldAccId == null) continue
    const newAccId = await getAccountUuidByOldAccount(client, oldAccId, socialKeyByAccount, accountUuidByOldAccount)
    if (newAccId == null || oldAccId === newAccId) continue

    operations.push({
      filter: {
        user: oldAccId,
        _class: {
          $in: [
            notification.class.DocNotifyContext,
            notification.class.BrowserNotification,
            notification.class.PushSubscription,
            notification.class.InboxNotification,
            notification.class.ActivityInboxNotification,
            notification.class.CommonInboxNotification
          ]
        }
      },
      update: {
        user: newAccId
      }
    })
  }

  const groupBySenderId = await client.groupBy<any, Doc>(DOMAIN_NOTIFICATION, 'senderId', {
    _class: notification.class.BrowserNotification
  })

  for (const oldAccId of groupBySenderId.keys()) {
    if (oldAccId == null) continue
    const socialId = await getSocialIdFromOldAccount(
      client,
      oldAccId,
      socialKeyByAccount,
      socialIdBySocialKey,
      socialIdByOldAccount
    )
    if (socialId == null || oldAccId === socialId) continue

    operations.push({
      filter: {
        senderId: oldAccId,
        _class: notification.class.BrowserNotification
      },
      update: {
        senderId: socialId
      }
    })
  }

  if (operations.length > 0) {
    const operationsChunks = chunkArray(operations, 40)
    let processed = 0
    for (const operationsChunk of operationsChunks) {
      if (operationsChunk.length === 0) continue

      await client.bulk(DOMAIN_NOTIFICATION, operationsChunk)
      processed++
      if (operationsChunks.length > 1) {
        ctx.info('processed chunk', { processed, of: operationsChunks.length })
      }
    }
  } else {
    ctx.info('no user accounts to migrate')
  }

  ctx.info('finished processing notifications fields ', {})

  ctx.info('processing doc notify contexts ', {})
  const dncIterator = await client.traverse<DocNotifyContext>(DOMAIN_DOC_NOTIFY, {
    _class: notification.class.DocNotifyContext
  })
  try {
    let processed = 0
    while (true) {
      const docs = await dncIterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: {
        filter: MigrationDocumentQuery<DocNotifyContext>
        update: MigrateUpdate<DocNotifyContext>
      }[] = []

      for (const doc of docs) {
        const oldUser: any = doc.user
        const newUser = await getAccountUuidByOldAccount(client, oldUser, socialKeyByAccount, accountUuidByOldAccount)

        if (newUser != null && newUser !== oldUser) {
          operations.push({
            filter: { _id: doc._id },
            update: {
              user: newUser
            }
          })
        }
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_DOC_NOTIFY, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await dncIterator.close()
  }
  ctx.info('finished processing doc notify contexts ', {})
}

/**
 * Migrates social ids to new accounts where needed.
 * Should only be applied to staging where old accounts have already been migrated to social ids.
 * REMOVE IT BEFORE MERGING TO PRODUCTION
 * @param client
 * @returns
 */
async function migrateSocialIdsToAccountUuids (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('notification migrateSocialIdsToAccountUuids', {})
  const hierarchy = client.hierarchy
  const accountUuidBySocialKey = new Map<string, AccountUuid | null>()

  ctx.info('processing collaborators ', {})
  for (const domain of client.hierarchy.domains()) {
    ctx.info('processing domain ', { domain })
    let processed = 0
    const iterator = await client.traverse(domain, {})

    try {
      while (true) {
        const docs = await iterator.next(200)
        if (docs === null || docs.length === 0) {
          break
        }

        const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []

        for (const doc of docs) {
          const mixin = hierarchy.as(doc, notification.mixin.Collaborators)
          const oldCollaborators = mixin.collaborators as unknown as PersonId[]

          if (oldCollaborators === undefined || oldCollaborators.length === 0) continue

          const newCollaborators = await getUniqueAccounts(client, oldCollaborators, accountUuidBySocialKey)

          operations.push({
            filter: { _id: doc._id },
            update: {
              [`${notification.mixin.Collaborators}`]: {
                collaborators: newCollaborators
              }
            }
          })
        }

        if (operations.length > 0) {
          await client.bulk(domain, operations)
        }

        processed += docs.length
        ctx.info('...processed', { count: processed })
      }

      ctx.info('finished processing domain ', { domain, processed })
    } finally {
      await iterator.close()
    }
  }
  ctx.info('finished processing collaborators ', {})

  ctx.info('processing notifications fields ', {})
  function chunkArray<T> (array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []
  const groupByUser = await client.groupBy<PersonId, Doc>(DOMAIN_NOTIFICATION, 'user', {
    _class: {
      $in: [
        notification.class.DocNotifyContext,
        notification.class.BrowserNotification,
        notification.class.PushSubscription,
        notification.class.InboxNotification,
        notification.class.ActivityInboxNotification,
        notification.class.CommonInboxNotification
      ]
    }
  })

  for (const socialId of groupByUser.keys()) {
    if (socialId == null) continue
    const account = await getAccountUuidBySocialKey(client, socialId, accountUuidBySocialKey)

    if (account == null || (account as unknown as PersonId) === socialId) continue

    operations.push({
      filter: {
        user: socialId,
        _class: {
          $in: [
            notification.class.DocNotifyContext,
            notification.class.BrowserNotification,
            notification.class.PushSubscription,
            notification.class.InboxNotification,
            notification.class.ActivityInboxNotification,
            notification.class.CommonInboxNotification
          ]
        }
      },
      update: {
        user: account
      }
    })
  }

  if (operations.length > 0) {
    const operationsChunks = chunkArray(operations, 40)
    let processed = 0
    for (const operationsChunk of operationsChunks) {
      if (operationsChunk.length === 0) continue

      await client.bulk(DOMAIN_NOTIFICATION, operationsChunk)
      processed++
      if (operationsChunks.length > 1) {
        ctx.info('processed chunk', { processed, of: operationsChunks.length })
      }
    }
  } else {
    ctx.info('no user social ids to migrate')
  }

  ctx.info('finished processing notifications fields ', {})

  ctx.info('processing doc notify contexts ', {})
  // If there's more than one DNC for a user it's not a problem.
  // We'll migrate all of them but only one will be used going further.
  // Also, it's only possible on front so we don't need to worry about it.
  const dncIterator = await client.traverse<DocNotifyContext>(DOMAIN_DOC_NOTIFY, {
    _class: notification.class.DocNotifyContext
  })
  try {
    let processed = 0
    while (true) {
      const docs = await dncIterator.next(200)
      if (docs === null || docs.length === 0) {
        break
      }

      const operations: {
        filter: MigrationDocumentQuery<DocNotifyContext>
        update: MigrateUpdate<DocNotifyContext>
      }[] = []

      for (const doc of docs) {
        const oldUser: any = doc.user
        const newUser = await getAccountUuidBySocialKey(client, oldUser, accountUuidBySocialKey)

        if (newUser != null && newUser !== oldUser) {
          operations.push({
            filter: { _id: doc._id },
            update: {
              user: newUser
            }
          })
        }
      }

      if (operations.length > 0) {
        await client.bulk(DOMAIN_DOC_NOTIFY, operations)
      }

      processed += docs.length
      ctx.info('...processed', { count: processed })
    }
  } finally {
    await dncIterator.close()
  }
  ctx.info('finished processing doc notify contexts ', {})
}

async function migrateSocialKeysToSocialIds (client: MigrationClient): Promise<void> {
  const ctx = new MeasureMetricsContext('notification migrateSocialKeysToSocialIds', {})
  ctx.info('processing browser notifications sender ids ', {})
  const socialIdBySocialKey = new Map<string, PersonId | null>()
  function chunkArray<T> (array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  const operations: { filter: MigrationDocumentQuery<Doc>, update: MigrateUpdate<Doc> }[] = []
  const groupBySenderId = await client.groupBy<any, Doc>(DOMAIN_NOTIFICATION, 'senderId', {
    _class: notification.class.BrowserNotification
  })

  for (const socialKey of groupBySenderId.keys()) {
    if (socialKey == null) continue
    const socialId = (await getSocialIdBySocialKey(client, socialKey, socialIdBySocialKey)) ?? socialKey
    if (socialId == null || socialKey === socialId) continue

    operations.push({
      filter: {
        senderId: socialKey,
        _class: notification.class.BrowserNotification
      },
      update: {
        senderId: socialId
      }
    })
  }

  if (operations.length > 0) {
    const operationsChunks = chunkArray(operations, 40)
    let processed = 0
    for (const operationsChunk of operationsChunks) {
      if (operationsChunk.length === 0) continue

      await client.bulk(DOMAIN_NOTIFICATION, operationsChunk)
      processed++
      if (operationsChunks.length > 1) {
        ctx.info('processed chunk', { processed, of: operationsChunks.length })
      }
    }
  } else {
    ctx.info('no social keys to migrate')
  }

  ctx.info('finished processing browser notifications sender ids ', {})
}

export async function migrateSettings (client: MigrationClient): Promise<void> {
  await client.update(
    DOMAIN_PREFERENCE,
    {
      _class: 'notification:class:NotificationSetting' as Ref<Class<Doc>>,
      attachedTo: 'notification:providers:BrowserNotification' as Ref<Doc>
    },
    {
      _class: notification.class.NotificationTypeSetting,
      attachedTo: notification.providers.PushNotificationProvider
    }
  )

  await client.update(
    DOMAIN_PREFERENCE,
    {
      _class: 'notification:class:NotificationSetting' as Ref<Class<Doc>>,
      attachedTo: 'notification:providers:PlatformNotification' as Ref<Doc>
    },
    {
      _class: notification.class.NotificationTypeSetting,
      attachedTo: notification.providers.InboxNotificationProvider
    }
  )
}

export async function migrateNotificationsObject (client: MigrationClient): Promise<void> {
  while (true) {
    const notifications = await client.find<InboxNotification>(
      DOMAIN_NOTIFICATION,
      { objectId: { $exists: false }, docNotifyContext: { $exists: true } },
      { limit: 500 }
    )

    if (notifications.length === 0) return

    const contextIds = Array.from(new Set(notifications.map((n) => n.docNotifyContext)))
    const contexts = await client.find<DocNotifyContext>(DOMAIN_DOC_NOTIFY, { _id: { $in: contextIds } })

    for (const context of contexts) {
      await client.update(
        DOMAIN_NOTIFICATION,
        { docNotifyContext: context._id, objectId: { $exists: false } },
        { objectId: context.objectId, objectClass: context.objectClass }
      )
    }

    const toDelete: Ref<InboxNotification>[] = []

    for (const notification of notifications) {
      const context = contexts.find((c) => c._id === notification.docNotifyContext)

      if (context === undefined) {
        toDelete.push(notification._id)
      }
    }

    if (toDelete.length > 0) {
      await client.deleteMany(DOMAIN_NOTIFICATION, { _id: { $in: toDelete } })
    }
  }
}

export const notificationOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {
    await tryMigrate(mode, client, notificationId, [
      {
        state: 'delete-hidden-notifications',
        mode: 'upgrade',
        func: async (client) => {
          await removeNotifications(client, { hidden: true })
        }
      },
      {
        state: 'delete-invalid-notifications',
        mode: 'upgrade',
        func: async (client) => {
          await removeNotifications(client, { attachedToClass: 'chunter:class:Comment' as Ref<Class<Doc>> })
        }
      },
      {
        state: 'remove-old-classes',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
          await client.deleteMany(DOMAIN_TX, { objectClass: 'notification:class:DocUpdates' as Ref<Class<Doc>> })
        }
      },
      {
        state: 'removeDeprecatedSpace',
        mode: 'upgrade',
        func: async (client: MigrationClient) => {
          await migrateSpace(client, 'notification:space:Notifications' as Ref<Space>, core.space.Workspace, [
            DOMAIN_NOTIFICATION
          ])
        }
      },
      {
        state: 'migrate-setting',
        mode: 'upgrade',
        func: migrateSettings
      },
      {
        state: 'move-doc-notify',
        mode: 'upgrade',
        func: async (client) => {
          await client.move(DOMAIN_NOTIFICATION, { _class: notification.class.DocNotifyContext }, DOMAIN_DOC_NOTIFY)
        }
      },
      {
        state: 'remove-last-view',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:LastView' as any })
        }
      },
      {
        state: 'remove-notification',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:Notification' as any })
        }
      },
      {
        state: 'remove-email-notification',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_NOTIFICATION, { _class: 'notification:class:EmailNotification' as any })
        }
      },
      {
        state: 'move-user',
        mode: 'upgrade',
        func: async (client) => {
          await client.move(
            DOMAIN_NOTIFICATION,
            { _class: { $in: [notification.class.BrowserNotification, notification.class.PushSubscription] } },
            DOMAIN_USER_NOTIFY
          )
        }
      },
      {
        state: 'fill-notification-archived-field-v1',
        mode: 'upgrade',
        func: async (client) => {
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.ActivityInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.CommonInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
          await client.update<InboxNotification>(
            DOMAIN_NOTIFICATION,
            { _class: notification.class.MentionInboxNotification, archived: { $exists: false } },
            { archived: false }
          )
        }
      },
      {
        state: 'fill-contexts-pinned-field-v1',
        mode: 'upgrade',
        func: async (client) => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, isPinned: { $exists: false } },
            { isPinned: false }
          )
        }
      },
      {
        state: 'migrate-notifications-space-v1',
        mode: 'upgrade',
        func: migrateNotificationsSpace
      },
      {
        state: 'migrate-employee-space-v1',
        mode: 'upgrade',
        func: async () => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectSpace: 'contact:space:Employee' as Ref<Space> },
            { objectSpace: contact.space.Contacts }
          )
        }
      },
      {
        state: 'migrate-wrong-spaces-v1',
        mode: 'upgrade',
        func: async () => {
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: chunter.class.DirectMessage },
            { objectSpace: core.space.Space }
          )
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: chunter.class.Channel },
            { objectSpace: core.space.Space }
          )
          await client.update<DocNotifyContext>(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, objectClass: 'recruit:class:Vacancy' as any },
            { objectSpace: core.space.Space }
          )
        }
      },
      {
        state: 'migrate-duplicated-contexts-v4',
        mode: 'upgrade',
        func: migrateDuplicateContexts
      },
      {
        state: 'set-default-hidden',
        mode: 'upgrade',
        func: async () => {
          await client.update(
            DOMAIN_DOC_NOTIFY,
            { _class: notification.class.DocNotifyContext, hidden: { $exists: false } },
            { hidden: false }
          )
        }
      },
      {
        state: 'remove-update-txes-docnotify-ctx-v2',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            objectClass: notification.class.DocNotifyContext,
            'operations.lastViewedTimestamp': {
              $exists: true
            }
          })
          await client.deleteMany(DOMAIN_TX, {
            _class: core.class.TxUpdateDoc,
            objectClass: notification.class.DocNotifyContext,
            'operations.lastUpdateTimestamp': {
              $exists: true
            }
          })
        }
      },
      {
        state: 'remove-browser-notification-v2',
        mode: 'upgrade',
        func: async (client) => {
          await client.deleteMany<BrowserNotification>(DOMAIN_USER_NOTIFY, {
            _class: notification.class.BrowserNotification
          })

          await client.deleteMany(DOMAIN_TX, {
            objectClass: notification.class.BrowserNotification
          })
        }
      },
      {
        state: 'migrate-dnc-space',
        mode: 'upgrade',
        func: async (client) => {
          await client.update(DOMAIN_DOC_NOTIFY, { space: core.space.Space }, { space: core.space.Workspace })
        }
      },
      // {
      //   state: 'migrate-notifications-object',
      //   func: migrateNotificationsObject
      // },
      {
        state: 'accounts-to-social-ids',
        mode: 'upgrade',
        func: migrateAccounts
      },
      // ONLY FOR STAGING. REMOVE IT BEFORE MERGING TO PRODUCTION
      {
        state: 'migrate-social-ids-to-account-uuids',
        mode: 'upgrade',
        func: migrateSocialIdsToAccountUuids
      },
      // ONLY FOR STAGING. REMOVE IT BEFORE MERGING TO PRODUCTION
      {
        state: 'migrate-social-keys-to-social-ids-v2',
        mode: 'upgrade',
        func: migrateSocialKeysToSocialIds
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
