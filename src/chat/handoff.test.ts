import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  approveTaskHandoff,
  createTaskHandoff,
  HANDOFF_ASSIGNEES,
  handoffsForRoom,
  readHandoffs,
  requestChangesOnHandoff,
  SEEDED_HANDOFFS,
  type StorageLike,
} from './handoff.ts'

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe('Hanzo Team Task Handoff -> Approval -> Deliverable Result (#61-#72)', () => {
  it('enforces Zen 6 SKU naming across handoff assignees and seeds (zero zen4, zen5, or qwen2)', () => {
    const serialized = JSON.stringify({ HANDOFF_ASSIGNEES, SEEDED_HANDOFFS }).toLowerCase()
    assert.equal(serialized.includes('zen4'), false)
    assert.equal(serialized.includes('zen5'), false)
    assert.equal(serialized.includes('qwen2'), false)
    assert.equal(serialized.includes('zen6'), true)
  })

  it('hands off a task from #engineering to @hanzo-dev, surfaces it in #approvals with clear owner/reason/effect, and resolves to a completed deliverable on Approve', () => {
    const storage = createMemoryStorage()

    const initial = readHandoffs(storage)
    assert.equal(initial.length, 1)
    assert.equal(initial[0]?.status, 'waiting_approval')

    const created = createTaskHandoff(
      {
        title: 'Ship mobile checkout event_id deduplication',
        deliverable: 'PR-518 + unit test trace',
        assigneeHandle: '@hanzo-dev',
        assignedBy: 'Zach',
        sourceRoomId: 'c-engineering',
        sourceRoomName: '#engineering',
        requireApproval: true,
        now: 1_763_550_000_000,
      },
      storage,
    )

    assert.equal(created.ownerHandle, '@hanzo-dev')
    assert.equal(created.sourceRoomId, 'c-engineering')
    assert.equal(created.sourceRoomName, 'engineering')
    assert.equal(created.status, 'waiting_approval')
    assert.ok(created.approvalReason.includes('#engineering'))
    assert.ok(created.approveEffect.includes('PR-518 + unit test trace'))

    // Both #engineering and #approvals see the handoff
    const inEngineering = handoffsForRoom(readHandoffs(storage), 'c-engineering')
    assert.equal(inEngineering.some((h) => h.id === created.id), true)

    const inApprovals = handoffsForRoom(readHandoffs(storage), 'c-approvals')
    const waitingIds = inApprovals.filter((h) => h.status === 'waiting_approval').map((h) => h.id)
    assert.ok(waitingIds.includes(created.id))

    // Approve in #approvals: promptly resolves waiting status and publishes deliverable result
    const approved = approveTaskHandoff(created.id, 'Zach', storage, 1_763_550_060_000)
    assert.ok(approved)
    assert.equal(approved.status, 'completed')
    assert.equal(approved.resolvedBy, 'Zach')
    assert.ok(approved.resultSummary?.includes('PR-518 + unit test trace'))
    assert.ok(approved.resultArtifact?.includes('#engineering'))

    const afterApprovals = handoffsForRoom(readHandoffs(storage), 'c-approvals')
    const stillWaiting = afterApprovals.filter((h) => h.id === created.id && h.status === 'waiting_approval')
    assert.equal(stillWaiting.length, 0)
  })

  it('supports requesting changes on a waiting handoff', () => {
    const storage = createMemoryStorage()
    const [seeded] = readHandoffs(storage)
    assert.ok(seeded)
    const updated = requestChangesOnHandoff(
      seeded.id,
      'Ada',
      'Add canary rollback threshold at 1% error rate.',
      storage,
    )
    assert.equal(updated?.status, 'changes_requested')
    assert.ok(updated?.resultSummary?.includes('1% error rate'))
  })
})
