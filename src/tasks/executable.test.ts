import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resetWorkforceStore, getAgentByHandle } from '../agents/workforce.ts'
import { resetHandoffStore, getHandoffs } from '../handoff/store.ts'
import {
  delegateExecutableTask,
  detectComposerExecutableHint,
  extractExecutableTasks,
  parseExecutableTaskLine,
  resetExecutableTasks,
  toggleExecutableTaskDone,
} from './executable.ts'

test('parseExecutableTaskLine and extractExecutableTasks detect @agent markdown tasks accurately', () => {
  const unchecked = parseExecutableTaskLine('- [ ] @dev Implement spatial floor plan')
  assert.deepEqual(unchecked, {
    checked: false,
    agentHandle: 'dev',
    title: 'Implement spatial floor plan',
    raw: '- [ ] @dev Implement spatial floor plan',
  })

  const checked = parseExecutableTaskLine('  * [X] @qa Run Playwright contrast suite  ')
  assert.ok(checked)
  assert.equal(checked.checked, true)
  assert.equal(checked.agentHandle, 'qa')
  assert.equal(checked.title, 'Run Playwright contrast suite')

  assert.equal(parseExecutableTaskLine('- [ ] Regular todo without agent mention'), null)
  assert.equal(parseExecutableTaskLine('Plain paragraph mentioning @dev'), null)

  const doc = [
    '# Release Notes',
    '- [ ] @sec Verify KMS rotation',
    '- [x] @opera Roll out edge config',
    '- Plain bullet',
  ].join('\n')
  const tasks = extractExecutableTasks(doc)
  assert.equal(tasks.length, 2)
  assert.equal(tasks[0]?.agentHandle, 'sec')
  assert.equal(tasks[1]?.checked, true)
})

test('detectComposerExecutableHint surfaces subtle inline hint while typing', () => {
  assert.deepEqual(detectComposerExecutableHint('- [ ] @dev Wire Spaces version diff'), {
    agentHandle: 'dev',
    title: 'Wire Spaces version diff',
  })
  assert.equal(detectComposerExecutableHint('Hello @dev how are you?'), null)
})

test('delegateExecutableTask authorizes execution, updates specialist desk, and files handoff provenance', () => {
  resetExecutableTasks()
  resetWorkforceStore()
  resetHandoffStore()

  const delegated = delegateExecutableTask({
    sourceKind: 'space',
    sourceId: 'release-v1-1-0',
    sourceLabel: 'Release Checklist v1.1.0',
    sourcePath: '/spaces/release-v1-1-0',
    agentHandle: '@qa',
    title: 'Verify Linux RGBA window corners',
    handedOffBy: 'Zach',
  })
  assert.equal(delegated.state, 'running')
  assert.equal(getAgentByHandle('qa')?.currentAssignment, 'Verify Linux RGBA window corners')
  assert.ok(getHandoffs().some((h) => h.title === 'Verify Linux RGBA window corners'))

  const done = toggleExecutableTaskDone({
    sourceKind: 'space',
    sourceId: 'release-v1-1-0',
    sourceLabel: 'Release Checklist v1.1.0',
    sourcePath: '/spaces/release-v1-1-0',
    agentHandle: 'qa',
    title: 'Verify Linux RGBA window corners',
  })
  assert.equal(done.state, 'done')
})
