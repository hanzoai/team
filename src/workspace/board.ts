/**
 * Local reactive Tracker Board (`Source`) so `/issues` (`Work`) renders a live,
 * draggable, editable Linear-grade Kanban, List, and Timeline out-of-the-box
 * even when no remote Transactor WebSocket plane is connected.
 */
import type { Issue, IssuePatch, Person, Source, Status } from '../tracker/board/model.ts'

const LOCAL_PEOPLE: readonly Person[] = [
  { id: 'zach', name: 'Zach Kelling', face: '/agents/zach.jpg' },
  { id: 'dev', name: 'Hanzo Dev', face: '/agents/dev.png', bot: true },
  { id: 'cyber', name: 'Hanzo Cyber', face: '/agents/cyber.png', bot: true },
  { id: 'sci', name: 'Hanzo Sci', face: '/agents/sci.png', bot: true },
  { id: 'qa', name: 'Hanzo QA', face: '/agents/opera.png', bot: true },
  { id: 'sara', name: 'Sara Chen', face: '/agents/antje.jpg' },
]

const SEED_ISSUES: Issue[] = [
  {
    id: 'iss-101',
    key: 'TEAM-101',
    title: 'W3C-safe Linux 12px/24px curved frameless RGBA outer corners',
    description: 'Ensure html & body remain transparent when unmaximized and #root clips cleanly with ::after 1px border ring.',
    projectId: 'proj-team',
    status: 'done',
    priority: 'urgent',
    labels: ['Desktop', 'Linux'],
    done: 1,
    people: [LOCAL_PEOPLE[0]!, LOCAL_PEOPLE[1]!],
    origin: { name: 'Tauri Shell' },
    files: 2,
    replies: 4,
  },
  {
    id: 'iss-102',
    key: 'TEAM-102',
    title: 'Discord × Mattermost 4-column workspace + simultaneous Thread RHS',
    description: '56px Guild Rail, 244px Channel & Voice sidebar, fluid Main Stage, and 296px Thread/Roster right pane.',
    projectId: 'proj-team',
    status: 'progress',
    priority: 'urgent',
    labels: ['UI', 'v1.1.0'],
    done: 0.85,
    people: [LOCAL_PEOPLE[1]!, LOCAL_PEOPLE[0]!],
    origin: { name: 'Shell' },
    files: 3,
    replies: 6,
  },
  {
    id: 'iss-103',
    key: 'TEAM-103',
    title: 'Roam-style Virtual Office Bento HQ + 4-Floor Skyscraper Elevator',
    description: 'Interactive Theater, Meeting Room, click-head Wave/Knock/Chat popovers, and birds-eye floor switcher.',
    projectId: 'proj-team',
    status: 'progress',
    priority: 'high',
    labels: ['Office', 'RTC'],
    done: 0.75,
    people: [LOCAL_PEOPLE[1]!, LOCAL_PEOPLE[4]!],
    origin: { name: 'Virtual HQ' },
    files: 1,
    replies: 3,
  },
  {
    id: 'iss-104',
    key: 'TEAM-104',
    title: 'Zen 6 Enso Auto-Router benchmark sweep & TTFT optimization',
    description: 'Validate 98.4% pass@1 accuracy and sub-40ms TTFT across 412 evaluation prompts.',
    projectId: 'proj-team',
    status: 'todo',
    priority: 'high',
    labels: ['Zen 6', 'Research'],
    done: 0.4,
    people: [LOCAL_PEOPLE[3]!, LOCAL_PEOPLE[5]!],
    origin: { name: 'Inference' },
    files: 2,
    replies: 2,
  },
  {
    id: 'iss-105',
    key: 'TEAM-105',
    title: 'Audit OSS @hanzo/ui pixel hygiene & zero cartoon blurple compliance',
    description: '- [ ] @cyber Verify zero literal hex outside tokens.css and enforce <= 1,000 LOC across all modules.',
    projectId: 'proj-team',
    status: 'todo',
    priority: 'medium',
    labels: ['Security', 'Design'],
    done: 0.2,
    people: [LOCAL_PEOPLE[2]!],
    origin: { name: 'Design System' },
    files: 0,
    replies: 1,
  },
  {
    id: 'iss-106',
    key: 'TEAM-106',
    title: 'Hanzo Connect cross-org shared Matrix / SFU voice federation',
    description: 'Allow federated channels between Hanzo, Lux, Zoo, and Science orgs with Kai E2EE verification.',
    projectId: 'proj-team',
    status: 'backlog',
    priority: 'medium',
    labels: ['Federation', 'RTC'],
    done: 0,
    people: [LOCAL_PEOPLE[2]!, LOCAL_PEOPLE[0]!],
    origin: { name: 'Connect' },
    files: 1,
    replies: 0,
  },
]

let localIssues: Issue[] = [...SEED_ISSUES]
let seq = 107
const watchers = new Set<(rows: Issue[]) => void>()

function broadcast() {
  const copy = [...localIssues]
  for (const fn of watchers) fn(copy)
}

export const localBoardSource: Source = {
  watch(next) {
    watchers.add(next)
    next([...localIssues])
    return () => {
      watchers.delete(next)
    }
  },
  async add(to: Status, title: string, patch?: IssuePatch) {
    const num = seq++
    const assignee = patch?.assigneeId ? LOCAL_PEOPLE.find((p) => p.id === patch.assigneeId) : LOCAL_PEOPLE[1]
    const created: Issue = {
      id: `iss-${num}`,
      key: `TEAM-${num}`,
      title: title.trim() || `Untitled TEAM-${num}`,
      description: patch?.description,
      projectId: patch?.project ?? 'proj-team',
      status: to,
      priority: patch?.priority ?? 'medium',
      labels: patch?.labels ?? ['v1.1.0'],
      done: to === 'done' ? 1 : 0,
      people: assignee ? [assignee] : [],
      files: 0,
      replies: 0,
    }
    localIssues = [...localIssues, created]
    broadcast()
  },
  async move(id: string, to: Status, before?: string) {
    const target = localIssues.find((i) => i.id === id)
    if (!target) return
    const updated: Issue = { ...target, status: to, done: to === 'done' ? 1 : target.done }
    const without = localIssues.filter((i) => i.id !== id)
    if (!before) {
      localIssues = [...without, updated]
    } else {
      const idx = without.findIndex((i) => i.id === before)
      localIssues =
        idx < 0
          ? [...without, updated]
          : [...without.slice(0, idx), updated, ...without.slice(idx)]
    }
    broadcast()
  },
  async update(id: string, patch: IssuePatch) {
    localIssues = localIssues.map((iss) => {
      if (iss.id !== id) return iss
      const assignee =
        patch.assigneeId !== undefined
          ? LOCAL_PEOPLE.find((p) => p.id === patch.assigneeId)
          : undefined
      return {
        ...iss,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority ?? undefined } : {}),
        ...(patch.labels !== undefined ? { labels: patch.labels } : {}),
        ...(patch.done !== undefined ? { done: patch.done } : {}),
        ...(patch.replies !== undefined ? { replies: patch.replies } : {}),
        ...(assignee ? { people: [assignee] } : {}),
      }
    })
    broadcast()
  },
  async remove(id: string) {
    localIssues = localIssues.filter((i) => i.id !== id)
    broadcast()
  },
}

export function getLocalCrew(): Person[] {
  return [...LOCAL_PEOPLE]
}
