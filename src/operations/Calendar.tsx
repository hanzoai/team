import { useState } from 'react'
import type { RecordRow } from './catalog'

export function Calendar({ posts, open }: { posts: RecordRow[]; open: (r: RecordRow) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const year = month.getFullYear()
  const m = month.getMonth()
  const start = (month.getDay() + 6) % 7
  const end = new Date(year, m + 1, 0).getDate()
  const days = new Map<number, RecordRow[]>()
  for (const post of posts) {
    const date = new Date(Number(post.scheduleAt) * 1000)
    if (date.getFullYear() === year && date.getMonth() === m) {
      days.set(date.getDate(), [...(days.get(date.getDate()) ?? []), post])
    }
  }
  return (
    <section aria-label="Monthly content calendar">
      <div className="ops-toolbar">
        <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="ops-controls">
          <button aria-label="Previous month" onClick={() => setMonth(new Date(year, m - 1, 1))}>
            ‹
          </button>
          <button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
          <button aria-label="Next month" onClick={() => setMonth(new Date(year, m + 1, 1))}>
            ›
          </button>
        </div>
      </div>
      <div className="ops-month">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={'pad' + i} />
        ))}
        {Array.from({ length: end }, (_, i) => (
          <div key={i} className="ops-day">
            <small>{i + 1}</small>
            {days.get(i + 1)?.map((p, j) => (
              <button key={String(p.id ?? j)} onClick={() => open(p)} title={String(p.content)}>
                {String(p.channel)} · {String(p.content)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
