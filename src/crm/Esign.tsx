/**
 * THE E-SIGN — Hanzo eSign, drawn here at /esign.
 *
 * eSign lives in Hanzo Cloud and this app reaches it through Cloud's APIs the
 * same way CRM reaches @hanzo/crm: every request leaves through `http.call`
 * (the IAM bearer, no cookie), the org it acts in (the open space's, else the
 * token's), who is signed in and what they may administer, its router, and the
 * brand. The navigator lists eSign's own pages.
 *
 * Nothing real is kept in this repo: the module names the Cloud addresses and
 * Cloud answers them; envelopes and signed documents never land here.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { ScrollArea, SizableText, Spinner, YStack } from '@hanzo/ui'
import { Users } from '@hanzogui/lucide-icons-2'

import { brand } from '~/data/brand.ts'
import { esign, member, type Member } from '~/data/esign.ts'
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

const useEsignSession = () => {
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

export function EsignNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pages = [
    { slug: '', label: 'eSign' },
    { slug: 'rounds', label: 'Envelopes' },
    { slug: 'holders', label: 'Signers' },
    { slug: 'options', label: 'Templates' },
  ].filter((p) => !q || p.label.toLowerCase().includes(q))
  return (
    <Column title="eSign">
      <Find value={query} onChange={setQuery} />
      <YStack height={12} />
      <Roll>
        {pages.map((p) => (
          <Row
            key={p.slug || 'esign'}
            to={p.slug ? `/esign/${p.slug}` : '/esign'}
            icon={<Users size={15} color={mark(p.slug || 'esign')} />}
            current={p.slug ? undefined : (pathname: string) => pathname === '/esign'}
          >
            {p.label}
          </Row>
        ))}
      </Roll>
    </Column>
  )
}

export function EsignScreen() {
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
      <EsignModule key={actingIn} tab={tab ?? ''} />
    </ScrollArea>
  )
}

const EsignModule = ({ key: k, tab }: { key: string; tab: string }) => (
  <YStack flex={1} items="center" justify="center" px={4}>
    <SizableText color="$quiet">eSign — {k}</SizableText>
  </YStack>
)
