/**
 * THE RIGHT SIDEBAR (DISCORD-STYLE MEMBERS / PROFILE / INBOX)
 *
 * Mirrors Discord's right column:
 * - `inbox`: Workspace Inbox & Approvals.
 * - `inspector` (in a bot DM): Discord-style Profile Card with banner, overlapping
 *   avatar + presence dot, `APP` badge, and hanzo.bot link.
 * - `members` (default in channels): Grouped member list (`AGENTS & BOTS — N`,
 *   `ONLINE — N`, `OFFLINE — N`) with presence dots, `APP` badges, and one-click DM.
 */
import { ScrollArea, SizableText, XStack, YStack } from '@hanzo/ui'
import { ArrowUpRight, Users, X } from '@hanzogui/lucide-icons-2'
import { useNavigate } from 'react-router'

import { useSpace } from '~/data/space.tsx'
import { Inbox } from '~/inbox'
import { press, useAsideKind } from '~/shell'
import { hideAside } from '~/shell/aside.ts'
import { PAD } from '~/shell/measure.ts'
import { paint, ring, round, rung, state } from '~/theme/theme'
import { botsOf, hanzoBot, withPath } from './bots.ts'
import type { Person } from './chat.ts'
import { Face } from './Face.tsx'
import { useAgentHere } from './here.ts'
import { usePeople } from './read.ts'

export function AgentPane() {
  const asideKind = useAsideKind()
  const agent = useAgentHere()
  const roster = usePeople().data ?? []
  const navigate = useNavigate()
  const org = useSpace().current?.org ?? null

  if (asideKind === 'inbox') return <Inbox />

  if (agent && asideKind === 'inspector') {
    return (
      <YStack flex={1} minH={0} data-testid="discord-profile-panel">
        {/* Top banner matching Discord DM profile panel */}
        <YStack height={72} position="relative" style={{ backgroundColor: paint.rowActive }}>
          <XStack
            {...press(hideAside, 'Close profile panel')}
            position="absolute"
            t={8}
            r={8}
            width={24}
            height={24}
            items="center"
            justify="center"
            rounded={round.pill}
            style={{ backgroundColor: paint.panel }}
            hoverStyle={{ background: paint.card }}
            focusVisibleStyle={ring}
          >
            <X size={13} color={paint.dim} />
          </XStack>
        </YStack>

        <YStack px={PAD + 4} pb={PAD + 4} gap={12} mt={-28}>
          <YStack position="relative" width={56} height={56}>
            <Face person={agent} size={56} />
            <YStack
              position="absolute"
              b={0}
              r={0}
              width={14}
              height={14}
              rounded={round.pill}
              borderWidth={2}
              style={{ backgroundColor: state.done, borderColor: paint.panel }}
            />
          </YStack>

          <YStack gap={4}>
            <XStack items="center" gap={6} flexWrap="wrap">
              <SizableText fontSize={rung.body} fontWeight="700" color="$ink">
                {agent.name}
              </SizableText>
              <AppBadge />
            </XStack>
            <SizableText fontSize={rung.chip} color="$dim">
              {`@${agent.name.toLowerCase().replace(/\s+/g, '-')}`}
            </SizableText>
          </YStack>

          <YStack
            p={10}
            rounded={round.field}
            borderWidth={1}
            borderColor="$edge"
            style={{ backgroundColor: paint.card }}
            gap={6}
          >
            <SizableText fontSize={rung.chip} fontWeight="700" color="$quiet">
              ABOUT
            </SizableText>
            <SizableText fontSize={rung.small} color="$dim">
              {`Mention @${agent.name} in any channel to delegate work. Its own thread, sandbox, and schedule live on hanzo.bot.`}
            </SizableText>
          </YStack>

          <XStack
            asChild
            px={10}
            py={7}
            rounded={round.field}
            borderWidth={1}
            borderColor="$edge"
            items="center"
            justify="center"
            gap={6}
            hoverStyle={{ background: paint.card }}
            focusVisibleStyle={ring}
          >
            <a href={hanzoBot(agent.name, org)} target="_blank" rel="noopener">
              <SizableText fontSize={rung.small} fontWeight="500" color="$ink">
                Open on hanzo.bot
              </SizableText>
              <ArrowUpRight size={13} color={paint.dim} />
            </a>
          </XStack>
        </YStack>
      </YStack>
    )
  }

  // Discord-style Members sidebar (grouped by Agents/Bots, Online, Offline)
  const bots = botsOf(roster)
  const humans = roster
    .filter((p) => !p.bot && !p.gone)
    .sort((a, b) => a.name.localeCompare(b.name))
  const gone = roster
    .filter((p) => p.gone)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <YStack flex={1} minH={0} data-testid="discord-members-panel">
      <XStack
        px={PAD + 2}
        py={10}
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        style={{ borderBottomColor: paint.rule }}
      >
        <XStack items="center" gap={6}>
          <Users size={14} color={paint.mute} />
          <SizableText fontSize={rung.small} fontWeight="600" color="$ink">
            {`Members — ${bots.length + humans.length}`}
          </SizableText>
        </XStack>
        <XStack
          {...press(hideAside, 'Close member list')}
          width={24}
          height={24}
          items="center"
          justify="center"
          rounded={round.field}
          hoverStyle={{ background: paint.card }}
          focusVisibleStyle={ring}
        >
          <X size={14} color={paint.dim} />
        </XStack>
      </XStack>

      <ScrollArea flex={1} minH={0}>
        <YStack px={6} py={8} gap={12}>
          {bots.length > 0 ? (
            <MemberSection
              title={`AGENTS & BOTS — ${bots.length}`}
              members={bots}
              online
              onOpen={(p) => navigate(withPath(p))}
            />
          ) : null}

          {humans.length > 0 ? (
            <MemberSection
              title={`ONLINE — ${humans.length}`}
              members={humans}
              online
              onOpen={(p) => navigate(withPath(p))}
            />
          ) : null}

          {gone.length > 0 ? (
            <MemberSection
              title={`OFFLINE — ${gone.length}`}
              members={gone}
              online={false}
              onOpen={(p) => navigate(withPath(p))}
            />
          ) : null}

          {bots.length === 0 && humans.length === 0 && gone.length === 0 ? (
            <SizableText px={8} py={12} fontSize={rung.small} color="$dim">
              No members in this workspace yet.
            </SizableText>
          ) : null}
        </YStack>
      </ScrollArea>
    </YStack>
  )
}

const MemberSection = ({
  title,
  members,
  online,
  onOpen,
}: {
  title: string
  members: Person[]
  online: boolean
  onOpen: (person: Person) => void
}) => (
  <YStack gap={2}>
    <SizableText px={8} py={3} fontSize={rung.chip} fontWeight="700" color="$faint">
      {title}
    </SizableText>
    {members.map((person) => (
      <XStack
        key={person.id}
        {...press(() => onOpen(person), `Message ${person.name}`)}
        px={8}
        py={5}
        gap={9}
        items="center"
        rounded={round.field}
        opacity={online ? 1 : 0.55}
        hoverStyle={{ background: paint.rowHover }}
        focusVisibleStyle={ring}
        data-testid={`member-row-${person.id}`}
      >
        <YStack position="relative" shrink={0}>
          <Face person={person} size={28} />
          <YStack
            position="absolute"
            b={-1}
            r={-1}
            width={9}
            height={9}
            rounded={round.pill}
            borderWidth={1.5}
            style={{
              backgroundColor: online ? state.done : paint.dim,
              borderColor: paint.panel,
            }}
          />
        </YStack>
        <YStack flex={1} minW={0}>
          <XStack items="center" gap={5} minW={0}>
            <SizableText fontSize={rung.small} fontWeight="500" color="$ink" numberOfLines={1}>
              {person.name}
            </SizableText>
            {person.bot ? <AppBadge /> : null}
          </XStack>
        </YStack>
      </XStack>
    ))}
  </YStack>
)

const AppBadge = () => (
  <XStack
    px={4}
    py={1}
    rounded={round.field}
    items="center"
    shrink={0}
    style={{ backgroundColor: paint.accent }}
  >
    <SizableText fontSize={9} lineHeight={11} fontWeight="700" style={{ color: paint.panel }}>
      APP
    </SizableText>
  </XStack>
)
