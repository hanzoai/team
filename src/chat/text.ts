/**
 * The wire's text format, both directions.
 *
 * A message is stored as markup — the platform's `TypeMarkup` — and the server
 * writes it as one escaped `<p>` per non-empty line (cloud `apps/team/chat.go`,
 * `htmlMarkup`). Reading it back is that function inverted, and both halves are
 * here so they cannot drift into two different ideas of what a line is.
 *
 * Lines, not a string with newlines in it: a renderer that receives one string
 * has to split it again, and the two splits then disagree about a trailing
 * blank. The wire's own unit is the paragraph, so that is the unit here.
 */

/** Markup to the lines a reader sees. Empty markup is no lines, never `['']`. */
export const lines = (markup: string): string[] =>
  (isDoc(markup) ? docText(markup) : markup)
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((l) => unescape(l).trim())
    .filter((l) => l !== '')

/** A mention-bearing JSON document, the form the server writes its own answers in. */
const isDoc = (m: string): boolean => m.trimStart().startsWith('{"type"')

type Node = { type?: string; text?: string; attrs?: { label?: string }; content?: Node[] }

/** A stored JSON document as paragraphs of text, a mention as `@name`. */
const docText = (m: string): string => {
  let root: Node
  try {
    root = JSON.parse(m) as Node
  } catch {
    return m
  }
  const inline = (n: Node): string =>
    n.type === 'reference' ? `@${n.attrs?.label ?? ''}` : (n.text ?? '') + (n.content ?? []).map(inline).join('')
  return (root.content ?? []).map((p) => `<p>${escape(inline(p))}</p>`).join('')
}

/** Somebody a message can mention: the roster's uuid and spoken name. */
export type Mentionable = { id: string; name: string }

/**
 * The lines a person typed, back to the markup the platform stores.
 *
 * With a roster, `@Name` naming somebody on it becomes the reference node the
 * server detects (`person-<uuid>`, cloud apps/team markup.go): a plain `@Dev`
 * is only text, and no agent is woken by text. Without a match the markup is
 * the paragraphs it always was.
 */
export const markup = (text: string, roster: readonly Mentionable[] = []): string => {
  const doc = mentions(text, roster)
  return doc ?? plain(text)
}

const mentions = (text: string, roster: readonly Mentionable[]): string | null => {
  const byName = new Map<string, Mentionable>()
  for (const p of roster) if (p.name.trim()) byName.set(p.name.trim().toLowerCase(), p)
  if (byName.size === 0) return null
  let found = false
  const paras = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l !== '')
    .map((l) => {
      const content: Node[] = []
      let at = 0
      for (const m of l.matchAll(/(?<![\w.@-])@([\w.-]+)/g)) {
        const who = byName.get(m[1]!.replace(/[.-]+$/, '').toLowerCase())
        if (!who) continue
        const end = m.index + 1 + m[1]!.replace(/[.-]+$/, '').length
        if (m.index > at) content.push({ type: 'text', text: l.slice(at, m.index) })
        content.push({
          type: 'reference',
          attrs: { id: `person-${who.id}`, objectclass: 'contact:class:Person', label: who.name },
        } as Node)
        at = end
        found = true
      }
      if (at < l.length) content.push({ type: 'text', text: l.slice(at) })
      return { type: 'paragraph', content }
    })
  return found ? JSON.stringify({ type: 'doc', content: paras }) : null
}

const plain = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l !== '')
    .map((l) => `<p>${escape(l)}</p>`)
    .join('') || '<p></p>'

const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#34;': '"',
  '&nbsp;': ' ',
}

// `&amp;` last would double-decode `&amp;lt;` into `<`. One pass over the
// alternation instead, so every entity is read exactly once.
const unescape = (s: string): string =>
  s.replace(/&(?:amp|lt|gt|quot|nbsp|#39|#34);/g, (m) => entities[m] ?? m)

const escape = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`)

/**
 * What a line is made of.
 *
 * A mention and a link are the two things inside a message that are not prose,
 * and both are drawn differently — so the split happens once, here, rather than
 * in the component with a regex per render.
 */
export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; value: string }
  | { kind: 'link'; value: string }

// A mention runs to the first character that cannot be in a handle. `@everyone`
// is not special here: it is a handle like any other, and what it MEANS is the
// notification plane's question, not the renderer's.
//
// The `@` must OPEN a word. Without that, `z@hanzo.ai` reads as a mention of
// `@hanzo.ai` — so every email address in a conversation became a highlighted
// mention of a person who does not exist.
const pattern = /(?<![\w.@-])(@[\w.-]+)|(https?:\/\/[^\s<>()]+)/g

export const tokens = (line: string): Token[] => {
  const out: Token[] = []
  let at = 0
  for (const m of line.matchAll(pattern)) {
    const i = m.index
    if (i > at) out.push({ kind: 'text', value: line.slice(at, i) })
    out.push(m[1] ? { kind: 'mention', value: m[1] } : { kind: 'link', value: m[2] })
    at = i + m[0].length
  }
  if (at < line.length) out.push({ kind: 'text', value: line.slice(at) })
  return out
}
