/**
 * Virtual Office HQ (`/office`)
 *
 * Wired to live production backends:
 * - Voice/Video Rooms (`Theater`, `Meeting Room`, `Engineering Huddle`):
 *   `GET /v1/meet/session`, `GET /v1/meet/call`, `POST /v1/meet/getToken` + `livekit-client` (`wss://live.hanzo.ai`)
 * - Humans & AI Agents: `GET /v1/team/members`, `GET /v1/agents`, `GET /v1/bot/members`
 * - Create Bot (`POST /v1/agents`), Run Bot (`POST /v1/agents/:id/run`), Delete Bot (`DELETE /v1/agents/:id`)
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import {
  Bot,
  Building2,
  DoorOpen,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Plus,
  Users,
  Video,
  VideoOff,
  Volume2,
} from '@hanzogui/lucide-icons-2'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import {
  createWorkforceAgent,
  deleteWorkforceAgent,
  runWorkforceAgent,
} from '~/agents/workforce.ts'
import { MemberPortrait } from '~/shell/UnifiedSidebar.tsx'
import { press } from '~/shell/press.ts'
import { paint } from '~/theme/theme.ts'
import {
  joinVoiceRoom,
  leaveVoiceRoom,
  openDmWithMember,
  refreshRosterFromBackend,
  sendWorkspaceMessage,
  toggleCameraOn,
  toggleScreenShare,
  toggleVoiceMute,
  triggerOfficeInteraction,
  useWorkspace,
  type RosterMember,
} from '~/workspace/store.ts'
import { CreateBotModal, LiveRoomCard, MemberDeskCard, RunBotModal } from './OfficeParts.tsx'

type FilterMode = 'all' | 'humans' | 'bots'

export function OfficeWorkspace() {
  const navigate = useNavigate()
  const {
    orgs,
    activeOrgId,
    roster,
    voiceRooms,
    officeBanner,
    connectedVoiceId,
    voiceStatus,
    voiceError,
    voiceServerHost,
    meetReady,
    micMuted,
    cameraOn,
    screenSharing,
    hydrating,
  } = useWorkspace()

  const [filter, setFilter] = useState<FilterMode>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [botName, setBotName] = useState('')
  const [botModel, setBotModel] = useState('zen6-coder')
  const [botDesc, setBotDesc] = useState('')
  const [botInstructions, setBotInstructions] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const [runTarget, setRunTarget] = useState<RosterMember | null>(null)
  const [runPrompt, setRunPrompt] = useState('')
  const [runBusy, setRunBusy] = useState(false)
  const [runResult, setRunResult] = useState<{ id?: string; status: string; output?: string; error?: string } | null>(null)
  const [stageWidth, setStageWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  )
  const showSideRoster = stageWidth >= 920

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null
  const humans = roster.filter((m) => !m.bot)
  const bots = roster.filter((m) => m.bot)
  const visibleMembers =
    filter === 'humans' ? humans : filter === 'bots' ? bots : [...humans, ...bots]

  const theaterRoom = voiceRooms.find((r) => r.id === 'office-theater') ?? voiceRooms[0]
  const meetingRoom = voiceRooms.find((r) => r.id === 'office-meeting') ?? voiceRooms[1]
  const huddleRoom = voiceRooms.find((r) => r.id === 'office-huddle') ?? voiceRooms[2]

  const openChatWith = async (member: RosterMember) => {
    triggerOfficeInteraction(member.name, 'chat')
    const dmId = await openDmWithMember(member.id).catch(() => null)
    navigate(dmId ? `/chat/${dmId}` : `/chat/with-${member.id}`)
  }

  const sendPing = async (member: RosterMember, kind: 'wave' | 'knock') => {
    triggerOfficeInteraction(member.name, kind)
    const dmId = await openDmWithMember(member.id).catch(() => null)
    if (dmId) {
      const text =
        kind === 'wave'
          ? 'Waved at you from the Virtual Office.'
          : 'Knocked on your Virtual Office desk — free to hop into the Meeting Room?'
      void sendWorkspaceMessage(dmId, text)
    }
  }

  const handleCreateBot = async () => {
    const cleanName = botName.trim()
    const cleanInstr = botInstructions.trim() || `You are ${cleanName}, a helpful workspace agent.`
    if (!cleanName || createBusy) return
    setCreateBusy(true)
    setCreateErr(null)
    try {
      await createWorkforceAgent({
        name: cleanName,
        model: botModel.trim() || undefined,
        description: botDesc.trim() || undefined,
        instructions: cleanInstr,
      })
      await refreshRosterFromBackend()
      setBotName('')
      setBotDesc('')
      setBotInstructions('')
      setCreateOpen(false)
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create bot')
    } finally {
      setCreateBusy(false)
    }
  }

  const handleRunBot = async () => {
    if (!runTarget || !runPrompt.trim() || runBusy) return
    setRunBusy(true)
    setRunResult(null)
    try {
      const ref = runTarget.agentId || runTarget.name
      setRunResult(await runWorkforceAgent(ref, runPrompt.trim()))
    } catch (err) {
      setRunResult({ status: 'error', error: err instanceof Error ? err.message : 'Agent run failed' })
    } finally {
      setRunBusy(false)
    }
  }

  const handleDeleteBot = async (member: RosterMember) => {
    try {
      await deleteWorkforceAgent(member.agentId || member.name)
      await refreshRosterFromBackend()
    } catch (err) {
      triggerOfficeInteraction(err instanceof Error ? `Delete failed: ${err.message}` : 'Delete failed', 'wave')
    }
  }

  const statusBadgeText =
    voiceStatus === 'connected'
      ? `Connected · ${voiceServerHost || 'LiveKit'}`
      : voiceStatus === 'connecting'
        ? 'Connecting to LiveKit…'
        : voiceStatus === 'reconnecting'
          ? 'Reconnecting…'
          : voiceStatus === 'error'
            ? 'Connection Error'
            : meetReady === false
              ? 'Meet Unconfigured'
              : voiceServerHost
                ? `Ready · ${voiceServerHost}`
                : 'Ready'

  return (
    <XStack
      flex={1}
      minW={0}
      minH={0}
      style={{ backgroundColor: paint.panel }}
      data-testid="office-roam-workspace"
      onLayout={(e: { nativeEvent: { layout: { width: number } } }) =>
        setStageWidth(e.nativeEvent.layout.width)
      }
    >
      <YStack flex={1} minW={0} minH={0} position="relative">
        <XStack
          minH={44}
          px={16}
          py={6}
          items="center"
          justify="space-between"
          gap={8}
          flexWrap="wrap"
          borderBottomWidth={1}
          style={{ borderBottomColor: paint.rule }}
        >
          <XStack items="center" gap={8} flex={1} minW={0}>
            <Building2 size={15} color={paint.ink} />
            <SizableText fontSize={14} fontWeight="700" style={{ color: paint.ink }} shrink={0}>
              {`Virtual HQ · ${activeOrg?.name || 'Workspace'}`}
            </SizableText>
            <YStack width={1} height={13} style={{ backgroundColor: paint.rule }} shrink={0} />
            <SizableText
              fontSize={11.5}
              fontWeight="600"
              style={{
                color:
                  voiceStatus === 'connected' ? paint.speaking : voiceStatus === 'error' ? paint.alert : paint.dim,
                fontFamily: 'var(--font-mono)',
              }}
              numberOfLines={1}
            >
              {statusBadgeText}
            </SizableText>
          </XStack>

          <XStack items="center" gap={5} shrink={0}>
            {(
              [
                { id: 'all', label: `All (${roster.length})` },
                { id: 'humans', label: `Humans (${humans.length})` },
                { id: 'bots', label: `Bots (${bots.length})` },
              ] as const
            ).map((f) => {
              const active = filter === f.id
              return (
                <XStack
                  key={f.id}
                  {...press(() => setFilter(f.id), f.label)}
                  height={24}
                  px={9}
                  rounded={6}
                  borderWidth={1}
                  items="center"
                  style={{
                    backgroundColor: active ? paint.rowActive : 'transparent',
                    borderColor: active ? paint.border : paint.rule,
                  }}
                  hoverStyle={{ background: paint.hover }}
                >
                  <SizableText fontSize={11} fontWeight={active ? '700' : '500'} style={{ color: active ? paint.ink : paint.mute }}>
                    {f.label}
                  </SizableText>
                </XStack>
              )
            })}

            <XStack
              {...press(() => {
                setCreateErr(null)
                setCreateOpen(true)
              }, 'Create Bot')}
              height={24}
              px={9}
              rounded={6}
              items="center"
              gap={4}
              style={{ backgroundColor: paint.ink }}
              data-testid="office-create-bot-btn"
            >
              <Plus size={11} color={paint.ground} />
              <SizableText fontSize={11} fontWeight="700" style={{ color: paint.ground }}>
                New Bot
              </SizableText>
            </XStack>
          </XStack>
        </XStack>

        {voiceStatus === 'error' && voiceError ? (
          <XStack px={18} py={7} borderBottomWidth={1} style={{ backgroundColor: paint.card, borderBottomColor: paint.rule }}>
            <SizableText fontSize={12} style={{ color: paint.alert }}>
              {`Voice connection failed: ${voiceError}`}
            </SizableText>
          </XStack>
        ) : null}

        {officeBanner ? (
          <XStack px={18} py={6} borderBottomWidth={1} style={{ backgroundColor: paint.voiceBg, borderBottomColor: paint.voiceEdge }}>
            <SizableText fontSize={12} fontWeight="600" style={{ color: paint.speaking }}>
              {officeBanner.text}
            </SizableText>
          </XStack>
        ) : null}

        <ScrollArea flex={1} minH={0}>
          <YStack p={16} pb={84} gap={14}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {theaterRoom ? (
                <LiveRoomCard
                  testId="office-theater-room"
                  title="Theater"
                  subtitle={connectedVoiceId === theaterRoom.id ? statusBadgeText : 'All-hands LiveKit stage'}
                  room={theaterRoom}
                  roster={roster}
                  connected={connectedVoiceId === theaterRoom.id}
                  connecting={connectedVoiceId === theaterRoom.id && voiceStatus === 'connecting'}
                  joinLabel="Take Stage"
                  leaveLabel="Leave Stage"
                  onToggle={() => void (connectedVoiceId === theaterRoom.id ? leaveVoiceRoom() : joinVoiceRoom(theaterRoom.id))}
                />
              ) : null}
              {meetingRoom ? (
                <LiveRoomCard
                  testId="office-meeting-room"
                  title="Meeting Room"
                  subtitle={connectedVoiceId === meetingRoom.id ? statusBadgeText : 'Drop-in LiveKit audio & video'}
                  room={meetingRoom}
                  roster={roster}
                  connected={connectedVoiceId === meetingRoom.id}
                  connecting={connectedVoiceId === meetingRoom.id && voiceStatus === 'connecting'}
                  joinLabel="Drop In"
                  leaveLabel="Leave Room"
                  onToggle={() => void (connectedVoiceId === meetingRoom.id ? leaveVoiceRoom() : joinVoiceRoom(meetingRoom.id))}
                />
              ) : null}
              {huddleRoom ? (
                <LiveRoomCard
                  testId="office-huddle-room"
                  title="Engineering Huddle"
                  subtitle={connectedVoiceId === huddleRoom.id ? statusBadgeText : 'Pairing & screen share'}
                  room={huddleRoom}
                  roster={roster}
                  connected={connectedVoiceId === huddleRoom.id}
                  connecting={connectedVoiceId === huddleRoom.id && voiceStatus === 'connecting'}
                  joinLabel="Join Huddle"
                  leaveLabel="Leave Huddle"
                  onToggle={() => void (connectedVoiceId === huddleRoom.id ? leaveVoiceRoom() : joinVoiceRoom(huddleRoom.id))}
                />
              ) : null}
            </div>

            <YStack gap={8}>
              <SizableText fontSize={12} fontWeight="700" style={{ color: paint.mute, letterSpacing: 0.4 }}>
                {filter === 'humans'
                  ? `HUMANS (${humans.length})`
                  : filter === 'bots'
                    ? `AI WORKFORCE (${bots.length})`
                    : `WORKSPACE DESKS (${visibleMembers.length})`}
              </SizableText>

              {hydrating && visibleMembers.length === 0 ? (
                <YStack p={20} rounded={10} borderWidth={1} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                  <SizableText fontSize={13} style={{ color: paint.dim }}>
                    Loading workspace members and bots…
                  </SizableText>
                </YStack>
              ) : visibleMembers.length === 0 ? (
                <YStack p={20} rounded={10} borderWidth={1} gap={8} style={{ backgroundColor: paint.card, borderColor: paint.border }}>
                  <SizableText fontSize={13} fontWeight="600" style={{ color: paint.ink }}>
                    {filter === 'bots' ? 'No bots created in this organization yet.' : 'No members in this view.'}
                  </SizableText>
                  <SizableText fontSize={12} style={{ color: paint.dim }}>
                    Create a bot with the "+ New Bot" button above to add an AI teammate to this workspace.
                  </SizableText>
                </YStack>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))', gap: 10 }}>
                  {visibleMembers.map((member) => (
                    <MemberDeskCard
                      key={member.id}
                      member={member}
                      onChat={() => void openChatWith(member)}
                      onWave={() => void sendPing(member, 'wave')}
                      onKnock={() => void sendPing(member, 'knock')}
                      onRun={
                        member.bot
                          ? () => {
                              setRunTarget(member)
                              setRunPrompt('')
                              setRunResult(null)
                            }
                          : undefined
                      }
                      onDelete={member.bot ? () => void handleDeleteBot(member) : undefined}
                    />
                  ))}
                </div>
              )}
            </YStack>
          </YStack>
        </ScrollArea>

        {/* Bottom Floating LiveKit Controls */}
        <XStack position="absolute" b={14} l={0} r={0} items="center" justify="center" pointerEvents="box-none">
          <XStack px={12} py={6} gap={10} rounded={20} borderWidth={1} items="center" style={{ backgroundColor: paint.sidebar, borderColor: paint.border }}>
            <XStack
              {...press(
                () => void (connectedVoiceId ? leaveVoiceRoom() : joinVoiceRoom('office-meeting')),
                connectedVoiceId ? 'Leave Voice Room' : 'Join Meeting Room',
              )}
              width={28}
              height={28}
              rounded={14}
              items="center"
              justify="center"
              hoverStyle={{ background: paint.hover }}
            >
              {connectedVoiceId ? <PhoneOff size={14} color={paint.alert} /> : <DoorOpen size={14} color={paint.mute} />}
            </XStack>
            <XStack {...press(toggleVoiceMute, micMuted ? 'Unmute Mic' : 'Mute Mic')} width={28} height={28} rounded={14} items="center" justify="center" hoverStyle={{ background: paint.hover }}>
              {micMuted ? <MicOff size={14} color={paint.alert} /> : <Mic size={14} color={paint.ink} />}
            </XStack>
            <XStack {...press(toggleCameraOn, cameraOn ? 'Turn Camera Off' : 'Turn Camera On')} width={28} height={28} rounded={14} items="center" justify="center" hoverStyle={{ background: paint.hover }}>
              {cameraOn ? <Video size={14} color={paint.speaking} /> : <VideoOff size={14} color={paint.mute} />}
            </XStack>
            <XStack {...press(toggleScreenShare, screenSharing ? 'Stop Screen Share' : 'Share Screen')} width={28} height={28} rounded={14} items="center" justify="center" hoverStyle={{ background: paint.hover }}>
              <MonitorUp size={14} color={screenSharing ? paint.speaking : paint.mute} />
            </XStack>
          </XStack>
        </XStack>
      </YStack>

      {/* Right Column: Live Rooms & Roster (hidden on narrow mobile viewports so Virtual HQ has full width) */}
      {showSideRoster ? (
        <YStack width={268} shrink={0} minH={0} borderLeftWidth={1} style={{ backgroundColor: paint.aside, borderLeftColor: paint.sidebarRule }} data-testid="office-skyscraper-elevator">
        <XStack height={44} px={14} items="center" justify="space-between" borderBottomWidth={1} style={{ borderBottomColor: paint.rule }}>
          <SizableText fontSize={12.5} fontWeight="700" style={{ color: paint.ink }}>
            Live Rooms &amp; Roster
          </SizableText>
          <SizableText fontSize={11} style={{ color: paint.dim, fontFamily: 'var(--font-mono)' }}>
            {`${roster.length}`}
          </SizableText>
        </XStack>

        <ScrollArea flex={1} minH={0}>
          <YStack p={12} gap={14}>
            <YStack gap={6}>
              <SizableText fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
                LIVEKIT ROOMS
              </SizableText>
              {voiceRooms.map((vr) => {
                const joined = connectedVoiceId === vr.id
                return (
                  <XStack
                    key={vr.id}
                    {...press(() => void (joined ? leaveVoiceRoom() : joinVoiceRoom(vr.id)), joined ? `Leave ${vr.name}` : `Join ${vr.name}`)}
                    p={9}
                    rounded={8}
                    borderWidth={1}
                    items="center"
                    justify="space-between"
                    style={{ backgroundColor: joined ? paint.speakingBg : paint.card, borderColor: joined ? paint.voiceEdge : paint.border }}
                    hoverStyle={{ background: paint.elevated }}
                  >
                    <XStack items="center" gap={7} flex={1} minW={0}>
                      <Volume2 size={13} color={joined ? paint.speaking : paint.mute} />
                      <SizableText fontSize={12} fontWeight="600" style={{ color: joined ? paint.speaking : paint.ink }} numberOfLines={1}>
                        {vr.name}
                      </SizableText>
                    </XStack>
                    <SizableText fontSize={10.5} style={{ color: joined ? paint.speaking : paint.dim }}>
                      {joined ? `${vr.participants.length} live` : 'Join'}
                    </SizableText>
                  </XStack>
                )
              })}
            </YStack>

            <YStack gap={6}>
              <XStack items="center" justify="space-between">
                <SizableText fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
                  {`AI AGENTS (${bots.length})`}
                </SizableText>
                <Bot size={12} color={paint.dim} />
              </XStack>
              {bots.length === 0 ? (
                <SizableText fontSize={11.5} style={{ color: paint.dim }}>
                  No bots yet.
                </SizableText>
              ) : (
                bots.map((b) => (
                  <XStack key={b.id} {...press(() => void openChatWith(b), `Chat with @${b.handle}`)} px={8} py={6} rounded={7} items="center" gap={7} hoverStyle={{ background: paint.rowHover }}>
                    <MemberPortrait member={b} size={22} />
                    <YStack flex={1} minW={0}>
                      <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }} numberOfLines={1}>
                        {`@${b.handle}`}
                      </SizableText>
                      <SizableText fontSize={10.5} style={{ color: paint.dim }} numberOfLines={1}>
                        {b.model || 'Agent'}
                      </SizableText>
                    </YStack>
                  </XStack>
                ))
              )}
            </YStack>

            <YStack gap={6}>
              <XStack items="center" justify="space-between">
                <SizableText fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
                  {`HUMANS (${humans.length})`}
                </SizableText>
                <Users size={12} color={paint.dim} />
              </XStack>
              {humans.map((h) => (
                <XStack key={h.id} {...press(() => void openChatWith(h), `Chat with ${h.name}`)} px={8} py={6} rounded={7} items="center" gap={7} hoverStyle={{ background: paint.rowHover }}>
                  <MemberPortrait member={h} size={22} />
                  <YStack flex={1} minW={0}>
                    <SizableText fontSize={12} fontWeight="600" style={{ color: paint.ink }} numberOfLines={1}>
                      {h.name}
                    </SizableText>
                    <SizableText fontSize={10.5} style={{ color: h.presence === 'online' ? paint.speaking : paint.dim }}>
                      {h.presence === 'online' ? 'Online' : 'Offline'}
                    </SizableText>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </YStack>
        </ScrollArea>
      </YStack>
      ) : null}

      {createOpen ? (
        <CreateBotModal
          botName={botName}
          setBotName={setBotName}
          botModel={botModel}
          setBotModel={setBotModel}
          botDesc={botDesc}
          setBotDesc={setBotDesc}
          botInstructions={botInstructions}
          setBotInstructions={setBotInstructions}
          busy={createBusy}
          error={createErr}
          onClose={() => setCreateOpen(false)}
          onSubmit={() => void handleCreateBot()}
        />
      ) : null}

      {runTarget ? (
        <RunBotModal
          target={runTarget}
          prompt={runPrompt}
          setPrompt={setRunPrompt}
          busy={runBusy}
          result={runResult}
          onClose={() => setRunTarget(null)}
          onRun={() => void handleRunBot()}
        />
      ) : null}
    </XStack>
  )
}
