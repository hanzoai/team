import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { chip, gap, mark, paint, rank, round, rung, slot, state } from './theme.ts'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SHEET = readFileSync(join(ROOT, 'theme/tokens.css'), 'utf8')

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const source = walk(ROOT).filter((p) => /\.(ts|tsx|css)$/.test(p))

/**
 * A custom property nobody declared resolves to NOTHING and reports no error —
 * the menu that painted transparent, and the white hairline on every pricing
 * card. The type system cannot see inside a template string, so this is the
 * only place it can be caught.
 */
test('every role a component can reach is declared', () => {
  const named = [
    ...Object.values(paint),
    ...Object.values(state),
    mark('anything'),
    chip('anything').background,
    chip('anything').color,
    rank(1).background,
    rank(1).color,
    rank(4).background,
    rank(4).color,
  ]
  for (const value of named) {
    const token = /var\((--[a-z0-9-]+)/.exec(value)?.[1]
    assert.ok(token, `${value} is not a var() reference`)
    assert.ok(
      SHEET.includes(`${token}:`) || !token.startsWith('--team-'),
      `${token} is reached by a component and declared nowhere`,
    )
  }
})

test('every slot the ring can produce is declared', () => {
  const slots = new Set<number>()
  for (let i = 0; i < 500; i++) slots.add(slot(`id-${i}`))
  for (const n of slots) assert.ok(SHEET.includes(`--team-hue-${n}:`), `--team-hue-${n} is undeclared`)
})

/**
 * The sheet is the only place a colour is chosen. A literal anywhere else is a
 * second palette, and two palettes is how the same product ends up two
 * products — so the check is over the whole tree rather than over one region.
 *
 * The one shape it admits is a `var(--token, literal)` fallback, which is not a
 * choice: it is the token's own published value, restated so a host that mounts
 * no sheet still renders something rather than nothing.
 */
test('no module outside the sheet chooses a colour or duplicates hex literals', () => {
  const LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsla?\(/
  const HEX_ANYWHERE = /#[0-9a-fA-F]{3,8}\b/
  const guilty: string[] = []
  for (const path of source) {
    if (/[/\\]theme[/\\]tokens\.css$/.test(path) || path.endsWith('.test.ts')) continue
    for (const [n, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue
      const withoutLineComment = line.replace(/\/\/.*$/, '')
      const code = withoutLineComment.replace(/var\([^)]*\)/g, '')
      if (LITERAL.test(code) || HEX_ANYWHERE.test(withoutLineComment)) {
        guilty.push(`${path.slice(ROOT.length)}:${n + 1}  ${line.trim()}`)
      }
    }
  }
  assert.deepEqual(guilty, [])
})

test('a role lands on a published gui rung, never on a number', () => {
  for (const value of [...Object.values(rung), ...Object.values(gap), ...Object.values(round)]) {
    assert.match(value, /^\$\d+$/, `${value} is not a gui token`)
  }
})
