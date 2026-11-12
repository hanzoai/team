/**
 * CRM (`/crm/:section`): the real records, read from the server.
 *
 * Every section is one read of a real endpoint (`/v1/crm/*`, `/v1/base/*`,
 * `/v1/event/errors`) drawn as it came back. Nothing is derived, seeded or
 * kept in the browser; a failed read says so instead of showing something else.
 */
import { RecordsView, RecordDetail, registerDefaultFields, type FieldDefinition, type SelectOption } from '@hanzo/data'
import { Button, Density, ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Activity, Briefcase, Building2, Calendar, DollarSign, FileText, Globe, Hash, Layers, Link2, Mail, MapPin,
  RefreshCw, Star, TrendingUp, User, Users, X, Zap,
} from '@hanzogui/lucide-icons-2'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'

import { call } from '~/data/http.ts'
import { Find, Group, Nav as Column, Roll, Row, Rule } from '~/shell'
import { chip, mark } from '~/theme/theme.ts'

registerDefaultFields()

const API_ORIGIN = import.meta.env.DEV ? '' : 'https://api.hanzo.ai'

const read = <T,>(path: string): Promise<T> => call<T>(`${API_ORIGIN}${path}`)

export type CrmSection = 'investors' | 'funds' | 'customers' | 'leads' | 'feedback' | 'errors' | 'lists'

const SECTIONS: readonly CrmSection[] = ['investors', 'funds', 'customers', 'leads', 'feedback', 'errors', 'lists']

const STAGE_OPTIONS: SelectOption[] = [
  { value: 'NEW', label: 'New', color: 'pink' },
  { value: 'SCREENING', label: 'Screening', color: 'cyan' },
  { value: 'MEETING', label: 'Meeting', color: 'blue' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'amber' },
  { value: 'CUSTOMER', label: 'Customer', color: 'green' },
]

const INVESTOR_CAT_OPTIONS: SelectOption[] = [
  { value: 'vc', label: 'Institutional VC', color: 'blue' },
  { value: 'crypto_vc', label: 'Crypto / Web3 VC', color: 'cyan' },
  { value: 'accredited', label: 'Accredited High-Check', color: 'green' },
  { value: 'angel', label: 'Angel Investor', color: 'amber' },
  { value: 'family_office', label: 'Family Office', color: 'cyan' },
  { value: 'crowdfunding_republic', label: 'Republic / Reg CF', color: 'orange' },
]

const INVESTOR_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Investor', type: 'text', metadata: { avatar: 'circle' } as never },
  { name: 'company', label: 'Firm / Fund', type: 'relation', metadata: { labelField: 'name', shape: 'square' } },
  { name: 'category', label: 'Category', type: 'select', metadata: { options: INVESTOR_CAT_OPTIONS } },
  { name: 'stage', label: 'Stage', type: 'select', metadata: { options: STAGE_OPTIONS } },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'checkSize', label: 'Check Size', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
]

const FUND_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Fund / Firm', type: 'text', metadata: { avatar: 'square' } as never },
  { name: 'stage', label: 'Stage', type: 'select', metadata: { options: STAGE_OPTIONS } },
  { name: 'aum', label: 'AUM', type: 'text' },
  { name: 'checkSize', label: 'Check Size', type: 'text' },
  { name: 'primaryEmail', label: 'Primary Email', type: 'email' },
  { name: 'website', label: 'Url', type: 'url' },
  { name: 'location', label: 'Location', type: 'text' },
]

const CUSTOMER_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Customer', type: 'text', metadata: { avatar: 'circle' } as never },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'product', label: 'Product', type: 'text' },
  { name: 'totalSpent', label: 'Total Spent', type: 'currency', metadata: { currencyCode: 'USD', decimals: 0 } },
  { name: 'stage', label: 'Stage', type: 'select', metadata: { options: STAGE_OPTIONS } },
  { name: 'location', label: 'Location', type: 'text' },
]

const LEAD_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Developer', type: 'text', metadata: { avatar: 'circle' } as never },
  { name: 'handle', label: 'GitHub', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'company', label: 'Company', type: 'relation', metadata: { labelField: 'name', shape: 'square' } },
  { name: 'stars', label: 'Stars', type: 'number' },
  { name: 'followers', label: 'Followers', type: 'number' },
  { name: 'location', label: 'Location', type: 'text' },
]

const LIST_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Audience / Segment', type: 'text', metadata: { avatar: 'square' } as never },
  { name: 'purpose', label: 'Engine', type: 'text' },
  { name: 'totalCount', label: 'Total Contacts', type: 'number' },
  { name: 'eligibleCount', label: 'Deliverable', type: 'number' },
  { name: 'description', label: 'Description', type: 'text' },
]

const FEEDBACK_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Subject / Summary', type: 'text', metadata: { avatar: 'square' } as never },
  { name: 'program', label: 'Kind', type: 'text' },
  { name: 'email', label: 'Submitter', type: 'email' },
  { name: 'company', label: 'Organization', type: 'text' },
  { name: 'source', label: 'Source', type: 'text' },
  { name: 'recordCode', label: 'Ref / Report ID', type: 'text', readOnly: true },
  { name: 'closeDate', label: 'Submitted At', type: 'date' },
]

const ERROR_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Exception / Fault', type: 'text', metadata: { avatar: 'square' } as never },
  { name: 'program', label: 'Class / Type', type: 'text' },
  { name: 'company', label: 'Service / App', type: 'text' },
  { name: 'location', label: 'Origin / File', type: 'text' },
  { name: 'source', label: 'Env & Release', type: 'text' },
  { name: 'recordCode', label: 'Event / Issue ID', type: 'text', readOnly: true },
  { name: 'closeDate', label: 'Occurred At', type: 'date' },
]

const FIELD_ICONS: Record<string, ReactNode> = {
  name: <Building2 size={14} color="$color10" />,
  domainName: <Link2 size={14} color="$color10" />,
  website: <Link2 size={14} color="$color10" />,
  createdBy: <User size={14} color="$color10" />,
  city: <MapPin size={14} color="$color10" />,
  location: <MapPin size={14} color="$color10" />,
  country: <Globe size={14} color="$color10" />,
  employees: <Users size={14} color="$color10" />,
  arr: <DollarSign size={14} color="$color10" />,
  amount: <DollarSign size={14} color="$color10" />,
  totalSpent: <DollarSign size={14} color="$color10" />,
  company: <Building2 size={14} color="$color10" />,
  pointOfContact: <User size={14} color="$color10" />,
  rating: <Star size={14} color="$color10" />,
  closeDate: <Calendar size={14} color="$color10" />,
  recordCode: <Hash size={14} color="$color10" />,
  email: <Mail size={14} color="$color10" />,
  primaryEmail: <Mail size={14} color="$color10" />,
  jobTitle: <Briefcase size={14} color="$color10" />,
  title: <Briefcase size={14} color="$color10" />,
}

export function CrmNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const all: { to: CrmSection; label: string; icon: ReactNode; group: string }[] = [
    { to: 'investors', label: 'Investors', icon: <TrendingUp size={15} color={mark('investors')} />, group: 'Audiences' },
    { to: 'funds', label: 'Funds', icon: <Briefcase size={15} color={mark('funds')} />, group: 'Audiences' },
    { to: 'customers', label: 'Customers', icon: <Users size={15} color={mark('customers')} />, group: 'Audiences' },
    { to: 'leads', label: 'Developer Leads', icon: <Zap size={15} color={mark('leads')} />, group: 'Audiences' },
    { to: 'feedback', label: 'Feedback, Bugs & Forms', icon: <FileText size={15} color={mark('feedback')} />, group: 'Inbound' },
    { to: 'errors', label: 'Runtime & CLI Errors', icon: <Activity size={15} color={mark('errors')} />, group: 'Inbound' },
    { to: 'lists', label: 'Lists & Segments', icon: <Layers size={15} color="$soft" />, group: 'Engagement' },
  ]
  const rows = all.filter((r) => !q || r.label.toLowerCase().includes(q))
  const groups = [...new Set(rows.map((r) => r.group))]
  return (
    <Column title="CRM">
      <Find value={query} onChange={setQuery} />
      <YStack height={12} />
      <Roll>
        {groups.map((g, i) => (
          <YStack key={g}>
            {i > 0 ? <Rule /> : null}
            <Group>{g}</Group>
            {rows
              .filter((r) => r.group === g)
              .map((r) => (
                <Row key={r.to} to={`/crm/${r.to}`} icon={r.icon}>
                  {r.label}
                </Row>
              ))}
          </YStack>
        ))}
      </Roll>
    </Column>
  )
}

type Items = { items?: any[]; total?: number }
type Row_ = Record<string, unknown>
type Loaded = { rows: Row_[]; total: number }

const place = (r: any) => [r.city, r.state, r.country].filter(Boolean).join(', ') || String(r.location ?? '')
const day = (v: unknown) => (typeof v === 'string' ? v.slice(0, 10) : '')

const load = async (section: CrmSection, bucket: string, category: string): Promise<Loaded> => {
  switch (section) {
    case 'investors': {
      const res = await read<Items>(`/v1/crm/investors?limit=250&category=${category === 'all' ? 'vc' : category}`)
      const rows = (res.items ?? []).filter((v) => v.name || v.email).map((v) => ({
        id: String(v.id),
        name: String(v.name ?? v.email),
        company: String(v.company ?? v.fund_name ?? ''),
        category: String(v.category ?? ''),
        stage: String(v.stage ?? '').toUpperCase(),
        email: String(v.email ?? ''),
        title: String(v.title ?? ''),
        checkSize: String(v.check_size ?? ''),
        location: place(v),
      }))
      return { rows, total: res.total ?? rows.length }
    }
    case 'funds': {
      const res = await read<Items>('/v1/crm/funds?limit=250')
      const rows = (res.items ?? []).map((f) => ({
        id: String(f.id),
        name: String(f.name ?? ''),
        stage: String(f.stage ?? '').toUpperCase(),
        aum: String(f.aum ?? ''),
        checkSize: String(f.check_size ?? ''),
        primaryEmail: String(f.primary_email ?? ''),
        website: String(f.website ?? ''),
        location: String(f.location ?? f.country ?? ''),
      }))
      return { rows, total: res.total ?? rows.length }
    }
    case 'customers': {
      const res = await read<Items>('/v1/crm/customers?limit=250')
      const rows = (res.items ?? []).map((c) => ({
        id: String(c.id),
        name: String(c.name ?? c.email ?? ''),
        email: String(c.email ?? ''),
        product: String(c.products ?? c.product ?? ''),
        totalSpent: Number(c.total_spent ?? c.amount ?? 0),
        stage: 'CUSTOMER',
        location: place(c),
      }))
      return { rows, total: res.total ?? rows.length }
    }
    case 'leads': {
      const qs = new URLSearchParams({ limit: '200' })
      const [min, max] = bucket === 'all' ? [] : bucket.endsWith('+') ? [bucket.slice(0, -1)] : bucket.split('-')
      if (min) qs.set('min_stars', min === '0' ? '1' : min)
      if (max) qs.set('max_stars', max)
      const res = await read<{ leads?: any[]; total?: number }>(`/v1/crm/leads?${qs}`)
      const rows = (res.leads ?? []).map((l, i) => ({
        id: String(l.id ?? l.github_login ?? i),
        name: String(l.name ?? l.github_login ?? l.email ?? ''),
        handle: l.github_login ? `@${l.github_login}` : '',
        email: String(l.email ?? ''),
        company: String(l.company ?? ''),
        stars: Number(l.total_stars ?? l.stars ?? 0),
        followers: Number(l.followers ?? 0),
        location: String(l.location ?? l.country ?? ''),
      }))
      return { rows, total: res.total ?? rows.length }
    }
    case 'feedback': {
      const [act, people] = await Promise.all([
        read<{ items?: any[]; totalItems?: number }>('/v1/base/collections/activities/records?perPage=150&sort=-at,-created'),
        read<{ items?: any[] }>('/v1/base/collections/people/records?perPage=250'),
      ])
      const byId = new Map<string, any>((people.items ?? []).map((p) => [String(p.id), p]))
      const rows = (act.items ?? [])
        .filter((a) => a.kind === 'form' || a.data?.program)
        .map((a, i) => {
          const data = (a.data ?? {}) as Record<string, any>
          const p = byId.get(String(a.person_id ?? '')) ?? {}
          return {
            id: String(a.id ?? i),
            name: String(a.subject ?? data.need ?? data.description ?? ''),
            program: String(data.program ?? data.kind ?? 'feedback'),
            email: String(p.email ?? data.email ?? ''),
            company: String(p.company ?? p.name ?? data.company ?? ''),
            source: String(data.source ?? a.channel ?? ''),
            recordCode: String(data.public_ref ?? a.source_id ?? a.id ?? ''),
            closeDate: day(a.at ?? a.created),
          }
        })
      return { rows, total: act.totalItems ?? rows.length }
    }
    case 'errors': {
      const res = await read<{ items?: any[]; errors?: any[] } | any[]>('/v1/event/errors?limit=100')
      const list = Array.isArray(res) ? res : (res.items ?? res.errors ?? [])
      const rows = list.map((e, i) => {
        const env = String(e.environment ?? e.env ?? '')
        const rel = String(e.release ?? '')
        return {
          id: String(e.id ?? e.event_id ?? i),
          name: String(e.value ?? e.message ?? e.title ?? ''),
          program: String(e.type ?? e.class ?? e.name ?? ''),
          company: String(e.app ?? e.service ?? e.product ?? ''),
          location: String(e.culprit ?? e.origin ?? e.path ?? ''),
          source: [env, rel].filter(Boolean).join(' · '),
          recordCode: String(e.issue ?? e.id ?? e.event_id ?? ''),
          closeDate: day(e.timestamp ?? e.time ?? e.created_at),
        }
      })
      return { rows, total: rows.length }
    }
    case 'lists': {
      const res = await read<Items>('/v1/crm/lists')
      const rows = (res.items ?? []).map((l) => ({
        id: String(l.id),
        name: String(l.name ?? ''),
        purpose: String(l.purpose ?? l.kind ?? ''),
        totalCount: Number(l.total_count ?? l.eligible_count ?? 0),
        eligibleCount: Number(l.eligible_count ?? l.total_count ?? 0),
        description: String(l.description ?? ''),
      }))
      return { rows, total: res.total ?? rows.length }
    }
  }
}

const FIELDS: Record<CrmSection, FieldDefinition[]> = {
  investors: INVESTOR_FIELDS,
  funds: FUND_FIELDS,
  customers: CUSTOMER_FIELDS,
  leads: LEAD_FIELDS,
  feedback: FEEDBACK_FIELDS,
  errors: ERROR_FIELDS,
  lists: LIST_FIELDS,
}

const TITLES: Record<CrmSection, { title: string; icon: ReactNode }> = {
  investors: { title: 'Investors', icon: <TrendingUp size={14} /> },
  funds: { title: 'Funds', icon: <Briefcase size={14} /> },
  customers: { title: 'Customers', icon: <Users size={14} /> },
  leads: { title: 'Developer Leads', icon: <Zap size={14} /> },
  feedback: { title: 'Feedback, Bugs & Forms', icon: <FileText size={14} /> },
  errors: { title: 'Runtime & CLI Errors', icon: <Activity size={14} /> },
  lists: { title: 'Lists & Segments', icon: <Layers size={14} /> },
}

const INVESTOR_CATEGORIES = [
  { id: 'all', label: 'Institutional VCs' },
  { id: 'crypto_vc', label: 'Crypto / Web3 VCs' },
  { id: 'accredited', label: 'Accredited High-Check' },
  { id: 'family_office', label: 'Family Offices' },
  { id: 'crowdfunding_republic', label: 'Republic / Reg CF' },
] as const

const STAR_BUCKETS = ['all', '0-100', '100-500', '500-1000', '1000-5000', '5000-15000', '15000+'] as const

export function CrmScreen() {
  const { section: raw } = useParams()
  const section: CrmSection = SECTIONS.includes(raw as CrmSection) ? (raw as CrmSection) : 'investors'
  const [bucket, setBucket] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Row_ | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setSelected(null)
    setError(null)
    try {
      setData(await load(section, bucket, category))
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'The read failed.')
    } finally {
      setLoading(false)
    }
  }, [section, bucket, category])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const fields = FIELDS[section]
  const tone = useMemo(() => chip(section), [section])
  const { title, icon } = TITLES[section]

  const strip = (items: readonly { id: string; label: string }[], on: string, set: (id: string) => void) => (
    <XStack height={36} px="$3" items="center" gap="$1.5" borderBottomWidth={1} borderColor="$borderColor" bg="$background">
      {items.map((c) => (
        <Button
          key={c.id}
          size="xs"
          height={24}
          px="$2"
          rounded="$2"
          chromeless={on !== c.id}
          bg={on === c.id ? '$color3' : 'transparent'}
          onPress={() => set(c.id)}
        >
          <SizableText fontSize={11} fontWeight={on === c.id ? '600' : '400'} color={on === c.id ? '$color12' : '$color10'}>
            {c.label}
          </SizableText>
        </Button>
      ))}
    </XStack>
  )

  return (
    <Density value="compact">
      <YStack flex={1} minH={0} bg="$background">
        <XStack height={44} px="$3" items="center" justify="space-between" borderBottomWidth={1} borderColor="$borderColor" gap="$2">
          <XStack items="center" gap="$2">
            <XStack width={22} height={22} rounded="$2" items="center" justify="center" style={{ backgroundColor: tone.background, color: tone.color }}>
              {icon}
            </XStack>
            <SizableText fontSize={14} fontWeight="600" color="$color12">
              {title}
            </SizableText>
            {data ? (
              <SizableText fontSize={12} color="$color10">
                {`${data.total.toLocaleString()} total`}
              </SizableText>
            ) : null}
          </XStack>
          <Button size="xs" height={24} px="$2" chromeless startIcon={<RefreshCw size={12} />} onPress={() => void refresh()}>
            <SizableText fontSize={12} color="$color10">Refresh</SizableText>
          </Button>
        </XStack>

        {section === 'leads' ? strip(STAR_BUCKETS.map((b) => ({ id: b, label: b === 'all' ? 'All' : `★ ${b}` })), bucket, setBucket) : null}
        {section === 'investors' ? strip(INVESTOR_CATEGORIES, category, setCategory) : null}

        {error ? (
          <YStack p="$4" gap="$2">
            <SizableText fontSize={13} fontWeight="600" color="$color12">This list could not be read.</SizableText>
            <SizableText fontSize={12} color="$color10">{error}</SizableText>
          </YStack>
        ) : (
          <XStack flex={1} minW={0} minH={0}>
            <ScrollArea flex={1} minW={0} minH={0}>
              <RecordsView
                key={section}
                fields={fields}
                records={data?.rows ?? []}
                loading={loading}
                editable={false}
                selectable={false}
                defaultKind="table"
                boardDisabled
                {...({ fieldIcons: FIELD_ICONS } as Record<string, unknown>)}
                onOpen={(r) => setSelected(r)}
                empty="No records."
              />
            </ScrollArea>
            {selected ? (
              <YStack width={380} shrink={0} borderLeftWidth={1} borderColor="$borderColor" bg="$background">
                <XStack height={44} px="$3" items="center" justify="space-between" borderBottomWidth={1} borderColor="$borderColor">
                  <SizableText fontSize={13} fontWeight="600" color="$color12" numberOfLines={1}>
                    {String(selected.name || selected.email || 'Record')}
                  </SizableText>
                  <Button size="xs" width={26} height={26} p="$0" chromeless onPress={() => setSelected(null)}>
                    <X size={14} color="$color10" />
                  </Button>
                </XStack>
                <ScrollArea flex={1} minH={0}>
                  <YStack p="$3">
                    <RecordDetail fields={fields} record={selected} />
                  </YStack>
                </ScrollArea>
              </YStack>
            ) : null}
          </XStack>
        )}
      </YStack>
    </Density>
  )
}
