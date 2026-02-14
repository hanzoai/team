import { CreateMessageEvent } from '@hanzo/communication-sdk-types'
import { gmail_v1 } from 'googleapis'
import {
  markdownToHtml,
  getReplySubject,
  getRecipients,
  getMailHeaders,
  MailHeader,
  getEmailMessageIdFromHanzoId
} from '@hanzo/mail-common'
import { Card } from '@hanzo/card'
import { MeasureContext, PersonId } from '@hanzo/core'
import { AccountClient } from '@hanzo/account-client'

import { encode64 } from '../../base64'
import { addFooter } from '../../utils'
import { GmailMessageType } from '../../types'

export async function makeHTMLBodyV2 (
  ctx: MeasureContext,
  accountClient: AccountClient,
  message: CreateMessageEvent,
  thread: Card,
  personId: PersonId,
  from: string
): Promise<string | undefined> {
  const recipients = await getRecipients(ctx, accountClient, thread, personId)
  if (recipients === undefined) {
    return undefined
  }
  const { to, copy } = recipients
  const str = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `To: ${to} \n`,
    `From: ${from} \n`,
    `${MailHeader.Id}: ${getEmailMessageIdFromHanzoId(message._id, from)}\n`,
    ...getMailHeaders(GmailMessageType, message._id)
  ]

  // TODO: get reply-to from channel

  if (copy != null && copy.length > 0) {
    str.push(`Cc: ${copy.join(', ')}  \n`)
  }

  const subject = getReplySubject(thread.title)
  if (subject != null) {
    str.push(`Subject: =?UTF-8?B?${encode64(subject)}?= \n`)
  }

  str.push('\n\n')
  str.push(addFooter(markdownToHtml(message.content)))
  const res = str.join('')
  return encode64(res).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Check if a Gmail message was sent by the platform
 */
export function isPlatformSentMessage (message: gmail_v1.Schema$Message): boolean {
  if (message.payload?.headers == null) return false

  // Check for custom platform headers
  const headers = message.payload.headers
  const platformSentHeader = headers.find((h) => h.name === MailHeader.HanzoSent)
  if (platformSentHeader?.value === 'true') {
    return true
  }
  const hanzoMessageType = headers.find((h) => h.name === MailHeader.HanzoMessageType)
  if (hanzoMessageType?.value != null) {
    return true
  }

  return false
}
