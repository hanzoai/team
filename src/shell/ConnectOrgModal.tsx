import { SizableText, XStack, YStack } from '@hanzo/ui'
import { Building2, Check, Globe, Hash, Plus, Share2 } from '@hanzogui/lucide-icons-2'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { createConnectChannel } from '~/chat/chat.ts'
import { invalidate } from '~/data/query.ts'
import { useSpace } from '~/data/space.tsx'
import { round, rung } from '~/theme/theme'
import { press } from './press.ts'

export type ConnectModalTab = 'connect' | 'create-org'

type Listener = (tab: ConnectModalTab | null) => void
const listeners = new Set<Listener>()
let currentTab: ConnectModalTab | null = null

export const openConnectModal = (tab: ConnectModalTab = 'connect') => {
  currentTab = tab
  for (const l of listeners) l(currentTab)
}

export const closeConnectModal = () => {
  currentTab = null
  for (const l of listeners) l(null)
}

export function ConnectOrgModal() {
  const [tab, setTab] = useState<ConnectModalTab | null>(currentTab)
  const navigate = useNavigate()
  const { all, current, plane, choose, createOrg } = useSpace()

  // Connect tab state
  const [partnerSlug, setPartnerSlug] = useState('lux')
  const [customPartner, setCustomPartner] = useState('')
  const [channelName, setChannelName] = useState('hanzo-x-lux')
  const [topic, setTopic] = useState('Cross-organization engineering, shared agents & delivery')
  const [busy, setBusy] = useState(false)

  // Create org tab state
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgSlug, setNewOrgSlug] = useState('')
  const [autoConnectChannel, setAutoConnectChannel] = useState(true)
  const [switchAfterCreate, setSwitchAfterCreate] = useState(false)

  useEffect(() => {
    const fn: Listener = (next) => setTab(next)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  const activeOrgSlug = current?.url ?? 'hanzo'
  const activeOrgName = current?.name ?? 'Hanzo AI'

  const partnerCandidates = all.filter((s) => s.url !== activeOrgSlug)
  const resolvedPartner = (customPartner.trim() || partnerSlug || 'partner')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')

  useEffect(() => {
    if (resolvedPartner) {
      setChannelName(`${activeOrgSlug}-x-${resolvedPartner}`)
    }
  }, [activeOrgSlug, resolvedPartner])

  if (!tab) return null

  const handleConnectSubmit = async () => {
    if (!plane || busy) return
    const targetOrg = resolvedPartner || 'partner'
    const cleanChannel =
      channelName
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '') || `${activeOrgSlug}-x-${targetOrg}`

    setBusy(true)
    try {
      // Ensure partner org is registered in workspace list
      if (!all.some((s) => s.url === targetOrg)) {
        createOrg(targetOrg, targetOrg.toUpperCase())
      }
      const roomId = await createConnectChannel(plane, cleanChannel, [targetOrg], topic)
      invalidate('chat:rooms:')
      closeConnectModal()
      navigate(`/chat/${roomId}`)
    } finally {
      setBusy(false)
    }
  }

  const handleCreateOrgSubmit = async () => {
    if (busy) return
    const display = newOrgName.trim() || newOrgSlug.trim() || 'New Organization'
    const slug = (newOrgSlug.trim() || display)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
    if (!slug) return

    setBusy(true)
    try {
      const created = createOrg(slug, display)
      if (autoConnectChannel && plane && slug !== activeOrgSlug) {
        const sharedName = `${activeOrgSlug}-x-${slug}`
        const roomId = await createConnectChannel(
          plane,
          sharedName,
          [slug],
          `Hanzo Connect shared channel between ${activeOrgName} and ${created.name}`,
        )
        invalidate('chat:rooms:')
        if (switchAfterCreate) {
          choose(created.url)
        }
        closeConnectModal()
        navigate(`/chat/${roomId}`)
        return
      }
      if (switchAfterCreate) {
        choose(created.url)
      }
      closeConnectModal()
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack
      position="fixed"
      t={0}
      l={0}
      r={0}
      b={0}
      z={100000}
      items="center"
      justify="center"
      p={16}
      style={{ backgroundColor: 'var(--team-backdrop, rgba(0, 0, 0, 0.65))', backdropFilter: 'blur(4px)' }}
      onPress={() => closeConnectModal()}
    >
      <YStack
        width="100%"
        maxW={520}
        rounded={round.card}
        bg="$panel"
        borderWidth={1}
        borderColor="$edge"
        p={20}
        gap={16}
        onPress={(e: { stopPropagation?: () => void }) => e.stopPropagation?.()}
        data-testid="hanzo-connect-modal"
      >
        {/* Header */}
        <XStack items="center" justify="space-between" gap={12}>
          <XStack items="center" gap={10}>
            <YStack
              width={32}
              height={32}
              rounded={round.field}
              bg="$background"
              borderWidth={1}
              borderColor="$edge"
              items="center"
              justify="center"
            >
              <Share2 size={16} color="$ink" />
            </YStack>
            <YStack>
              <SizableText fontSize={rung.row} fontWeight="700" color="$ink">
                Hanzo Connect
              </SizableText>
              <SizableText fontSize={rung.chip} color="$soft">
                Multi-org shared channels & isolated organization workspaces
              </SizableText>
            </YStack>
          </XStack>
          <XStack
            {...press(() => closeConnectModal(), 'Close Hanzo Connect modal')}
            px={8}
            py={4}
            rounded={round.field}
            hoverStyle={{ background: '$hover' }}
          >
            <SizableText fontSize={rung.body} color="$soft">
              ✕
            </SizableText>
          </XStack>
        </XStack>

        {/* Tabs */}
        <XStack
          bg="$background"
          p={3}
          rounded={round.field}
          borderWidth={1}
          borderColor="$edge"
          gap={4}
        >
          <XStack
            flex={1}
            {...press(() => setTab('connect'), 'Connect organizations tab')}
            py={7}
            px={10}
            rounded={round.field}
            items="center"
            justify="center"
            gap={6}
            bg={tab === 'connect' ? '$panel' : 'transparent'}
          >
            <Share2 size={14} color={tab === 'connect' ? '$ink' : '$soft'} />
            <SizableText
              fontSize={rung.body}
              fontWeight={tab === 'connect' ? '600' : '500'}
              color={tab === 'connect' ? '$ink' : '$soft'}
            >
              Connect Orgs (Shared Channel)
            </SizableText>
          </XStack>
          <XStack
            flex={1}
            {...press(() => setTab('create-org'), 'Create organization tab')}
            py={7}
            px={10}
            rounded={round.field}
            items="center"
            justify="center"
            gap={6}
            bg={tab === 'create-org' ? '$panel' : 'transparent'}
          >
            <Building2 size={14} color={tab === 'create-org' ? '$ink' : '$soft'} />
            <SizableText
              fontSize={rung.body}
              fontWeight={tab === 'create-org' ? '600' : '500'}
              color={tab === 'create-org' ? '$ink' : '$soft'}
            >
              Create New Organization
            </SizableText>
          </XStack>
        </XStack>

        {tab === 'connect' ? (
          <YStack gap={14}>
            {/* Visual Org-to-Org Bridge */}
            <XStack
              p={12}
              rounded={round.field}
              bg="$background"
              borderWidth={1}
              borderColor="$edge"
              items="center"
              justify="space-between"
              gap={8}
            >
              <YStack gap={2}>
                <SizableText fontSize={rung.chip} color="$faint">
                  HOST ORGANIZATION
                </SizableText>
                <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
                  {activeOrgName} ({activeOrgSlug})
                </SizableText>
              </YStack>
              <XStack
                px={8}
                py={3}
                rounded={round.pill}
                bg="$panel"
                borderWidth={1}
                borderColor="$edge"
                items="center"
                gap={5}
              >
                <Globe size={12} color="$ink" />
                <SizableText fontSize={rung.chip} fontWeight="600" color="$ink">
                  connect:{resolvedPartner || 'org'}
                </SizableText>
              </XStack>
              <YStack gap={2} items="flex-end">
                <SizableText fontSize={rung.chip} color="$faint">
                  PARTNER ORGANIZATION
                </SizableText>
                <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
                  {resolvedPartner || 'partner'}
                </SizableText>
              </YStack>
            </XStack>

            {/* Partner Org Picker */}
            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet">
                Select or enter partner organization slug
              </SizableText>
              <XStack gap={6} flexWrap="wrap">
                {partnerCandidates.map((org) => {
                  const selected = !customPartner.trim() && partnerSlug === org.url
                  return (
                    <XStack
                      key={org.url}
                      {...press(() => {
                        setCustomPartner('')
                        setPartnerSlug(org.url)
                      }, `Select ${org.name}`)}
                      px={10}
                      py={5}
                      rounded={round.pill}
                      bg={selected ? '$ink' : '$background'}
                      borderWidth={1}
                      borderColor={selected ? '$ink' : '$edge'}
                      items="center"
                      gap={5}
                    >
                      {selected ? <Check size={12} color="$background" /> : null}
                      <SizableText
                        fontSize={rung.chip}
                        fontWeight="600"
                        color={selected ? '$background' : '$ink'}
                      >
                        {org.name} ({org.url})
                      </SizableText>
                    </XStack>
                  )
                })}
              </XStack>
              <XStack
                px={10}
                py={6}
                rounded={round.field}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
              >
                <input
                  value={customPartner}
                  onChange={(e) => setCustomPartner(e.target.value)}
                  placeholder="Or enter external organization slug (e.g. acme, skully, partner)..."
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </XStack>
            </YStack>

            {/* Shared Channel Name */}
            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet">
                Shared channel name
              </SizableText>
              <XStack
                items="center"
                gap={6}
                px={10}
                py={6}
                rounded={round.field}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
              >
                <Hash size={14} color="$soft" />
                <input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="hanzo-x-partner"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </XStack>
            </YStack>

            {/* Shared Channel Topic */}
            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet">
                Channel purpose & agent scope
              </SizableText>
              <XStack
                px={10}
                py={6}
                rounded={round.field}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
              >
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Cross-org engineering, shared agents & delivery"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </XStack>
            </YStack>

            <SizableText fontSize={rung.chip} color="$soft">
              Both organizations keep strict tenant isolation (separate IAM, KMS secrets, private
              repos, and billing) while humans and AI agents (@vi, @dev, @mark) collaborate in real
              time inside #{channelName || `${activeOrgSlug}-x-${resolvedPartner}`}.
            </SizableText>

            <XStack justify="flex-end" gap={8} pt={4}>
              <XStack
                {...press(() => closeConnectModal(), 'Cancel')}
                px={12}
                py={8}
                rounded={round.field}
                borderWidth={1}
                borderColor="$edge"
              >
                <SizableText fontSize={rung.body} color="$quiet">
                  Cancel
                </SizableText>
              </XStack>
              <XStack
                {...press(() => void handleConnectSubmit(), 'Connect and create shared channel')}
                px={14}
                py={8}
                rounded={round.field}
                bg="$ink"
                items="center"
                gap={6}
              >
                <Share2 size={14} color="$background" />
                <SizableText fontSize={rung.body} fontWeight="600" color="$background">
                  {busy ? 'Connecting…' : 'Connect & Share Channel'}
                </SizableText>
              </XStack>
            </XStack>
          </YStack>
        ) : (
          <YStack gap={14}>
            <SizableText fontSize={rung.chip} color="$soft">
              Every company, agency, or partner team creates its own isolated Hanzo Organization
              with dedicated IAM, KMS secrets, and billing. Two or more organizations can then link
              shared channels via Hanzo Connect.
            </SizableText>

            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet">
                Organization display name
              </SizableText>
              <XStack
                px={10}
                py={6}
                rounded={round.field}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
              >
                <input
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value)
                  }}
                  placeholder="e.g. Acme Robotics, Skully Systems, Partner Labs"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </XStack>
            </YStack>

            <YStack gap={6}>
              <SizableText fontSize={rung.chip} fontWeight="600" color="$quiet">
                Organization slug (tenant ID)
              </SizableText>
              <XStack
                px={10}
                py={6}
                rounded={round.field}
                bg="$background"
                borderWidth={1}
                borderColor="$edge"
              >
                <input
                  value={
                    newOrgSlug ||
                    newOrgName
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, '-')
                      .replace(/^-|-$/g, '')
                  }
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="e.g. acme"
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </XStack>
            </YStack>

            <XStack
              {...press(
                () => setAutoConnectChannel((v) => !v),
                'Toggle automatic Hanzo Connect channel creation',
              )}
              items="center"
              gap={8}
              p={10}
              rounded={round.field}
              bg="$background"
              borderWidth={1}
              borderColor="$edge"
            >
              <YStack
                width={16}
                height={16}
                rounded={4}
                bg={autoConnectChannel ? '$ink' : 'transparent'}
                borderWidth={1}
                borderColor="$ink"
                items="center"
                justify="center"
              >
                {autoConnectChannel ? <Check size={12} color="$background" /> : null}
              </YStack>
              <SizableText fontSize={rung.chip} color="$ink" flex={1}>
                Automatically bridge a Hanzo Connect channel (#{activeOrgSlug}-x-
                {(
                  newOrgSlug ||
                  newOrgName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, '-')
                    .replace(/^-|-$/g, '') ||
                  'new-org'
                )}
                ) with {activeOrgName}
              </SizableText>
            </XStack>

            <XStack
              {...press(
                () => setSwitchAfterCreate((v) => !v),
                'Toggle switching active organization after creation',
              )}
              items="center"
              gap={8}
              px={10}
              py={6}
            >
              <YStack
                width={16}
                height={16}
                rounded={4}
                bg={switchAfterCreate ? '$ink' : 'transparent'}
                borderWidth={1}
                borderColor="$ink"
                items="center"
                justify="center"
              >
                {switchAfterCreate ? <Check size={12} color="$background" /> : null}
              </YStack>
              <SizableText fontSize={rung.chip} color="$quiet">
                Switch my active workspace to this new organization immediately
              </SizableText>
            </XStack>

            <XStack justify="flex-end" gap={8} pt={4}>
              <XStack
                {...press(() => closeConnectModal(), 'Cancel')}
                px={12}
                py={8}
                rounded={round.field}
                borderWidth={1}
                borderColor="$edge"
              >
                <SizableText fontSize={rung.body} color="$quiet">
                  Cancel
                </SizableText>
              </XStack>
              <XStack
                {...press(() => void handleCreateOrgSubmit(), 'Create organization')}
                px={14}
                py={8}
                rounded={round.field}
                bg="$ink"
                items="center"
                gap={6}
              >
                <Plus size={14} color="$background" />
                <SizableText fontSize={rung.body} fontWeight="600" color="$background">
                  {busy ? 'Creating…' : 'Create Organization'}
                </SizableText>
              </XStack>
            </XStack>
          </YStack>
        )}
      </YStack>
    </YStack>
  )
}
