import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

test('/files route mounts a real deliverables component instead of redirecting to /chat', () => {
  const routesSrc = readFileSync(join(ROOT, 'routes.tsx'), 'utf8')
  const filesRouteMatch = routesSrc.match(/\{[^}]*path:\s*['"]\/files['"][^}]*\}/)
  assert.ok(filesRouteMatch, 'routes.tsx must declare a /files route')
  const filesRoute = filesRouteMatch[0]
  assert.ok(
    !filesRoute.includes('<Navigate to="/chat"'),
    '/files route must not redirect to /chat',
  )
  assert.match(
    filesRoute,
    /<[A-Z][A-Za-z0-9]*/,
    '/files route must mount a real deliverables React component',
  )
})

test('IssueDrawer renders handoffNextAction and deliverable version history', () => {
  const drawerSrc = readFileSync(join(ROOT, 'tracker/IssueDrawer.tsx'), 'utf8')
  assert.ok(drawerSrc.includes('handoffNextAction'), 'IssueDrawer must reference handoffNextAction')
  assert.ok(drawerSrc.includes('Latest · v'), 'IssueDrawer must render Latest · v')
  assert.ok(drawerSrc.includes('Prior versions'), 'IssueDrawer must render Prior versions')
})

test('ApprovalCard renders handoffNextAction', () => {
  const cardSrc = readFileSync(join(ROOT, 'inbox/ApprovalCard.tsx'), 'utf8')
  assert.ok(cardSrc.includes('handoffNextAction'), 'ApprovalCard must reference handoffNextAction')
})
