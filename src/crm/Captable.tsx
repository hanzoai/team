/**
 * THE CAP TABLE — Hanzo cap table, drawn here at /captable.
 *
 * The cap table lives in Hanzo Cloud and this app reaches it through Cloud's
 * APIs the same way CRM reaches @hanzo/crm: every request leaves through
 * `http.call` (the IAM bearer, no cookie), the org it acts in (the open
 * space's, else the token's), who is signed in and what they may administer,
 * its router, and the brand. The navigator lists the cap table's own pages.
 *
 * Nothing real is kept in this repo: the module names the Cloud addresses and
 * Cloud answers them; cap table rows and the people on them never land here.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { ScrollArea, SizableText, Spinner, YStack } from '@hanzo/ui'
import { Users } from '@hanzogui/lucide-icons-2'

import { captable, type Member } from '~/data/captable.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { Find, Nav as Column, Roll, Row } from '~/shell'
import { mark } from '~/theme/theme.ts'

let actingIn = ''

let held: { who: string; read: Promise<Member> } | null = null
const memberNow = (who: string): Promise<Member> => {
  if (held?.who !== who) held = { who, read: import('~/data/captable.ts').then((m) => m.memberOf(null as unknown as string)) }
  return held.read
}
