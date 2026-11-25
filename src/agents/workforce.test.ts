import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  agentStateLabel,
  approveAgentTask,
  assignToAgent,
  DEPARTMENTS,
  getAgentByHandle,
  getWorkforceAgents,
  interruptAgent,
  resetWorkforceStore,
  setHumanPresence,
} from './workforce.ts'

test('Workforce registry covers all 6 HQ departments and Zen 6 / Enso models', () => {
  resetWorkforceStore()
  assert.equal(DEPARTMENTS.length, 6)
  const agents = getWorkforceAgents()
  assert.equal(agents.length, 24)
  for (const dept of DEPARTMENTS) {
    assert.ok(agents.some((a) => a.department === dept.id), `missing specialist for ${dept.id}`)
  }
  for (const h of ['dev', 'core', 'db', 'qa', 'sci', 'algo', 'data', 'des', 'mana', 'cyber', 'opera', 'vi']) {
    assert.ok(getAgentByHandle(`@${h}`), `missing @${h}`)
  }
  // Never reference obsolete model generations
  for (const a of agents) {
    assert.match(a.model, /^(zen6-coder|zen6-ultra|enso-auto)$/)
  }
})

test('assignToAgent, approveAgentTask, interruptAgent, and opt-in presence update state cleanly', () => {
  resetWorkforceStore()
  const assigned = assignToAgent('@core', 'Benchmark QUIC transport framing', '/spaces/zen6-eval-report')
  assert.ok(assigned)
  assert.equal(assigned.state, 'executing')
  assert.equal(assigned.currentAssignment, 'Benchmark QUIC transport framing')
  assert.equal(agentStateLabel(assigned.state), 'Executing assigned task')

  const paused = interruptAgent('core')
  assert.ok(paused)
  assert.equal(paused.state, 'idle')
  assert.equal(agentStateLabel(paused.state), 'Idle · Event-driven')

  const approved = approveAgentTask('@qa')
  assert.ok(approved)
  assert.equal(approved.state, 'idle')
  assert.equal(approved.progress, 100)

  const prefs = setHumanPresence({ availability: 'focus', shareActivity: false })
  assert.equal(prefs.availability, 'focus')
  assert.equal(prefs.shareActivity, false)
})
