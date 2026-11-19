/**
 * THE RAIL — the app's spine: the inbox bell, one glyph per surface, the quick
 * launcher, and the user account menu anchored at the bottom-left corner (matching
 * Slack, Hanzo Desktop, and Hanzo Bot).
 *
 * The selected surface is a SOFT GLOW behind its glyph and a brighter glyph, not
 * a plate and not a pill.
 */
import { ScrollArea, Separator, SizableText, Tooltip, TooltipContent, TooltipTrigger, YStack } from '@hanzo/ui'
import { OrgMark } from '@hanzo/ui/product'
import { Bell, Plus, SlidersHorizontal } from '@hanzogui/lucide-icons-2'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { RailAccountMenu, type RailAccountMenuProps } from './BusinessHeader.tsx'
import { useNotices } from './counts.ts'
import { ICON, PAD, RAIL, STEP } from './measure.ts'
import { press } from './press.ts'
import { surfaceAt, SURFACES } from './surfaces.ts'
import { paint, round } from '~/theme/theme'

const RING = { outlineColor: '$outlineColor', outlineWidth: 2, outlineStyle: 'solid' } as const

/** Crisp 32x32 rounded-8px active pill matching hanzo.app and hanzo.bot. */
const ACTIVE_PILL = { backgroundColor: paint.railActive }

/** The one hue gui has no token for. Addressed-to-you is a categorical colour and
 *  it is `~/theme`'s, so it arrives as CSS rather than as a prop. */
const DOT = { background: paint.alert }

export type RailProps = {
  /** Whether the aside is showing, so the bell can say so. */
  notices: boolean
  onNotices: () => void
  /** The shell decides what a surface tap means: at this width it may open the
   *  navigator's drawer rather than go where you already are. */
  onSurface: (path: string) => void
  /** Account menu props rendered at the bottom-left corner of the rail. */
  account?: RailAccountMenuProps
}

export const Rail = ({ notices, onNotices, onSurface, account }: RailProps) => {
  const { pathname } = useLocation()
  const waiting = useNotices()
  const orgItems =
    account?.orgs && account.orgs.length > 0
      ? account.orgs
      : account?.currentOrg?.name || account?.currentOrg?.displayName
        ? [account.currentOrg]
        : []

  return (
    <YStack
      width={RAIL}
      shrink={0}
      height="100%"
      items="center"
      justify="space-between"
      pt={2}
      pb={2}
      style={{ backgroundColor: paint.rail }}
      data-parity-key="shell.rail"
    >
      <ScrollArea flex={1} minH={0} width="100%">
        <YStack items="center" width="100%" gap={4}>
          {orgItems.length > 0 ? (
            <>
              <YStack items="center" width="100%" gap={5} data-parity-key="shell.orgs">
                {orgItems.slice(0, 5).map((org) => {
                  const active = org.name === account?.currentOrg?.name || orgItems.length === 1
                  const label = org.displayName?.trim() || org.name || 'Workspace'
                  return (
                    <Tooltip key={org.name || label}>
                      <TooltipTrigger>
                        <YStack
                          {...press(() => account?.onSelectOrg?.(org.name), `${label} organization`)}
                          width={STEP}
                          height={STEP}
                          rounded={10}
                          items="center"
                          justify="center"
                          position="relative"
                          style={active ? ACTIVE_PILL : undefined}
                          hoverStyle={active ? undefined : { background: '$hover' }}
                          focusVisibleStyle={RING}
                        >
                          {active ? (
                            <YStack
                              position="absolute"
                              l={-6}
                              width={3}
                              height={16}
                              rounded={round.pill}
                              style={{ backgroundColor: paint.railFgActive }}
                            />
                          ) : null}
                          <OrgMark org={{ name: label, logo: org.logo }} size={22} />
                        </YStack>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  )
                })}
                {account?.onConnectOrg ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <YStack
                        {...press(account.onConnectOrg, 'Connect or switch organization')}
                        width={28}
                        height={28}
                        rounded={8}
                        items="center"
                        justify="center"
                        hoverStyle={{ background: '$hover' }}
                        focusVisibleStyle={RING}
                      >
                        <Plus size={15} color={paint.railFg} />
                      </YStack>
                    </TooltipTrigger>
                    <TooltipContent>Connect organization</TooltipContent>
                  </Tooltip>
                ) : null}
              </YStack>

              <Rule />
            </>
          ) : null}

          <Slot
            label={
              waiting > 0
                ? `${notices ? 'Hide' : 'Show'} Activity (${waiting} unread)`
                : notices
                  ? 'Hide Activity'
                  : 'Show Activity'
            }
            pressed={notices}
            onPress={onNotices}
          >
            <Bell size={ICON} color={notices ? paint.railFgActive : paint.railFg} />
            {waiting > 0 ? (
              <YStack
                position="absolute"
                t={2}
                r={2}
                minW={14}
                height={14}
                px={3}
                rounded={round.pill}
                items="center"
                justify="center"
                style={DOT}
              >
                <SizableText
                  fontSize={9}
                  lineHeight={11}
                  fontWeight="700"
                  style={{ color: paint.panel }}
                >
                  {waiting}
                </SizableText>
              </YStack>
            ) : null}
          </Slot>

          <Rule />

          {SURFACES.map((s) => {
            const here = surfaceAt(pathname)?.id === s.id
            return (
              <Slot key={s.id} label={s.label} here={here} onPress={() => onSurface(s.path)}>
                <s.icon size={ICON} color={here ? paint.railFgActive : paint.railFg} />
              </Slot>
            )
          })}
        </YStack>
      </ScrollArea>

      <YStack items="center" width="100%" gap={6} pt={6}>
        {account?.onSettings ? (
          <Slot label="Preferences (⌘,)" onPress={account.onSettings}>
            <SlidersHorizontal size={16} color={paint.railFg} />
          </Slot>
        ) : null}
        <RailAccountMenu {...account} />
      </YStack>
    </YStack>
  )
}

const Rule = () => <Separator width={RAIL - PAD * 2} my={4} borderColor="$edge" />

const Slot = ({ label, here = false, pressed, onPress, children }: {
  label: string
  here?: boolean
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}) => {
  const active = Boolean(here || pressed)
  return (
    <Tooltip>
      <TooltipTrigger>
        <YStack
          {...press(onPress, label)}
          aria-current={here ? 'page' : undefined}
          aria-pressed={pressed}
          width={STEP}
          height={STEP}
          items="center"
          justify="center"
          position="relative"
          rounded={10}
          style={active ? ACTIVE_PILL : undefined}
          hoverStyle={active ? undefined : { background: '$hover' }}
          focusVisibleStyle={RING}
        >
          {children}
        </YStack>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
