/**
 * ApprovalCard — one handed-off work item inside the Approval Inbox.
 *
 * Shows explicit ownership (person or `@bot`), approval gate status, resulting
 * deliverable (summary + artifact), and inline Approve / Request changes /
 * Record deliverable controls backed by the live Handoff store + Tracker plane.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Input, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  User,
} from '@hanzogui/lucide-icons-2'

import { useSession } from '~/data/session.tsx'
import { approvalLabel, type HandoffRecord } from '~/handoff/handoff.ts'
import {
  approveHandoffRecord,
  requestHandoffChanges,
  submitHandoffDeliverable,
} from '~/handoff/store.ts'
import { PAD } from '~/shell/measure.ts'
import { paint, ring, round, rung, state } from '~/theme/theme.ts'

function statusStyle(approvalState: HandoffRecord['meta']['approvalState']) {
  switch (approvalState) {
    case 'pending':
      return { bg: paint.alert, fg: paint.panel }
    case 'approved':
      return { bg: state.done, fg: paint.ground }
    case 'changes_requested':
      return { bg: paint.composerWarn, fg: paint.ground }
    default:
      return { bg: state.doing, fg: paint.ground }
  }
}

export function ApprovalCard({ record }: { record: HandoffRecord }) {
  const navigate = useNavigate()
  const { who } = useSession()
  const reviewer = who?.label || who?.name || 'Reviewer'

  const [busy, setBusy] = useState(false)
  const [askingChanges, setAskingChanges] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [addingDeliverable, setAddingDeliverable] = useState(false)
  const [deliverableSummary, setDeliverableSummary] = useState(record.meta.deliverable?.summary ?? '')
  const [deliverableArtifact, setDeliverableArtifact] = useState(record.meta.deliverable?.artifact ?? '')

  const { meta } = record
  const pill = statusStyle(meta.approvalState)
  const isPending = meta.approvalState === 'pending'
  const isApproved = meta.approvalState === 'approved'

  const onApprove = async () => {
    if (busy) return
    setBusy(true)
    try {
      await approveHandoffRecord(record.id, { approvedBy: reviewer })
      setAskingChanges(false)
    } finally {
      setBusy(false)
    }
  }

  const onRequestChanges = async () => {
    if (busy) return
    setBusy(true)
    try {
      await requestHandoffChanges(record.id, {
        reviewedBy: reviewer,
        note: changeNote.trim() || 'Please revise and resubmit.',
      })
      setChangeNote('')
      setAskingChanges(false)
    } finally {
      setBusy(false)
    }
  }

  const onSubmitDeliverable = async () => {
    const clean = deliverableSummary.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      await submitHandoffDeliverable(record.id, {
        summary: clean,
        artifact: deliverableArtifact.trim() || undefined,
        completedBy: meta.owner.name,
      })
      setAddingDeliverable(false)
    } finally {
      setBusy(false)
    }
  }

  const openOrigin = () => {
    if (record.issueId) navigate('/issues')
    else if (meta.sourceRoomId) navigate(`/chat/${meta.sourceRoomId}`)
  }

  return (
    <YStack
      data-testid="approval-inbox-card"
      data-approval-state={meta.approvalState}
      px={PAD}
      py={12}
      gap={8}
      bg={isPending ? paint.card : 'transparent'}
      borderBottomWidth={1}
      borderColor={paint.rule}
    >
      {/* Top row: key/place + approval status pill */}
      <XStack items="center" justify="space-between" gap={6} flexWrap="wrap">
        <XStack items="center" gap={6} flex={1} minW={0}>
          {record.issueKey ? (
            <SizableText size={rung.chip} fontWeight="700" color={paint.ink}>
              {record.issueKey}
            </SizableText>
          ) : null}
          {meta.sourceRoomName ? (
            <SizableText size={rung.chip} color={paint.dim} numberOfLines={1}>
              {meta.sourceRoomName}
            </SizableText>
          ) : null}
        </XStack>

        <XStack
          px={7}
          py={2}
          rounded={round.pill}
          items="center"
          gap={4}
          style={{ backgroundColor: pill.bg }}
        >
          {isApproved ? (
            <CheckCircle2 size={11} color={pill.fg} />
          ) : (
            <ShieldAlert size={11} color={pill.fg} />
          )}
          <SizableText size={rung.chip} fontWeight="700" style={{ color: pill.fg }}>
            {approvalLabel(meta.approvalState)}
          </SizableText>
        </XStack>
      </XStack>

      {/* Title */}
      <SizableText size={rung.body} fontWeight="600" color={paint.ink} numberOfLines={2}>
        {record.title}
      </SizableText>

      {/* Ownership row */}
      <XStack items="center" gap={6} flexWrap="wrap">
        <XStack
          px={6}
          py={2}
          rounded={round.field}
          bg="$raised"
          borderWidth={1}
          borderColor="$edge"
          items="center"
          gap={4}
        >
          {meta.owner.kind === 'bot' ? (
            <Bot size={12} color="$ink" />
          ) : (
            <User size={12} color="$ink" />
          )}
          <SizableText size={rung.chip} fontWeight="600" color={paint.ink}>
            {meta.owner.kind === 'bot' ? `@${meta.owner.name}` : meta.owner.name}
          </SizableText>
          {meta.owner.kind === 'bot' ? (
            <SizableText size={rung.chip} color={paint.dim}>
              Bot
            </SizableText>
          ) : null}
        </XStack>

        <SizableText size={rung.chip} color={paint.dim}>
          {`from ${meta.handedOffBy}`}
        </SizableText>

        {record.issueId || meta.sourceRoomId ? (
          <XStack
            role="button"
            tabIndex={0}
            cursor="pointer"
            items="center"
            gap={3}
            onPress={openOrigin}
            focusVisibleStyle={ring}
          >
            <ExternalLink size={11} color="$soft" />
            <SizableText size={rung.chip} color={paint.mute}>
              Open
            </SizableText>
          </XStack>
        ) : null}
      </XStack>

      {/* Resulting deliverable */}
      {meta.deliverable ? (
        <YStack
          data-testid="approval-deliverable"
          p={8}
          gap={4}
          rounded={round.field}
          bg="$raised"
          borderWidth={1}
          borderColor="$edge"
        >
          <XStack items="center" justify="space-between" gap={6}>
            <XStack items="center" gap={5}>
              <FileCheck2 size={12} color={meta.deliverable.verified ? state.done : paint.ink} />
              <SizableText size={rung.chip} fontWeight="700" color={paint.ink}>
                {meta.deliverable.verified ? 'Verified deliverable' : 'Deliverable ready'}
              </SizableText>
            </XStack>
            <SizableText size={rung.chip} color={paint.dim}>
              {meta.deliverable.completedBy}
            </SizableText>
          </XStack>
          <SizableText size={rung.small} color={paint.ink}>
            {meta.deliverable.summary}
          </SizableText>
          {meta.deliverable.artifact ? (
            /^https?:\/\//.test(meta.deliverable.artifact) ? (
              <a
                href={meta.deliverable.artifact}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: paint.accent,
                  fontSize: 11,
                  textDecoration: 'underline',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {meta.deliverable.artifact}
              </a>
            ) : (
              <SizableText size={rung.chip} color={paint.mute} numberOfLines={1}>
                {meta.deliverable.artifact}
              </SizableText>
            )
          ) : null}
        </YStack>
      ) : null}

      {/* Reviewer note (if approved or changes requested) */}
      {meta.approvalNote ? (
        <SizableText size={rung.chip} color={paint.mute}>
          {`${meta.approvedBy ?? 'Reviewer'}: ${meta.approvalNote}`}
        </SizableText>
      ) : null}

      {/* Inline deliverable form */}
      {addingDeliverable ? (
        <YStack gap={6} pt={2}>
          <Input
            height={28}
            fontSize={12}
            placeholder="Deliverable result summary..."
            value={deliverableSummary}
            onChangeText={setDeliverableSummary}
            bg="$raised"
            borderColor="$edge"
          />
          <Input
            height={26}
            fontSize={11}
            placeholder="Artifact link or path (optional)"
            value={deliverableArtifact}
            onChangeText={setDeliverableArtifact}
            bg="$raised"
            borderColor="$edge"
          />
          <XStack gap={6} justify="flex-end">
            <Button size="xs" variant="ghost" onPress={() => setAddingDeliverable(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={!deliverableSummary.trim() || busy}
              style={{ backgroundColor: paint.accent }}
              onPress={() => void onSubmitDeliverable()}
            >
              <SizableText size={rung.chip} fontWeight="600" style={{ color: paint.ground }}>
                Save deliverable
              </SizableText>
            </Button>
          </XStack>
        </YStack>
      ) : null}

      {/* Inline request-changes input */}
      {askingChanges ? (
        <YStack gap={6} pt={2}>
          <Input
            height={28}
            fontSize={12}
            placeholder="What needs to change?"
            value={changeNote}
            onChangeText={setChangeNote}
            bg="$raised"
            borderColor="$edge"
          />
          <XStack gap={6} justify="flex-end">
            <Button size="xs" variant="ghost" onPress={() => setAskingChanges(false)}>
              Cancel
            </Button>
            <Button size="xs" variant="outline" disabled={busy} onPress={() => void onRequestChanges()}>
              Send feedback
            </Button>
          </XStack>
        </YStack>
      ) : null}

      {/* Action row */}
      {!isApproved && !askingChanges && !addingDeliverable ? (
        <XStack gap={6} pt={2} flexWrap="wrap">
          <Button
            data-testid="approval-approve-btn"
            size="xs"
            height={26}
            px={9}
            disabled={busy}
            style={{ backgroundColor: paint.accent }}
            onPress={() => void onApprove()}
          >
            <Check size={12} color={paint.ground} />
            <SizableText size={rung.chip} fontWeight="700" style={{ color: paint.ground }}>
              Approve
            </SizableText>
          </Button>

          <Button
            data-testid="approval-changes-btn"
            size="xs"
            height={26}
            px={8}
            variant="outline"
            disabled={busy}
            onPress={() => setAskingChanges(true)}
          >
            <RotateCcw size={11} />
            <SizableText size={rung.chip} fontWeight="500" color={paint.ink}>
              Changes
            </SizableText>
          </Button>

          <Button
            data-testid="approval-add-deliverable-btn"
            size="xs"
            height={26}
            px={8}
            variant="ghost"
            disabled={busy}
            onPress={() => setAddingDeliverable(true)}
          >
            <FileCheck2 size={11} />
            <SizableText size={rung.chip} fontWeight="500" color={paint.mute}>
              {meta.deliverable ? 'Update result' : 'Add result'}
            </SizableText>
          </Button>
        </XStack>
      ) : null}
    </YStack>
  )
}
