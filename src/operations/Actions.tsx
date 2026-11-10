import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { Briefcase, Calendar, ChevronRight, ClipboardList } from '@hanzogui/lucide-icons-2'
import { useSpace } from '~/data/space'
import { useSession } from '~/data/session'
import { standing } from '~/data/fixture'
import { Socket, type Plane } from '~/data/socket'
import type { Project } from '~/data/model'
import { projects as readProjects } from '~/data/tracker'
import { board } from '~/serve'
import type { Issue } from '~/tracker/board/model'
import { views } from './catalog'

const groups = ['Publishing', 'CRM & Growth']
export function Actions() {
  const { state: handoff } = useLocation()
  const { current, plane: shellPlane } = useSpace()
  const { standing: session } = useSession()
  const preview = standing !== 'live'
  const signedOut = !preview && session !== 'in'
  // A default space in Team may use its local exploration board. Shared operations
  // need the transactor's acknowledgement before a handoff is shown as saved.
  const [plane, setPlane] = useState<Plane | null>(null)
  useEffect(() => {
    if (signedOut || !current) return
    if (preview || shellPlane instanceof Socket) {
      setPlane(shellPlane)
      return
    }
    const real = new Socket(current.url)
    setPlane(real)
    return () => real.close()
  }, [current, shellPlane, preview, signedOut])
  const source = useMemo(() => (plane ? board(plane) : null), [plane])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Issue[] | null>(null)
  const [issueError, setIssueError] = useState('')
  const [project, setProject] = useState('')
  const [title, setTitle] = useState<string>(typeof handoff?.taskTitle === 'string' ? handoff.taskTitle : '')
  const [kind, setKind] = useState(handoff?.taskKind === 'Follow-up' ? 'Follow-up' : 'Review')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState('Open')
  const target = useMemo(() => (plane && project ? board(plane, project) : null), [plane, project])
  useEffect(() => {
    if (!plane) return
    let live = true
    void readProjects(plane)
      .then((rows) => {
        if (live) setProjects(rows)
      })
      .catch((e) => {
        if (live) setIssueError(String(e))
      })
    return () => {
      live = false
    }
  }, [plane])
  useEffect(() => source?.watch(setTasks, (e) => setIssueError(e.message)), [source])
  async function add(e: FormEvent) {
    e.preventDefault()
    if (!project || !title.trim() || !target?.add || busy) return
    setBusy(true)
    try {
      await target.add('todo', title.trim(), { labels: ['Operations', kind] })
      setTitle('')
      setFeedback('Task added to Tracker.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Task could not be added.')
    } finally {
      setBusy(false)
    }
  }
  const queue = tasks?.filter(
    (t) =>
      (status === 'Done') === (t.status === 'done') &&
      (t.labels.includes('Operations') ||
        /outreach|publish|campaign|editorial|lead|press|consent|social|follow.up/i.test(
          t.title + ' ' + t.labels.join(' '),
        )),
  )
  return (
    <>
      <div className="ops-shortcuts">
        {(
          [
            ['reviews', 'Editorial review', 'Drafts & approvals', ClipboardList],
            ['calendar', 'Publishing schedule', 'Content calendar', Calendar],
            ['outreach', 'Lead follow-up', 'Outreach tasks', Briefcase],
          ] as const
        ).map(([id, title, sub, Icon]) => {
          return (
            <Link className="ops-shortcut" key={id} to={'/operations/' + id}>
              <Icon size={19} />
              <strong>{title}</strong>
              <span>
                {sub} <ChevronRight size={13} />
              </span>
            </Link>
          )
        })}
      </div>
      <section className="ops-section">
        <div className="ops-toolbar">
          <h2>Work queue</h2>
          <select aria-label="Task status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Open</option>
            <option>Done</option>
          </select>
        </div>
        {signedOut ? (
          <p>
            <a href="/login">Sign in</a> to open the shared work queue.
          </p>
        ) : issueError ? (
          <p role="alert">{issueError}</p>
        ) : !queue ? (
          <p>Loading tasks…</p>
        ) : !queue.length ? (
          <p>No {status.toLowerCase()} operations tasks.</p>
        ) : (
          <div className="ops-list">
            {queue.map((t) => (
              <div className="ops-task" key={t.id}>
                <button
                  disabled={busy || !source}
                  aria-label={(status === 'Done' ? 'Reopen ' : 'Complete ') + t.title}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await source?.move(t.id, t.status === 'done' ? 'todo' : 'done')
                    } catch (e) {
                      setFeedback(String(e))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {t.status === 'done' ? '✓' : '○'}
                </button>
                <Link
                  to={t.projectId ? '/projects/' + encodeURIComponent(t.projectId) + '/issues' : '/issues'}
                >
                  <small>{t.key}</small>
                  {t.title}
                </Link>
                <span>{t.people.map((p) => p.name).join(', ') || 'Unassigned'}</span>
              </div>
            ))}
          </div>
        )}
        {!signedOut && (
          <form className="ops-form" onSubmit={add}>
            <h3>Create a task</h3>
            <input
              aria-label="Task title"
              placeholder="What needs to happen?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={250}
            />
            <div className="ops-controls">
              <select
                aria-label="Project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                required
              >
                <option value="">Choose project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select aria-label="Task type" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option>Review</option>
                <option>Follow-up</option>
                <option>Campaign</option>
              </select>
              <button className="primary" disabled={busy || !project || !title.trim()}>
                Add task
              </button>
            </div>
          </form>
        )}
        {feedback && <p role="status">{feedback}</p>}
      </section>
      <div className="ops-workflows">
        {groups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            {views
              .filter((v) => v.group === group)
              .map((v) => (
                <Link key={v.id} to={'/operations/' + v.id}>
                  {v.title}
                  <ChevronRight size={14} />
                </Link>
              ))}
          </section>
        ))}
      </div>
    </>
  )
}
