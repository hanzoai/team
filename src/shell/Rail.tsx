/**
 * COL 1 — Discord-Style Guild / Organization Rail (`56px`, `#000000`, `1px` `#222222` right border)
 *
 * - Top squircle: Official 7-path `@hanzo/logo` mark (Home / Command Center)
 * - `1px` divider
 * - Org squircles: `H` Hanzo [active white left pill flush on rail edge], `L` Lux, `Z` Zoo, `S` Science
 * - `+` Create / Join Organization
 */
import { SizableText, Tooltip, TooltipContent, TooltipTrigger, YStack } from '@hanzo/ui'
import { Plus } from '@hanzogui/lucide-icons-2'
import { useLocation } from 'react-router'

import { paint, ring, round } from '~/theme/theme.ts'
import { selectGuildOrg, useWorkspace } from '~/workspace/store.ts'
import type { RailAccountMenuProps } from './BusinessHeader.tsx'
import { openConnectModal } from './ConnectOrgModal.tsx'
import { RAIL, STEP } from './measure.ts'
import { press } from './press.ts'

export type RailProps = {
  notices?: boolean
  onNotices?: () => void
  onSurface: (path: string) => void
  account?: RailAccountMenuProps
}

/** Official 7-path `@hanzo/logo` mark */
export function HanzoLogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 67 67" fill="none" aria-hidden="true">
      <path d="M22.21 67V44.6369H0V67H22.21Z" fill="currentColor" />
      <path d="M0 44.6369L22.21 46.8285V44.6369H0Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z" fill="currentColor" />
      <path d="M22.21 0H0V22.3184H22.21V0Z" fill="currentColor" />
      <path d="M66.7198 0H44.5098V22.3184H66.7198V0Z" fill="currentColor" />
      <path d="M66.6753 22.3185L44.5098 20.0822V22.3185H66.6753Z" fill="currentColor" fillOpacity="0.65" />
      <path d="M66.7198 67V44.6369H44.5098V67H66.7198Z" fill="currentColor" />
    </svg>
  )
}

export const Rail = ({ onSurface, account }: RailProps) => {
  const { pathname } = useLocation()
  const { orgs, activeOrgId } = useWorkspace()
  const onHome = pathname === '/home'

  return (
    <YStack
      width={RAIL}
      shrink={0}
      height="100%"
      items="center"
      justify="space-between"
      py={10}
      borderRightWidth={1}
      style={{ backgroundColor: paint.rail, borderRightColor: paint.railRule }}
      data-parity-key="shell.rail"
      data-testid="guild-org-rail"
    >
      <YStack items="center" width={RAIL} gap={8}>
        {/* Top Squircle: Official 7-path Hanzo Command Center / Home */}
        <YStack width={RAIL} items="center" justify="center" position="relative">
          {onHome ? (
            <YStack
              position="absolute"
              l={0}
              width={3}
              height={18}
              rounded={round.pill}
              style={{ backgroundColor: paint.railFgActive }}
            />
          ) : null}
          <Tooltip>
            <TooltipTrigger>
              <YStack
                {...press(() => onSurface('/home'), 'Hanzo Command Center (Home)')}
                width={STEP}
                height={STEP}
                rounded={12}
                items="center"
                justify="center"
                borderWidth={1}
                style={{
                  backgroundColor: onHome ? paint.railActive : paint.elevated,
                  borderColor: onHome ? paint.border : paint.rule,
                  color: paint.railFgActive,
                }}
                hoverStyle={{ background: paint.railActive }}
                focusVisibleStyle={ring}
                data-testid="guild-rail-home"
              >
                <HanzoLogoMark size={19} />
              </YStack>
            </TooltipTrigger>
            <TooltipContent>Hanzo Command Center · Home</TooltipContent>
          </Tooltip>
        </YStack>

        {/* 1px Guild Divider */}
        <YStack width={28} height={1} style={{ backgroundColor: paint.railRule }} />

        {/* Organization Squircles: H (Hanzo), L (Lux), Z (Zoo), S (Science) */}
        <YStack items="center" width={RAIL} gap={8} data-parity-key="shell.orgs">
          {orgs.map((org) => {
            const active = org.id === activeOrgId
            return (
              <YStack key={org.id} width={RAIL} items="center" justify="center" position="relative">
                {active ? (
                  <YStack
                    position="absolute"
                    l={0}
                    width={3}
                    height={onHome ? 10 : 20}
                    rounded={round.pill}
                    style={{ backgroundColor: paint.railFgActive }}
                    data-testid={`guild-pill-${org.id}`}
                  />
                ) : null}
                <Tooltip>
                  <TooltipTrigger>
                    <YStack
                      {...press(() => {
                        selectGuildOrg(org.id)
                        account?.onSelectOrg?.(org.id)
                      }, `${org.name} organization`)}
                      width={STEP}
                      height={STEP}
                      rounded={active ? 12 : 19}
                      items="center"
                      justify="center"
                      borderWidth={1}
                      style={{
                        backgroundColor: active ? paint.railActive : paint.surface,
                        borderColor: active ? paint.border : paint.rule,
                      }}
                      hoverStyle={{ background: paint.railActive }}
                      focusVisibleStyle={ring}
                      data-testid={`guild-org-${org.id}`}
                    >
                      <SizableText
                        fontSize={13}
                        fontWeight={active ? '700' : '600'}
                        style={{ color: active ? paint.railFgActive : paint.railFg }}
                      >
                        {org.letter}
                      </SizableText>
                    </YStack>
                  </TooltipTrigger>
                  <TooltipContent>{`${org.name} — ${org.subtitle}`}</TooltipContent>
                </Tooltip>
              </YStack>
            )
          })}

          {/* + Create / Join Organization */}
          <Tooltip>
            <TooltipTrigger>
              <YStack
                {...press(() => {
                  if (account?.onConnectOrg) account.onConnectOrg()
                  else openConnectModal('connect')
                }, 'Create or join organization')}
                width={STEP}
                height={STEP}
                rounded={19}
                items="center"
                justify="center"
                borderWidth={1}
                style={{ backgroundColor: paint.surface, borderColor: paint.rule }}
                hoverStyle={{ background: paint.railActive }}
                focusVisibleStyle={ring}
                data-testid="guild-org-add"
              >
                <Plus size={16} color={paint.railFg} />
              </YStack>
            </TooltipTrigger>
            <TooltipContent>Create or join organization</TooltipContent>
          </Tooltip>
        </YStack>
      </YStack>
    </YStack>
  )
}
