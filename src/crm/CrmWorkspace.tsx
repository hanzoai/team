/**
 * CRM (`/crm/:section`): the org's own CRM, read from its Base.
 *
 * Every section is one read through `~/data/crm` (people, companies,
 * opportunities, forms, candidates and lists from the org's Base; runtime
 * errors from the event lens), drawn as it came back. Nothing is derived,
 * seeded or kept in the browser. A failed read says so; an org whose Base has
 * no CRM yet says that instead of showing an empty list.
 */
import { RecordsView, RecordDetail, registerDefaultFields, type FieldDefinition, type SelectOption } from '@hanzo/data'
import { Button, Density, ScrollArea, SizableText, Spinner, XStack, YStack } from '@hanzo/ui'
import {
  Activity, Briefcase, Building2, Calendar, DollarSign, FileText, Globe, GraduationCap, Hash, Landmark, Layers,
  Link2, Mail, MapPin, Phone, RefreshCw, Target, TrendingUp, User, UserCheck, UserPlus, Users, X,
} from '@hanzogui/lucide-icons-2'
import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useParams } from 'react-router'

import { SECTIONS, readSection, sectionOf, unopened, type Row as Record_, type Section, type Sheet } from '~/data/crm.ts'
import { useRead } from '~/data/query.ts'
import { Find, Group, Nav as Column, Roll, Row, Rule } from '~/shell'
import { chip, mark } from '~/theme/theme.ts'

import './crm.css'
import { DETAIL, docked } from './layout.ts'

registerDefaultFields()

// ── the options Base's own select fields declare ────────────────────────────────

const LIFECYCLE: SelectOption[] = [
  { value: 'lead', label: 'Lead', color: 'blue' },
  { value: 'qualified', label: 'Qualified', color: 'cyan' },
  { value: 'customer', label: 'Customer', color: 'green' },
  { value: 'disqualified', label: 'Disqualified', color: 'gray' },
]

const RELATIONSHIP: SelectOption[] = [
  { value: 'prospect', label: 'Prospect', color: 'sky' },
  { value: 'customer', label: 'Customer', color: 'green' },
  { value: 'investor', label: 'Investor', color: 'amber' },
  { value: 'partner', label: 'Partner', color: 'violet' },
  { value: 'vendor', label: 'Vendor', color: 'sand' },
]

const OUTREACH: SelectOption[] = [
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'opened', label: 'Opened', color: 'cyan' },
  { value: 'clicked', label: 'Clicked', color: 'teal' },
  { value: 'replied', label: 'Replied', color: 'green' },
  { value: 'bounced', label: 'Bounced', color: 'red' },
  { value: 'unsubscribed', label: 'Unsubscribed', color: 'gray' },
]

const PIPELINE: SelectOption[] = [
  { value: 'sales', label: 'Sales', color: 'blue' },
  { value: 'fundraising', label: 'Fundraising', color: 'amber' },
]

const DEAL_STAGE: SelectOption[] = [
  { value: 'new', label: 'New', color: 'gray' },
  { value: 'screening', label: 'Screening', color: 'cyan' },
  { value: 'meeting', label: 'Meeting', color: 'blue' },
  { value: 'proposal', label: 'Proposal', color: 'amber' },
  { value: 'customer', label: 'Customer', color: 'green' },
  { value: 'intro', label: 'Intro', color: 'sky' },
  { value: 'diligence', label: 'Diligence', color: 'violet' },
  { value: 'term_sheet', label: 'Term sheet', color: 'purple' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' },
]

const HIRING_STAGE: SelectOption[] = [
  { value: 'new', label: 'New', color: 'gray' },
  { value: 'screening', label: 'Screening', color: 'cyan' },
  { value: 'interview', label: 'Interview', color: 'blue' },
  { value: 'offer', label: 'Offer', color: 'amber' },
  { value: 'hired', label: 'Hired', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
]

const CONSENT: SelectOption[] = [
  { value: 'unasked', label: 'Not asked', color: 'gray' },
  { value: 'given', label: 'Given', color: 'green' },
  { value: 'declined', label: 'Declined', color: 'red' },
]

const LIST_OF: SelectOption[] = [
  { value: 'people', label: 'People', color: 'blue' },
  { value: 'companies', label: 'Companies', color: 'amber' },
]

// ── the columns ──────────────────────────────────────────────────────────────────

const avatar = (shape: 'circle' | 'square') => ({ avatar: shape }) as never

const PERSON_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Name', type: 'text', metadata: avatar('circle') },
  { name: 'company', label: 'Company', type: 'relation', metadata: { labelField: 'name', shape: 'square' } },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'job_title', label: 'Title', type: 'text' },
  { name: 'lifecycle', label: 'Lifecycle', type: 'select', metadata: { options: LIFECYCLE } },
  { name: 'type', label: 'Relationship', type: 'select', metadata: { options: RELATIONSHIP } },
  { name: 'outreach', label: 'Outreach', type: 'select', metadata: { options: OUTREACH } },
  { name: 'contacted', label: 'Last contacted', type: 'date' },
  { name: 'phone', label: 'Phone', type: 'phone' },
  { name: 'address', label: 'Address', type: 'address' },
  { name: 'linkedin', label: 'LinkedIn', type: 'links' },
  { name: 'source', label: 'Source', type: 'text' },
  { name: 'created', label: 'Added', type: 'date' },
]

const COMPANY_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Company', type: 'text', metadata: avatar('square') },
  { name: 'type', label: 'Relationship', type: 'select', metadata: { options: RELATIONSHIP } },
  { name: 'domain', label: 'Domain', type: 'links' },
  { name: 'employees', label: 'Employees', type: 'number' },
  { name: 'annual_revenue', label: 'Annual revenue', type: 'currency', metadata: { decimals: 0 } },
  { name: 'icp', label: 'Ideal customer', type: 'boolean' },
  { name: 'address', label: 'Address', type: 'address' },
  { name: 'linkedin', label: 'LinkedIn', type: 'links' },
  { name: 'created', label: 'Added', type: 'date' },
]

const OPPORTUNITY_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Opportunity', type: 'text', metadata: avatar('square') },
  { name: 'pipeline', label: 'Pipeline', type: 'select', metadata: { options: PIPELINE } },
  { name: 'stage', label: 'Stage', type: 'select', metadata: { options: DEAL_STAGE } },
  { name: 'amount', label: 'Amount', type: 'currency', metadata: { decimals: 0 } },
  { name: 'company', label: 'Company', type: 'relation', metadata: { labelField: 'name', shape: 'square' } },
  { name: 'contact', label: 'Contact', type: 'relation', metadata: { labelField: 'name', shape: 'circle' } },
  { name: 'close_date', label: 'Close date', type: 'date' },
  { name: 'next_step', label: 'Next step', type: 'text' },
  { name: 'contacted', label: 'Last contacted', type: 'date' },
  { name: 'created', label: 'Added', type: 'date' },
]

const FORM_FIELDS: FieldDefinition[] = [
  { name: 'subject', label: 'Form', type: 'text', metadata: avatar('square') },
  { name: 'kind', label: 'Kind', type: 'text' },
  { name: 'from', label: 'From', type: 'relation', metadata: { labelField: 'name', shape: 'circle' } },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'channel', label: 'Channel', type: 'text' },
  { name: 'ref', label: 'Reference', type: 'text' },
  { name: 'at', label: 'Filed', type: 'dateTime' },
]

const CANDIDATE_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Candidate', type: 'text', metadata: avatar('circle') },
  { name: 'role', label: 'Role', type: 'text' },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'stage', label: 'Stage', type: 'select', metadata: { options: HIRING_STAGE } },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'phone' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'links', label: 'Links', type: 'links' },
  { name: 'consent', label: 'News consent', type: 'select', metadata: { options: CONSENT } },
  { name: 'source', label: 'Source', type: 'text' },
  { name: 'applied', label: 'Applied', type: 'date' },
]

const ERROR_FIELDS: FieldDefinition[] = [
  { name: 'message', label: 'Error', type: 'text', metadata: avatar('square') },
  { name: 'type', label: 'Type', type: 'text' },
  { name: 'product', label: 'Product', type: 'text' },
  { name: 'path', label: 'Where', type: 'text' },
  { name: 'handled', label: 'Handled', type: 'boolean' },
  { name: 'library', label: 'SDK', type: 'text' },
  { name: 'who', label: 'Visitor', type: 'text' },
  { name: 'at', label: 'Occurred', type: 'dateTime' },
]

const LIST_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'List', type: 'text', metadata: avatar('square') },
  { name: 'members', label: 'Members', type: 'number' },
  { name: 'object', label: 'Of', type: 'select', metadata: { options: LIST_OF } },
  { name: 'purpose', label: 'Purpose', type: 'text' },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'created', label: 'Added', type: 'date' },
]

const FIELD_ICONS: Record<string, ReactNode> = {
  company: <Building2 size={14} color="$color10" />,
  contact: <User size={14} color="$color10" />,
  from: <User size={14} color="$color10" />,
  email: <Mail size={14} color="$color10" />,
  phone: <Phone size={14} color="$color10" />,
  job_title: <Briefcase size={14} color="$color10" />,
  role: <Briefcase size={14} color="$color10" />,
  address: <MapPin size={14} color="$color10" />,
  location: <MapPin size={14} color="$color10" />,
  domain: <Globe size={14} color="$color10" />,
  linkedin: <Link2 size={14} color="$color10" />,
  links: <Link2 size={14} color="$color10" />,
  employees: <Users size={14} color="$color10" />,
  annual_revenue: <DollarSign size={14} color="$color10" />,
  amount: <DollarSign size={14} color="$color10" />,
  members: <Users size={14} color="$color10" />,
  ref: <Hash size={14} color="$color10" />,
  contacted: <Calendar size={14} color="$color10" />,
  close_date: <Calendar size={14} color="$color10" />,
  applied: <Calendar size={14} color="$color10" />,
  created: <Calendar size={14} color="$color10" />,
  at: <Calendar size={14} color="$color10" />,
}

type Look = { label: string; group: string; icon: (size: number, color?: ReturnType<typeof mark>) => ReactNode; fields: FieldDefinition[]; empty: string }

/** How each section is named, where it sits in the navigator, and which columns it draws. */
const LOOK: Record<Section, Look> = {
  people: { label: 'People', group: 'People', icon: (s, c) => <Users size={s} color={c} />, fields: PERSON_FIELDS, empty: 'No people in this CRM yet.' },
  leads: { label: 'Leads', group: 'People', icon: (s, c) => <UserPlus size={s} color={c} />, fields: PERSON_FIELDS, empty: 'No one is a lead.' },
  customers: { label: 'Customers', group: 'People', icon: (s, c) => <UserCheck size={s} color={c} />, fields: PERSON_FIELDS, empty: 'No one is a customer yet.' },
  investors: { label: 'Investors', group: 'People', icon: (s, c) => <TrendingUp size={s} color={c} />, fields: PERSON_FIELDS, empty: 'No one is marked as an investor.' },
  companies: { label: 'Companies', group: 'Companies', icon: (s, c) => <Building2 size={s} color={c} />, fields: COMPANY_FIELDS, empty: 'No companies in this CRM yet.' },
  funds: { label: 'Funds', group: 'Companies', icon: (s, c) => <Landmark size={s} color={c} />, fields: COMPANY_FIELDS, empty: 'No company is marked as an investor.' },
  opportunities: { label: 'Opportunities', group: 'Pipeline', icon: (s, c) => <Target size={s} color={c} />, fields: OPPORTUNITY_FIELDS, empty: 'No opportunities yet.' },
  forms: { label: 'Forms', group: 'Inbound', icon: (s, c) => <FileText size={s} color={c} />, fields: FORM_FIELDS, empty: 'No forms have been filed.' },
  candidates: { label: 'Candidates', group: 'Inbound', icon: (s, c) => <GraduationCap size={s} color={c} />, fields: CANDIDATE_FIELDS, empty: 'No one has applied yet.' },
  errors: { label: 'Runtime errors', group: 'Inbound', icon: (s, c) => <Activity size={s} color={c} />, fields: ERROR_FIELDS, empty: 'No errors captured.' },
  lists: { label: 'Lists', group: 'Engagement', icon: (s, c) => <Layers size={s} color={c} />, fields: LIST_FIELDS, empty: 'No lists yet.' },
}

export function CrmNav() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = SECTIONS.filter((s) => !q || LOOK[s].label.toLowerCase().includes(q))
  const groups = [...new Set(rows.map((s) => LOOK[s].group))]
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
              .filter((s) => LOOK[s].group === g)
              .map((s) => (
                <Row key={s} to={`/crm/${s}`} icon={LOOK[s].icon(15, mark(s))}>
                  {LOOK[s].label}
                </Row>
              ))}
          </YStack>
        ))}
      </Roll>
    </Column>
  )
}

/** The count beside a section's title: how many the org holds, and how many of them are drawn. */
const tally = (sheet: Sheet, section: Section): string => {
  if (section === 'errors') return `${sheet.rows.length.toLocaleString()} most recent`
  const all = `${sheet.total.toLocaleString()} total`
  return sheet.rows.length < sheet.total ? `first ${sheet.rows.length.toLocaleString()} of ${all}` : all
}

/** `/crm/:section`. An address that is not a section's own is replaced by the one it names. */
export function CrmScreen() {
  const { section: raw } = useParams()
  const { section, exact } = sectionOf(raw)
  if (!exact) return <Navigate to={`/crm/${section}`} replace />
  return <SectionView key={section} section={section} />
}

function SectionView({ section }: { section: Section }) {
  const read = useRead(`crm:${section}`, () => readSection(section))
  const [selected, setSelected] = useState<Record_ | null>(null)
  const [width, setWidth] = useState(0)
  const beside = docked(width)
  const look = LOOK[section]
  const tone = useMemo(() => chip(section), [section])
  const sheet = read.phase === 'ready' ? read.data : undefined
  const title = (r: Record_) => String(r.name || r.subject || r.message || r.email || look.label)

  return (
    <Density value="compact">
      <YStack flex={1} minH={0} bg="$background" {...{ 'data-crm': '' }}>
        <XStack height={44} px="$3" items="center" justify="space-between" borderBottomWidth={1} borderColor="$borderColor" gap="$2">
          <XStack items="center" gap="$2">
            <XStack width={22} height={22} rounded="$2" items="center" justify="center" style={{ backgroundColor: tone.background, color: tone.color }}>
              {look.icon(14)}
            </XStack>
            <SizableText fontSize={14} fontWeight="600" color="$color12">
              {look.label}
            </SizableText>
            {sheet ? (
              <SizableText fontSize={12} color="$color10">
                {tally(sheet, section)}
              </SizableText>
            ) : null}
          </XStack>
          <Button
            size="xs"
            height={24}
            px="$2"
            chromeless
            startIcon={<RefreshCw size={12} />}
            onPress={() => {
              setSelected(null)
              read.reload()
            }}
          >
            <SizableText fontSize={12} color="$color10">Refresh</SizableText>
          </Button>
        </XStack>

        {read.phase === 'failure' ? (
          <YStack p="$4" gap="$2" maxW={560}>
            {unopened(read.error) && section !== 'errors' ? (
              <>
                <SizableText fontSize={13} fontWeight="600" color="$color12">This organization has no CRM yet.</SizableText>
                <SizableText fontSize={12} color="$color10">
                  The CRM keeps its records in the organization's Base, and this one has none. Hanzo CRM is in beta: an organization
                  gets it by joining the beta at hanzo.ai/beta.
                </SizableText>
              </>
            ) : (
              <>
                <SizableText fontSize={13} fontWeight="600" color="$color12">This list could not be read.</SizableText>
                <SizableText fontSize={12} color="$color10">{read.error?.message ?? 'The read failed.'}</SizableText>
              </>
            )}
          </YStack>
        ) : !sheet ? (
          // Waiting and empty are said here, at the left, rather than by the table:
          // the table centres its spinner and its empty line across every column,
          // which puts both past the right edge of any screen narrower than them.
          <XStack p="$4" items="center" gap="$2">
            <Spinner size={16} />
            <SizableText fontSize={13} color="$color10">{`Reading ${look.label.toLowerCase()}…`}</SizableText>
          </XStack>
        ) : sheet.rows.length === 0 ? (
          <YStack p="$4" maxW={560}>
            <SizableText fontSize={13} color="$color10">{look.empty}</SizableText>
          </YStack>
        ) : (
          <XStack flex={1} minW={0} minH={0} position="relative" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            <ScrollArea flex={1} minW={0} minH={0}>
              <RecordsView
                fields={look.fields}
                records={sheet.rows}
                editable={false}
                selectable={false}
                defaultKind="table"
                boardDisabled
                {...({ fieldIcons: FIELD_ICONS } as Record<string, unknown>)}
                onOpen={(r) => setSelected(r as Record_)}
                empty={look.empty}
              />
            </ScrollArea>
            {selected ? (
              <YStack
                {...(beside
                  ? { width: DETAIL, shrink: 0, borderLeftWidth: 1 }
                  : { position: 'absolute' as const, t: 0, r: 0, b: 0, l: 0, z: 1 })}
                borderColor="$borderColor"
                bg="$background"
              >
                <XStack height={44} px="$3" items="center" justify="space-between" borderBottomWidth={1} borderColor="$borderColor">
                  <SizableText fontSize={13} fontWeight="600" color="$color12" numberOfLines={1}>
                    {title(selected)}
                  </SizableText>
                  <Button size="xs" width={26} height={26} p="$0" chromeless onPress={() => setSelected(null)}>
                    <X size={14} color="$color10" />
                  </Button>
                </XStack>
                <ScrollArea flex={1} minH={0}>
                  <YStack p="$3">
                    <RecordDetail fields={look.fields} record={selected} />
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
