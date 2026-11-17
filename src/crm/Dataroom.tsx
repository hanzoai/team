/**
 * THE DATA ROOM — Hanzo data room, drawn here at /dataroom.
 *
 * The data room lives in Hanzo Cloud and this app reaches it through Cloud's
 * APIs the same way CRM reaches @hanzo/crm: every request leaves through
 * `http.call` (the IAM bearer, no cookie), the org it acts in (the open
 * space's, else the token's), who is signed in and what they may administer,
 * its router, and the brand. The navigator lists the data room's own pages.
 *
 * Nothing real is kept in this repo: the module names the Cloud addresses and
 * Cloud answers them; documents never land here.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ScrollArea, SizableText, Spinner, YStack } from '@hanzo/ui'
import { Users } from '@hanzogui/lucide-icons-2'

import { member, type Member } from '~/data/dataroom.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { Find, Nav as Column, Roll, Row } from '~/shell'
import { mark } from '~/theme/theme.ts'

let actingIn = ''

let held: { who: string; read: Promise<Member> } | null = null
const memberNow = (who: string): Promise<Member> => {
  if (held?.who !== who) held = { who, read: member() }
  return held.read
}

const useMember = (who: string | undefined): Member | null => {
  const [m, setM] = useState<Member | null>(null)
  useEffect(() => {
    let live = true
    if (!who) {
      setM(null)
      return
    }
    void memberNow(who).then((next) => live && setM(next))
    return () => {
      live = false
    }
  }, [who])
  return m
}

export function DataroomNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pages = [
    { slug: '', label: 'Data room' },
    { slug: 'rounds', label: 'Folders' },
    { slug: 'holders', label: 'Documents' },
    { slug: 'options', label: 'Sharing' },
  ].filter((p) => !q || p.label.toLowerCase().includes(q))
  return (
    <Column title="Data room">
      <Find value={query} onChange={setQuery} />
      <YStack height={12} />
      <Roll>
        {pages.map((p) => (
          <Row
            key={p.slug || 'data-room'}
            to={p.slug ? `/dataroom/${p.slug}` : '/dataroom'}
            icon={<Users size={15} color={mark(p.slug || 'data-room')} />}
            current={p.slug ? undefined : (pathname: string) => pathname === '/dataroom'}
          >
            {p.label}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function DataroomScreen() {
  const { tab } = useParams()
  const { org } = useSpace()
  const { who } = useSession()
  const m = useMember(who?.id)
  actingIn = org ?? m?.org ?? ''
  if (!actingIn) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner size={16} />
      </YStack>
    )
  }
  return (
    <ScrollArea flex={1} minH={0} bg="$background">
      <DataroomModule key={actingIn} />
    </ScrollArea>
  )
}

const DataroomModule = ({ key: k, tab }: { key: string; tab: string }) => (
  <YStack flex={1} items="center" justify="center" px={4}>
    <SizableText color="$quiet">Data room — {k}</SizableText>
  </YStack>
)
