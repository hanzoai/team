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

import { brand } from '~/data/brand.ts'
import { captable, type Member } from '~/data/captable.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { Find, Nav as Column, Roll, Row } from '~/shell'
import { mark } from '~/theme/theme.ts'

let actingIn = ''

let held: { who: string; read: Promise<Member> } | null = null
const memberNow = (who: string): Promise<Member> => {
  if (held?.who !== who) held = { who, read: import('~/data/crm.ts').then((m) => m.memberOf(null as unknown as string)) }
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

const useCaptableSession = () => {
  const { who, leave } = useSession()
  const m = useMember(who?.id)
  return useMemo(
    () => ({
      account: who ? { name: who.name, email: who.email, superAdmin: m?.superAdmin ?? false, adminOrgs: m?.adminOrgs ?? [] } : null,
      signOut: leave,
    }),
    [who, m, leave],
  )
}

export function CaptableNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pages = [
    { slug: '', label: 'Cap table' },
    { slug: 'rounds', label: 'Rounds' },
    { slug: 'holders', label: 'Holders' },
    { slug: 'options', label: 'Options' },
  ].filter((p) => !q || p.label.toLowerCase().includes(q))
  return (
    <Column title="Cap table">
      <Find value={query} onChange={setQuery} />
      <YStack height={12} />
      <Roll>
        {pages.map((p) => (
          <Row
            key={p.slug || 'cap-table'}
            to={p.slug ? `/captable/${p.slug}` : '/captable'}
            icon={<Users size={15} color={mark(p.slug || 'cap-table')} />}
            current={p.slug ? undefined : (pathname: string) => pathname === '/captable'}
          >
            {p.label}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function CaptableScreen() {
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
      <CaptableModule key={actingIn} tab={tab ?? ''} />
    </ScrollArea>
  )
}

const CaptableModule = ({ key: k, tab }: { key: string; tab: string }) => (
  <YStack flex={1} items="center" justify="center" px={4}>
    <SizableText color="$quiet">Cap table — {k}</SizableText>
  </YStack>
)
