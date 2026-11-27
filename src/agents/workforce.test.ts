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
  mapBackendAgents,
  resetWorkforceStore,
  setHumanPresence,
  setWorkforceAgents,
} from './workforce.ts'

test('Workforce store starts empty (no static fake agents) and maps backend /v1/agents + /v1/bot/members', () => {
  resetWorkforceStore()
  assert.equal(DEPARTMENTS.length, 6)
  assert.equal(getWorkforceAgents().length, 0)

  const mapped = mapBackendAgents(
    [
      {
        id: 'agent_1',
        name: 'dev',
        model: 'zen6-coder',
        description: 'Systems engineering agent',
        status: 'ready',
        executionMode: 'one-shot',
        runCount: 4,
      },
      {
        id: 'agent_retired',
        name: 'old',
        model: 'zen6-coder',
        status: 'retired',
      },
    ],
    [
      {
        id: 'agent_1',
        name: 'dev',
        userId: '22222222-2222-2222-2222-222222222222',
        personRef: 'person-22222222-2222-2222-2222-222222222222',
        active: true,
      },
      {
        id: 'agent_2',
        name: 'qa',
        userId: '33333333-3333-3333-3333-333333333333',
        personRef: 'person-33333333-3333-3333-3333-333333333333',
        active: true,
      },
    ],
  )

  setWorkforceAgents(mapped)
  assert.equal(getWorkforceAgents().length, 2)
  assert.equal(getAgentByHandle('@dev')?.userId, '22222222-2222-2222-2222-222222222222')
  assert.equal(getAgentByHandle('qa')?.id, 'agent_2')
  assert.equal(getAgentByHandle('old'), undefined)
})

test('assignToAgent, approveAgentTask, interruptAgent, and opt-in presence update state cleanly', () => {
  resetWorkforceStore()
  setWorkforceAgents(
    mapBackendAgents(
      [
        { id: 'a1', name: 'core', model: 'zen6-coder', status: 'ready' },
        { id: 'a2', name: 'qa', model: 'zen6-coder', status: 'ready' },
      ],
      [],
    ),
  )

  const assigned = assignToAgent('@core', 'Benchmark QUIC transport framing', '/spaces/eval')
  assert.ok(assigned)
  assert.equal(assigned.state, 'executing')
  assert.equal(assigned.currentAssignment, 'Benchmark QUIC transport framing')
  assert.equal(agentStateLabel(assigned.state), 'Executing assigned task')

  const paused = interruptAgent('core')
  assert.ok(paused)
  assert.equal(paused.state, 'idle')
  assert.equal(agentStateLabel(paused.state), 'Ready')

  const approved = approveAgentTask('@qa')
  assert.ok(approved)
  assert.equal(approved.state, 'idle')
  assert.equal(approved.progress, 100)

  const prefs = setHumanPresence({ availability: 'focus', shareActivity: false })
  assert.equal(prefs.availability, 'focus')
  assert.equal(prefs.shareActivity, false)
})
