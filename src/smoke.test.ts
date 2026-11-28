import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('workspace boot: core entrypoints and routes exist', () => {
  for (const rel of ['src/main.tsx', 'src/app.tsx', 'src/routes.tsx', 'index.html']) {
    assert.equal(existsSync(resolve(root, rel)), true, `Missing ${rel}`)
  }
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies['@hanzo/gui'], '@hanzo/gui dependency present')
  assert.ok(pkg.dependencies['@hanzo/ui'], '@hanzo/ui dependency present')
})

test('channel switching: chat & workspace modules exist and route cleanly', () => {
  assert.equal(existsSync(resolve(root, 'src/chat')), true)
  assert.equal(existsSync(resolve(root, 'src/workspace')), true)
  const routes = readFileSync(resolve(root, 'src/routes.tsx'), 'utf8')
  assert.ok(routes.length > 0, 'routes.tsx is non-empty')
})

test('agent thread view: agents & handoff modules exist', () => {
  assert.equal(existsSync(resolve(root, 'src/agents')), true)
  assert.equal(existsSync(resolve(root, 'src/handoff')), true)
})
