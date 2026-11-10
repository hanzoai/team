import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { call } from '~/data/http'

export function Assistance({ org, enabled, view }: { org: string | null; enabled: boolean; view: string }) {
  const [model, setModel] = useState('~x-ai/grok-latest')
  const [brief, setBrief] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!org || !enabled || !brief.trim() || busy) return
    setBusy(true)
    setError('')
    setReply('')
    try {
      const result = await call<{ choices?: { message?: { content?: string } }[] }>(
        (import.meta.env.DEV ? '' : 'https://api.hanzo.ai') + '/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'X-Org-Id': org },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'Assist the Hanzo team with ' +
                  view +
                  '. Provide a draft or next steps for human review. You have no tools, delivery permissions or access to records.',
              },
              { role: 'user', content: brief.trim() },
            ],
          }),
        },
      )
      const answer = result.choices?.[0]?.message?.content?.trim()
      if (!answer) throw new Error('The agent returned an empty response.')
      setReply(answer)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="ops-agents">
      <summary>Agent assistance</summary>
      <form className="ops-form" onSubmit={ask}>
        <label>
          Brief
          <textarea
            required
            maxLength={8000}
            placeholder="Describe the draft or follow-up you need…"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </label>
        <div className="ops-controls">
          <select aria-label="Agent" value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="~x-ai/grok-latest">Grok</option>
            <option value="hanzo/zen">Zen</option>
          </select>
          <button disabled={!enabled || !brief.trim() || busy}>{busy ? 'Working…' : 'Ask agent'}</button>
          <code>/v1/chat/completions</code>
        </div>
        {error && <p role="alert">{error}</p>}
        {reply && (
          <p className="ops-reply" role="status">
            {reply}
          </p>
        )}
      </form>
      <p>
        For native social tools, connect Grok or another MCP client to{' '}
        <code>https://api.hanzo.ai/v1/mcp</code> with a scoped Hanzo credential.
      </p>
      <div className="ops-links">
        <a href="https://docs.hanzo.ai/docs/mcp-tools/social">Social tool reference ↗</a>
        <Link to="/chat/dm-mark">Ask Mark ↗</Link>
        <Link to="/bots">Hanzo Bots ↗</Link>
      </div>
    </details>
  )
}
