/**
 * Reusable subcomponents for the UnifiedSidebar (`MemberPortrait`, nav rows,
 * section headers, voice action buttons, dock buttons).
 */
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { Plus } from '@hanzogui/lucide-icons-2'
import { useState, type ReactNode } from 'react'

import { paint, ring, round } from '~/theme/theme.ts'
import type { RosterMember } from '~/workspace/store.ts'
import { press } from './press.ts'

export function MemberPortrait({
  member,
  size = 24,
  speaking = false,
}: {
  member: Pick<RosterMember, 'name' | 'shortName' | 'avatar' | 'bot'>
  size?: number
  speaking?: boolean
}) {
  const [imgErr, setImgErr] = useState(false)
  const initials =
    (member.shortName || member.name || '?')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <YStack
      width={size}
      height={size}
      rounded={round.pill}
      overflow="hidden"
      items="center"
      justify="center"
      shrink={0}
      borderWidth={speaking ? 2 : 1}
      style={{
        backgroundColor: paint.avatar,
        borderColor: speaking ? paint.speaking : paint.border,
      }}
    >
      {member.avatar && !imgErr ? (
        <img
          src={member.avatar}
          alt={member.name}
          width={size}
          height={size}
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <SizableText fontSize={Math.max(9, Math.round(size * 0.4))} fontWeight="700" style={{ color: paint.avatarInk }}>
          {initials}
        </SizableText>
      )}
    </YStack>
  )
}

export function WorkspaceNavItem({
  label,
  badge,
  liveDot,
  icon,
  active,
  onPress,
  testId,
}: {
  label: string
  badge?: string
  liveDot?: boolean
  icon: ReactNode
  active: boolean
  onPress: () => void
  testId: string
}) {
  return (
    <XStack
      {...press(onPress, label)}
      height={28}
      px={8}
      rounded={7}
      items="center"
      justify="space-between"
      gap={8}
      style={active ? { backgroundColor: paint.rowActive } : undefined}
      hoverStyle={active ? undefined : { background: paint.rowHover }}
      focusVisibleStyle={ring}
      data-testid={testId}
    >
      <XStack items="center" gap={8} flex={1} minW={0}>
        {icon}
        <SizableText
          fontSize={13}
          fontWeight={active ? '600' : '400'}
          style={{ color: active ? paint.ink : paint.mute }}
          numberOfLines={1}
        >
          {label}
        </SizableText>
      </XStack>
      {badge ? (
        <SizableText fontSize={11.5} fontWeight="600" style={{ color: active ? paint.ink : paint.dim }}>
          {badge}
        </SizableText>
      ) : liveDot ? (
        <YStack width={6} height={6} rounded={round.pill} style={{ backgroundColor: paint.speaking }} />
      ) : null}
    </XStack>
  )
}

export function SectionHead({
  label,
  onAdd,
  addLabel,
}: {
  label: string
  onAdd: () => void
  addLabel: string
}) {
  return (
    <XStack px={8} pt={4} pb={2} items="center" justify="space-between">
      <SizableText fontSize={10.5} fontWeight="700" style={{ color: paint.dim, letterSpacing: 0.6 }}>
        {label}
      </SizableText>
      <XStack
        {...press(onAdd, addLabel)}
        width={18}
        height={18}
        rounded={4}
        items="center"
        justify="center"
        hoverStyle={{ background: paint.rowHover }}
      >
        <Plus size={12} color={paint.dim} />
      </XStack>
    </XStack>
  )
}

export function VoiceActionBtn({
  label,
  icon,
  active,
  danger,
  onPress,
}: {
  label: string
  icon: ReactNode
  active?: boolean
  danger?: boolean
  onPress: () => void
}) {
  return (
    <XStack
      {...press(onPress, label)}
      flex={1}
      height={24}
      px={5}
      rounded={5}
      borderWidth={1}
      items="center"
      justify="center"
      gap={4}
      style={{
        backgroundColor: active ? paint.speakingBg : paint.panel,
        borderColor: active ? paint.voiceEdge : paint.border,
      }}
      hoverStyle={{ background: paint.hover }}
    >
      {icon}
      <SizableText
        fontSize={10.5}
        fontWeight="600"
        style={{ color: danger ? paint.alert : active ? paint.speaking : paint.ink }}
      >
        {label}
      </SizableText>
    </XStack>
  )
}

export function DockIconBtn({
  label,
  pressed,
  onPress,
  testId,
  children,
}: {
  label: string
  pressed?: boolean
  onPress: () => void
  testId: string
  children: ReactNode
}) {
  return (
    <XStack
      {...press(onPress, label)}
      aria-pressed={pressed}
      width={28}
      height={28}
      rounded={6}
      items="center"
      justify="center"
      hoverStyle={{ background: paint.rowHover }}
      focusVisibleStyle={ring}
      data-testid={testId}
    >
      {children}
    </XStack>
  )
}
