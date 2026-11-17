/**
 * THE CRM — Hanzo CRM, the one crm.hanzo.ai and the console draw (@hanzo/crm),
 * drawn here at /crm.
 *
 * The CRM is the org's own Base (module `crm`): people, companies, the pipeline,
 * fundraising, tasks, lists, candidates and the cloud's sequences. Every app
 * that has a CRM draws this one, so a person added here is the person on
 * crm.hanzo.ai, with the same views, the same timeline and the same actions.
 *
 * What this app supplies is what only it knows: how a request leaves it
 * (src/data/crm.ts, through `http.call`), the org it acts in (the open space's,
 * else the token's), who is signed in and what they may administer, its router,
 * and the brand. The navigator lists the CRM's own pages.
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { configureCrm, CrmModule, CRM_PAGES, type CrmSession } from '@hanzo/crm'
import { registerDefaultFields } from '@hanzo/data'
import { Building2, CheckSquare, Coins, IdCard, ListChecks, Send, Target, Users } from '@hanzogui/lucide-icons-2'
import { ScrollArea, Spinner, YStack } from '@hanzo/ui'

import { v1 } from '~/data/api.ts'
import { brand } from '~/data/brand.ts'
import { base, member, rest, type Member } from '~/data/crm.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import { Find, Nav as Column, Roll, Row } from '~/shell'
import { mark } from '~/theme/theme.ts'

import './crm.css'

/**
 * The org the CRM acts in, for its reads that are not drawn (the beta, a
 * schema's cache). `CrmScreen` sets it before the CRM renders.
 */
let actingIn = ''

// The CRM's record forms draw @hanzo/data's field editors, which are registered by
// calling this. Its import alone registers nothing a production build keeps: the
// package is side-effect free, so the registration is shaken out and every form
// draws labels with no inputs. The app registers them, once, here.
registerDefaultFields()

/** The one read of the signed-in person, shared by every screen that asks. */
let held: { who: string; read: Promise<Member> } | null = null
const memberNow = (who: string): Promise<Member> => {
  if (held?.who !== who) held = { who, read: member() }
  return held.read
}

/** The signed-in person in the orgs, read from the token once per person. */
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

const useCrmSession = (): CrmSession => {
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

const useCrmRouter = () => {
  const navigate = useNavigate()
  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href, { replace: true }),
    }),
    [navigate],
  )
}

const useCrmSearchParams = () => useSearchParams()[0]

configureCrm({
  v1Url: v1,
  ...rest(),
  base: () => base(),
  org: () => actingIn,
  // The org is the token's here, so the way out of one is the person's own spaces.
  leaveOrg: () => window.location.assign('/'),
  brand: () => ({ brandName: brand.name, websiteUrl: brand.site }),
  // Here, as on crm.hanzo.ai, the CRM is a product an org opens by joining its beta.
  gated: true,
  useSession: useCrmSession,
  useRouter: useCrmRouter,
  useSearchParams: useCrmSearchParams,
})

/** Each page's glyph, as the console's navigation draws it. */
const ICON: Record<string, typeof Users> = {
  '': Users,
  companies: Building2,
  deals: Target,
  fundraising: Coins,
  tasks: CheckSquare,
  lists: ListChecks,
  sequences: Send,
  candidates: IdCard,
}

/** People is the index: `/crm`, and a person's own page under `/crm/people`. */
const people = (pathname: string) => pathname === '/crm' || pathname === '/crm/people' || pathname.startsWith('/crm/people/')

export function CrmNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pages = CRM_PAGES.filter((p) => !q || p.label.toLowerCase().includes(q))
  return (
    <Column title="CRM">
      <Find value={query} onChange={setQuery} />
      <YStack height={12} />
      <Roll>
        {pages.map((p) => {
          const Icon = ICON[p.slug] ?? Users
          return (
            <Row
              key={p.slug || 'people'}
              to={p.slug ? `/crm/${p.slug}` : '/crm'}
              icon={<Icon size={15} color={mark(p.slug || 'people')} />}
              current={p.slug ? undefined : people}
            >
              {p.label}
            </Row>
          )
        })}
      </Roll>
    </Column>
  )
}

/** `/crm`, `/crm/:tab`, `/crm/:tab/:id`: the CRM, in the org this app acts in. */
export function CrmScreen() {
  const { tab, id } = useParams()
  const { org } = useSpace()
  const { who } = useSession()
  const m = useMember(who?.id)
  // Set while rendering, before the CRM's first read asks for it; the same value every render.
  actingIn = org ?? m?.org ?? ''
  const params = useMemo(() => ({ ...(tab ? { tab } : {}), ...(id ? { id } : {}) }), [tab, id])
  if (!actingIn) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner size={16} />
      </YStack>
    )
  }
  return (
    <ScrollArea flex={1} minH={0} bg="$background">
      <YStack {...{ 'data-crm': '' }}>
        <CrmModule key={actingIn} params={params} />
      </YStack>
    </ScrollArea>
  )
}

/** The sections this app's own CRM had that the CRM does not: each lands on People. */
export const RETIRED = ['forms', 'feedback', 'errors', 'deliverability'] as const

export const Retired = () => <Navigate to="/crm" replace />
