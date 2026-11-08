/**
 * Deterministic Inbox notifications for Hanzo Team & unit tests (`note.test.ts`).
 */
import { by, type Note, type Source } from './note.ts'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const rev = { name: 'Rev (@rev)', face: '/team/portraits/lead-08.jpg' }
const dev = { name: 'Dev (@dev)', face: '/team/portraits/lead-04.jpg' }
const zach = { name: 'Zach Kelling' }
const des = { name: 'Des (@des)', face: '/team/portraits/lead-05.jpg' }
const mana = { name: 'Mana (@mana)', face: '/team/portraits/lead-03.jpg' }
const opera = { name: 'Opera (@opera)', face: '/team/portraits/lead-02.jpg' }
const antje = { name: 'Antje Worring' }

export const sample = (now: number = Date.now()): Note[] => [
  {
    id: 'n1',
    kind: 'task',
    actor: rev,
    line: [by(rev), { text: ' reconciled $156.6K org grant on z/hanzo' }],
    at: now - 10 * MIN,
    place: 'CRM & Revenue',
    seen: false,
  },
  {
    id: 'n2',
    kind: 'task',
    actor: dev,
    line: [by(dev), { text: ' merged ' }, { text: 'Cloud & Platform', strong: true }, { text: ' transactor PR' }],
    at: now - 16 * MIN,
    place: 'Cloud & Platform',
    seen: false,
  },
  {
    id: 'n3',
    kind: 'chat',
    actor: zach,
    line: [by(zach), { text: ' in ' }, { text: '#general', strong: true }],
    quote: [{ text: '@everyone', mention: true }, { text: ' Hanzo Team is live on hanzo.team and desktop' }],
    at: now - HOUR,
    place: 'general',
    seen: true,
  },
  {
    id: 'n4',
    kind: 'task',
    actor: des,
    line: [by(des), { text: ' pinned @hanzogui/* to 8.3.5 on the ' }, { text: 'Issues', strong: true }, { text: ' board' }],
    at: now - 3 * HOUR,
    place: 'CRM & Revenue',
    seen: true,
  },
  {
    id: 'n5',
    kind: 'task',
    actor: mana,
    line: [by(mana), { text: ' changed status CRM-16 to ' }, { text: 'In Progress', strong: true }],
    at: now - 4 * HOUR,
    place: 'CRM & Revenue',
    seen: true,
  },
  {
    id: 'n6',
    kind: 'task',
    actor: opera,
    line: [by(opera), { text: ' scaled Kata CI runners for ' }, { text: 'Issues', strong: true }, { text: ' gate' }],
    at: now - 8 * HOUR,
    place: 'Hanzo Dev & AI',
    seen: true,
  },
  {
    id: 'n7',
    kind: 'task',
    actor: antje,
    line: [by(antje), { text: ' mentioned you in Enterprise Deal Desk' }],
    at: now - 9 * HOUR,
    place: 'CRM & Revenue',
    seen: true,
  },
  {
    id: 'n8',
    kind: 'chat',
    actor: dev,
    line: [by(dev), { text: ' replied' }],
    quote: [{ text: 'All 46 unit and token checks passing — shipping it' }],
    at: now - DAY,
    place: 'hanzo-ui',
    seen: true,
  },
  {
    id: 'n9',
    kind: 'task',
    actor: zach,
    line: [by(zach), { text: ' assigned ' }, { text: 'DEV-26', strong: true }, { text: ' to you' }],
    at: now - 3 * DAY,
    place: 'Hanzo Dev & AI',
    seen: true,
  },
  {
    id: 'n10',
    kind: 'task',
    actor: opera,
    line: [by(opera), { text: ' verified all 23 autonomous 24/7 bot sandboxes' }],
    at: now - 9 * DAY,
    seen: true,
  },
]

/** One unread task and nothing else — the populated-minimal state. */
export const minimal = (now: number = Date.now()): Note[] => sample(now).slice(0, 1)

/** A source that answers, once, with what it was given. */
export const still = (notes: Note[]): Source => ({
  list: () => Promise.resolve(notes),
  see: () => Promise.resolve(),
})

/** A source that never answers — the loading state, held open. */
export const waiting: Source = {
  list: () => new Promise<Note[]>(() => {}),
  see: () => Promise.resolve(),
}

/** A source that refuses — the failure state. */
export const broken: Source = {
  list: () => Promise.reject(new Error('inbox unavailable')),
  see: () => Promise.reject(new Error('inbox unavailable')),
}

/** A source that lists, then refuses the read, so the cleared row comes back. */
export const refuses = (notes: Note[]): Source => ({
  list: () => Promise.resolve(notes),
  see: () => Promise.reject(new Error('refused')),
})
