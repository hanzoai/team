import { YStack } from '@hanzo/ui'
import {
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Globe,
  Layers,
  RefreshCw,
  Search,
  SquareCheck,
} from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { standing } from '~/data/fixture'
import { call } from '~/data/http'
import { useSpace } from '~/data/space'
import { useSession } from '~/data/session'
import { Actions } from './Actions'
import { Group, Nav, Roll, Row } from '~/shell'
import { cells, inView, records, views, type RecordRow, type Workflow } from './catalog'
import { examples } from './examples'
import { Calendar as MonthCalendar } from './Calendar'
import { Assistance } from './Assistance'
import './operations.css'

const groups = ['Team', 'Publishing', 'CRM & Growth'] as const
const glyphs = [SquareCheck, Globe, Briefcase]
const origin = import.meta.env.DEV ? '' : 'https://api.hanzo.ai'
const sample = standing !== 'live'

export function OperationsNav() {
  return (
    <Nav title="Operations">
      <Roll>
        {groups.map((group, i) => {
          const Icon = glyphs[i]
          return (
            <YStack key={group} mb={10}>
              <Group>{group}</Group>
              {views
                .filter((v) => v.group === group)
                .map((v) => (
                  <Row key={v.id} to={'/operations/' + v.id} icon={<Icon size={14} color="$soft" />}>
                    {v.title}
                  </Row>
                ))}
            </YStack>
          )
        })}
      </Roll>
    </Nav>
  )
}

export function Operations() {
  const { view = 'actions' } = useParams()
  const space = useSpace()
  const session = useSession()
  const active = views.find((v) => v.id === view)
  if (!active) return <Navigate to="/operations/actions" replace />
  return (
    <main className="ops" key={[view, space.current?.uuid, session.who?.id].join(':')}>
      <div className="ops-trail">
        <Layers size={15} /> Team <ChevronRight size={12} /> Operations <ChevronRight size={12} />{' '}
        {active.group === 'Team' ? 'Tracker' : active.group}
      </div>
      <header className="ops-heading">
        <div>
          <h1>{active.title}</h1>
          <p>{active.description}</p>
        </div>
        <a className="ops-button" href={active.href}>
          {active.app}
          <ArrowUpRight size={15} />
        </a>
      </header>
      {sample && <small className="ops-sample">Preview workspace · {standing}</small>}
      {view === 'actions' ? (
        <Actions />
      ) : (
        <Collection view={active} org={space.org} signedIn={session.standing === 'in'} />
      )}
    </main>
  )
}

function Collection({ view, org, signedIn }: { view: Workflow; org: string | null; signedIn: boolean }) {
  const [result, setResult] = useState<RecordRow[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [edit, setEdit] = useState(false)
  const [detail, setDetail] = useState<RecordRow | null>(null)
  const path = view.path!
  const base = path.startsWith('/v1/base/')
  const ready = signedIn && Boolean(org)
  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    setError('')
    setDetail(null)
    if (sample) {
      if (standing === 'failure') setError('The service is unavailable.')
      else if (standing !== 'loading')
        setResult(
          standing === 'empty'
            ? []
            : (examples[view.id] ?? []).slice(0, standing === 'minimal' ? 1 : undefined),
        )
    } else if (ready) {
      const url = new URL(origin + path, window.location.origin)
      if (base) {
        url.searchParams.set('page', String(page))
        url.searchParams.set('perPage', '50')
      }
      void call<unknown>(url.href, { signal: controller.signal, headers: { 'X-Org-Id': org! } })
        .then((reply) => {
          if (controller.signal.aborted) return
          setResult(records(reply, path))
          setPages(base ? Number(Reflect.get(reply as object, 'totalPages')) || 1 : 1)
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Read failed.')
        })
    }
    return () => controller.abort()
  }, [path, view.id, org, ready, revision, page, base])

  async function write(path: string, body: RecordRow, message: string) {
    if (!ready || sample || busy) return
    setBusy(true)
    setNotice('')
    try {
      await call(origin + path, { method: 'POST', headers: { 'X-Org-Id': org! }, body: JSON.stringify(body) })
      setEdit(false)
      setNotice(message)
      setRevision((n) => n + 1)
    } catch (e) {
      setNotice('Could not save. ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }
  const rows = result?.filter(
    (r) =>
      inView(view.id, r) && cells(view.id, r).join(' ').toLowerCase().includes(query.trim().toLowerCase()),
  )
  if (view.id === 'calendar') rows?.sort((a, b) => Number(a.scheduleAt) - Number(b.scheduleAt))
  return (
    <>
      <div className="ops-source">
        <span>{view.app}</span>
        <code>{view.surface}</code>
      </div>
      <section className="ops-section">
        <div className="ops-toolbar">
          <label className="ops-search">
            <Search size={15} />
            <input
              aria-label={'Filter ' + view.title}
              placeholder="Filter this view…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button className="icon" aria-label="Refresh view" onClick={() => setRevision((n) => n + 1)}>
            <RefreshCw size={15} />
          </button>
          {(view.id === 'editorial' || view.id === 'suppressions') && (
            <button disabled={sample || !ready || busy} onClick={() => setEdit(!edit)}>
              {view.id === 'editorial' ? 'New draft' : 'Suppress address'}
            </button>
          )}
        </div>
        {edit && (
          <form
            className="ops-form"
            onSubmit={(e) => {
              e.preventDefault()
              const fields = new FormData(e.currentTarget)
              if (view.id === 'suppressions')
                void write(
                  path,
                  {
                    channel: 'email',
                    address: String(fields.get('email')).trim().toLowerCase(),
                    reason: String(fields.get('reason')).trim(),
                  },
                  'Address suppressed for marketing.',
                )
              else
                void write(
                  path,
                  {
                    title: String(fields.get('title')).trim(),
                    slug: fields.get('slug'),
                    body: fields.get('body'),
                    category: fields.get('category'),
                    status: 'Draft',
                  },
                  'Editorial draft saved.',
                )
            }}
          >
            {view.id === 'suppressions' ? (
              <>
                <label>
                  Email address
                  <input name="email" type="email" required />
                </label>
                <label>
                  Reason
                  <input name="reason" required pattern=".*\S.*" />
                </label>
              </>
            ) : (
              <>
                <label>
                  Headline
                  <input name="title" required pattern=".*\S.*" />
                </label>
                <label>
                  Slug
                  <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                </label>
                <label>
                  Category
                  <select name="category">
                    <option>blog</option>
                    <option>news</option>
                    <option>press</option>
                  </select>
                </label>
                <label>
                  Draft
                  <textarea name="body" required />
                </label>
              </>
            )}
            <button className="primary" disabled={busy}>
              {view.id === 'editorial' ? 'Save draft' : 'Confirm suppression'}
            </button>
          </form>
        )}
        {error ? (
          <div className="ops-state" role="alert">
            <strong>Couldn’t load {view.title.toLowerCase()}</strong>
            <p>{error}</p>
          </div>
        ) : !sample && !ready ? (
          <p className="ops-state">
            <a href="/login">Sign in</a> and open an organization to view its records.
          </p>
        ) : !rows ? (
          <p className="ops-state" role="status">
            Loading records…
          </p>
        ) : (
          <>
            {view.id === 'calendar' && <MonthCalendar posts={rows} open={setDetail} />}
            <div className="ops-table">
              <table>
                <thead>
                  <tr>
                    {view.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={String(r.id ?? r.name ?? r.address ?? i)}>
                      {cells(view.id, r).map((value, j) => (
                        <td key={j}>
                          {j === 0 ? (
                            <button className="record" onClick={() => setDetail(r)}>
                              {value}
                            </button>
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <p className="ops-state">
                {query ? 'No matching records on this page.' : 'No records in this view.'}
              </p>
            )}
            <div className="ops-count">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}
              {base && pages > 1 && (
                <>
                  <button disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
                    Previous
                  </button>
                  Page {page} of {pages}
                  <button disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
                    Next
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {detail && (
          <section className="ops-detail">
            <div className="ops-toolbar">
              <h2>Record details</h2>
              <button onClick={() => setDetail(null)}>Close</button>
            </div>
            <dl>
              {view.columns.map((c, i) => (
                <div key={c}>
                  <dt>{c}</dt>
                  <dd>{cells(view.id, detail)[i]}</dd>
                </div>
              ))}
            </dl>
            {view.id === 'editorial' && typeof detail.body === 'string' && <p>{detail.body}</p>}
            {view.id === 'reviews' && (detail.status === 'draft' || detail.status === 'in_review') && (
              <button
                disabled={!ready || sample || busy}
                onClick={() =>
                  void write(
                    '/v1/content/' +
                      encodeURIComponent(String(detail.doctype)) +
                      '/' +
                      encodeURIComponent(String(detail.name)) +
                      '/transition',
                    { to: detail.status === 'draft' ? 'in_review' : 'approved' },
                    'Review status updated.',
                  )
                }
              >
                {detail.status === 'draft' ? 'Request review' : 'Approve content'}
              </button>
            )}
          </section>
        )}
        {notice && <p role="status">{notice}</p>}
      </section>
      <div className="ops-links">
        {view.id === 'accounts' && (
          <a href="https://social.hanzo.ai/accounts">
            Link an account <ExternalLink size={14} />
          </a>
        )}
        {['calendar', 'publishing'].includes(view.id) && (
          <a href="https://social.hanzo.ai/compose">
            Schedule a post <ExternalLink size={14} />
          </a>
        )}
        {view.group === 'CRM & Growth' && (
          <a href="https://crm.hanzo.ai/">
            Manage leads in CRM <ExternalLink size={14} />
          </a>
        )}
        <Link
          to="/operations/actions"
          state={{
            taskTitle:
              detail && !['suppressions', 'consent'].includes(view.id)
                ? cells(view.id, detail)[0].slice(0, 200)
                : '',
            taskKind: view.id === 'reviews' || view.id === 'editorial' ? 'Review' : 'Follow-up',
          }}
        >
          Create a follow-up task <ChevronRight size={14} />
        </Link>
      </div>
      {view.id === 'segments' && (
        <details className="ops-agents">
          <summary>Import leads into CRM</summary>
          <ol>
            <li>
              Reconcile opt-outs, complaints and bounces against{' '}
              <Link to="/operations/suppressions">marketing suppressions</Link> before importing people.
            </li>
            <li>
              Open People in Hanzo CRM and import deduplicated contacts with their source IDs and consent
              evidence. Keep leads with unknown consent out of promotional audiences.
            </li>
            <li>
              Reconcile the imported contacts against the source batch before selecting a segment for
              follow-up.
            </li>
          </ol>
          <div className="ops-links">
            <a href="https://crm.hanzo.ai/">Open CRM People ↗</a>
            <a href="https://github.com/hanzoai/marketing/issues/3">Migration plan ↗</a>
          </div>
        </details>
      )}
      <Assistance view={view.title} org={org} enabled={ready && !sample} />
      {view.id === 'suppressions' && (
        <p className="ops-foot">
          Hanzo Notify handles transactional messages independently. Import suppressions into CRM before leads
          and retain the source and consent evidence.
        </p>
      )}
    </>
  )
}
