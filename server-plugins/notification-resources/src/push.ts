//
// Copyright © 2025 Hardcore Engineering Inc.
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

import serverCore, { TriggerControl } from '@hanzo/server-core'
import serverNotification, { PUSH_NOTIFICATION_TITLE_SIZE } from '@hanzo/server-notification'
import {
  AccountUuid,
  Class,
  concatLink,
  Data,
  Doc,
  Hierarchy,
  Ref,
  Tx,
  TxCreateDoc,
  TxProcessor
} from '@hanzo/core'
import notification, {
  ActivityInboxNotification,
  InboxNotification,
  MentionInboxNotification,
  notificationId,
  PushData,
  PushSubscription
} from '@hanzo/notification'
import activity, { ActivityMessage } from '@hanzo/activity'
import serverView from '@hanzo/server-view'
import { getMetadata, getResource } from '@hanzo/platform'
import { workbenchId } from '@hanzo/workbench'
import { encodeObjectURI } from '@hanzo/view'
import contact, {
  type AvatarInfo,
  getAvatarProviderId,
  getGravatarUrl,
  Person,
  PersonSpace
} from '@hanzo/contact'
import { AvailableProvidersCache, AvailableProvidersCacheKey, getTranslatedNotificationContent } from './index'
import { getPerson } from '@hanzo/server-contact'

async function createPushFromInbox (
  control: TriggerControl,
  n: InboxNotification,
  receiver: AccountUuid,
  soundAlert: boolean,
  receiverSpace: Ref<PersonSpace>,
  subscriptions: PushSubscription[],
  senderPerson?: Person
): Promise<Tx | undefined> {
  let { title, body } = await getTranslatedNotificationContent(n, n._class, control)

  if (title === '' || body === '') {
    return
  }

  title = title.slice(0, PUSH_NOTIFICATION_TITLE_SIZE)

  const linkProviders = control.modelDb.findAllSync(serverView.mixin.ServerLinkIdProvider, {})
  const provider = linkProviders.find(({ _id }) => _id === n.objectClass)

  let id: string = n.objectId

  if (provider !== undefined) {
    const encodeFn = await getResource(provider.encode)
    const cache: Map<Ref<Doc>, Doc> = control.contextCache.get('PushNotificationsHandler') ?? new Map()
    const doc = cache.get(n.objectId) ?? (await control.findAll(control.ctx, n.objectClass, { _id: n.objectId }))[0]

    if (doc === undefined) {
      return
    }

    cache.set(n.objectId, doc)
    control.contextCache.set('PushNotificationsHandler', cache)

    id = await encodeFn(doc, control)
  }

  const path = [workbenchId, control.workspace.url, notificationId, encodeObjectURI(id, n.objectClass)]

  if (subscriptions.length > 0) {
    await createPushNotification(control, receiver, title, body, n._id, subscriptions, senderPerson, path)
  }

  const messageInfo = getMessageInfo(n, control.hierarchy)
  return control.txFactory.createTxCreateDoc(notification.class.BrowserNotification, receiverSpace, {
    user: receiver,
    title,
    body,
    senderId: n.createdBy ?? n.modifiedBy,
    tag: n._id,
    objectId: n.objectId,
    objectClass: n.objectClass,
    messageId: messageInfo._id,
    messageClass: messageInfo._class,
    onClickLocation: {
      path
    },
    soundAlert
  })
}

function getMessageInfo (
  n: InboxNotification,
  hierarchy: Hierarchy
): {
    _id?: Ref<ActivityMessage>
    _class?: Ref<Class<ActivityMessage>>
  } {
  if (hierarchy.isDerived(n._class, notification.class.ActivityInboxNotification)) {
    const activityNotification = n as ActivityInboxNotification

    if (
      activityNotification.attachedToClass === activity.class.DocUpdateMessage &&
      hierarchy.isDerived(activityNotification.objectClass, activity.class.ActivityMessage)
    ) {
      return {
        _id: activityNotification.objectId as Ref<ActivityMessage>,
        _class: activityNotification.objectClass
      }
    }

    return {
      _id: activityNotification.attachedTo,
      _class: activityNotification.attachedToClass
    }
  }

  if (hierarchy.isDerived(n._class, notification.class.MentionInboxNotification)) {
    const mentionNotification = n as MentionInboxNotification
    if (hierarchy.isDerived(mentionNotification.mentionedInClass, activity.class.ActivityMessage)) {
      return {
        _id: mentionNotification.mentionedIn as Ref<ActivityMessage>,
        _class: mentionNotification.mentionedInClass
      }
    }
  }

  return {}
}

export async function createPushNotification (
  control: TriggerControl,
  target: AccountUuid,
  title: string,
  body: string,
  _id: string,
  subscriptions: PushSubscription[],
  senderAvatar?: Data<AvatarInfo>,
  path?: string[]
): Promise<void> {
  const pushURL: string | undefined = getMetadata(serverNotification.metadata.WebPushUrl)
  // TODO: Remove auth token after migration to new services
  const authToken: string | undefined = getMetadata(serverNotification.metadata.MailAuthToken)
  if (pushURL === undefined || pushURL === '') return
  const userSubscriptions = subscriptions.filter((it) => it.user === target)
  const data: PushData = {
    title,
    body
  }
  if (_id !== undefined) {
    data.tag = _id
  }
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const domainPath = `${workbenchId}/${control.workspace.url}`
  data.domain = concatLink(front, domainPath)
  if (path !== undefined) {
    data.url = concatLink(front, path.join('/'))
  }
  if (senderAvatar != null) {
    const provider = getAvatarProviderId(senderAvatar.avatarType)
    if (provider === contact.avatarProvider.Image) {
      if (senderAvatar.avatar != null) {
        const url = await control.storageAdapter.getUrl(control.ctx, control.workspace, senderAvatar.avatar)
        data.icon = url.includes('://') ? url : concatLink(front, url)
      }
    } else if (provider === contact.avatarProvider.Gravatar && senderAvatar.avatarProps?.url !== undefined) {
      data.icon = getGravatarUrl(senderAvatar.avatarProps?.url, 512)
    }
  }

  void sendPushToSubscription(pushURL, authToken, control, target, userSubscriptions, data)
}

async function sendPushToSubscription (
  pushURL: string,
  mailAuth: string | undefined,
  control: TriggerControl,
  targetUser: AccountUuid,
  subscriptions: PushSubscription[],
  data: PushData
): Promise<void> {
  try {
    const result: Ref<PushSubscription>[] = (
      await (
        await fetch(concatLink(pushURL, '/web-push'), {
          method: 'post',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(mailAuth != null ? { Authorization: `Bearer ${mailAuth}` } : {})
          },
          body: JSON.stringify({
            subscriptions,
            data
          })
        })
      ).json()
    ).result
    if (result.length > 0) {
      const domain = control.hierarchy.findDomain(notification.class.PushSubscription)
      if (domain !== undefined) {
        await control.lowLevel.clean(control.ctx, domain, result)
      }
    }
  } catch (err) {
    control.ctx.info('Cannot send push notification to', { user: targetUser, err })
  }
}

export async function PushNotificationsHandler (
  txes: TxCreateDoc<InboxNotification>[],
  control: TriggerControl
): Promise<Tx[]> {
  const availableProviders: AvailableProvidersCache = control.contextCache.get(AvailableProvidersCacheKey) ?? new Map()

  const all: InboxNotification[] = txes
    .map((tx) => TxProcessor.createDoc2Doc(tx))
    .filter(
      (it) =>
        availableProviders.get(it._id)?.find((p) => p === notification.providers.PushNotificationProvider) !== undefined
    )

  if (all.length === 0) {
    return []
  }

  const receivers = new Set(all.map((it) => it.user))
  const subscriptions = (await control.queryFind(control.ctx, notification.class.PushSubscription, {})).filter((it) =>
    receivers.has(it.user)
  )

  const res: Tx[] = []

  for (const inboxNotification of all) {
    const { user } = inboxNotification
    const userSubscriptions = subscriptions.filter((it) => it.user === user)

    const senderSocialString = inboxNotification.createdBy ?? inboxNotification.modifiedBy
    const senderPerson = await getPerson(control, senderSocialString)
    const soundAlert =
      availableProviders
        .get(inboxNotification._id)
        ?.find((p) => p === notification.providers.SoundNotificationProvider) !== undefined
    const tx = await createPushFromInbox(
      control,
      inboxNotification,
      user,
      soundAlert,
      inboxNotification.space,
      userSubscriptions,
      senderPerson
    )

    if (tx !== undefined) {
      res.push(tx)
    }
  }

  return res
}
