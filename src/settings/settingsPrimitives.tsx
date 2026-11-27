import { Box, SizableText, Text, XStack, YStack } from '@hanzo/ui'
import { Check, RotateCcw } from 'lucide-react'
import { type CSSProperties, type ReactNode } from 'react'

import { paint, rung } from '~/theme/theme.ts'

export type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>

interface TauriWindowLike {
  __TAURI__?: { core?: { invoke?: TauriInvoke } }
  __TAURI_INTERNALS__?: { invoke?: TauriInvoke }
}

export function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as TauriWindowLike
  return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null
}

/**
 * Hanzo Dev SettingsSection + SettingsGroup card (`#141414`, `1px solid #222222`, `12px` radius).
 */
export function SettingsSectionCard({
  title,
  description,
  headerRight,
  plain = false,
  children,
}: {
  title: string
  description?: string
  headerRight?: ReactNode
  plain?: boolean
  children: ReactNode
}) {
  return (
    <YStack gap={9} width="100%">
      <XStack px={4} items="center" justify="space-between" gap={8}>
        <YStack gap={2} flex={1} minW={0}>
          <SizableText fontSize={14} fontWeight="600" style={{ color: paint.ink }}>
            {title}
          </SizableText>
          {description ? (
            <SizableText fontSize={12} style={{ color: paint.dim }}>
              {description}
            </SizableText>
          ) : null}
        </YStack>
        {headerRight ? <XStack shrink={0}>{headerRight}</XStack> : null}
      </XStack>
      {plain ? (
        <YStack gap={10} width="100%">
          {children}
        </YStack>
      ) : (
        <YStack
          rounded={12}
          borderWidth={1}
          overflow="hidden"
          style={{
            backgroundColor: 'var(--settings-card-bg, #141414)',
            borderColor: 'var(--settings-border, #222222)',
          }}
          data-slot="settings-group"
        >
          {children}
        </YStack>
      )}
    </YStack>
  )
}

/**
 * Per-row `↺ Reset` button matching Hanzo Dev's `SettingResetButton`.
 */
export function SettingResetButton({
  label,
  onReset,
}: {
  label: string
  onReset: () => void
}) {
  return (
    <Box
      render={<button type="button" aria-label={`Reset ${label} to default`} title="Reset to default (↺)" />}
      onClick={(e: { stopPropagation?: () => void }) => {
        e.stopPropagation?.()
        onReset()
      }}
      px={6}
      py={2}
      rounded={5}
      cursor="pointer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: '1px solid var(--settings-border, #222222)',
        backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
      }}
    >
      <RotateCcw size={10} color="var(--team-mute, #a1a1aa)" />
      <Text fontSize={10.5} fontWeight="600" style={{ color: paint.mute }}>
        Reset
      </Text>
    </Box>
  )
}

/**
 * Hanzo Dev SettingsRow with inline per-row `↺ Reset` action and 1px `#222222` divider.
 */
export function SettingsRow({
  title,
  description,
  badge,
  modified = false,
  onReset,
  last = false,
  control,
  children,
}: {
  title: string
  description?: string
  badge?: string
  modified?: boolean
  onReset?: () => void
  last?: boolean
  control?: ReactNode
  children?: ReactNode
}) {
  return (
    <YStack
      px={16}
      py={12}
      gap={children ? 10 : 0}
      borderBottomWidth={last ? 0 : 1}
      style={{ borderColor: 'var(--settings-border, #222222)' }}
      data-slot="settings-row"
    >
      <XStack gap={16} items="center" justify="space-between" flexWrap="wrap">
        <YStack gap={3} flex={1} minW={200}>
          <XStack items="center" gap={7} flexWrap="wrap">
            <SizableText size={rung.body} fontWeight="500" style={{ color: paint.ink }}>
              {title}
            </SizableText>
            {badge ? (
              <XStack
                px={6}
                py={1}
                rounded={4}
                borderWidth={1}
                style={{
                  backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
                  borderColor: 'var(--settings-border, #222222)',
                }}
              >
                <Text fontSize={10} fontWeight="600" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
                  {badge}
                </Text>
              </XStack>
            ) : null}
            {modified && onReset ? <SettingResetButton label={title} onReset={onReset} /> : null}
          </XStack>
          {description ? (
            <SizableText fontSize={12} lineHeight={17} style={{ color: paint.dim }}>
              {description}
            </SizableText>
          ) : null}
        </YStack>
        {control ? (
          <XStack shrink={0} items="center" gap={8}>
            {control}
          </XStack>
        ) : null}
      </XStack>
      {children}
    </YStack>
  )
}

export function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <XStack
      p={3}
      gap={2}
      rounded={8}
      borderWidth={1}
      style={{
        backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
        borderColor: 'var(--settings-border, #222222)',
      }}
    >
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <Box
            key={opt.id}
            render={<button type="button" aria-pressed={active} />}
            onClick={() => onChange(opt.id)}
            px={9}
            py={4}
            rounded={6}
            cursor="pointer"
            style={{
              backgroundColor: active ? 'var(--settings-row-active, #1f1f23)' : 'transparent',
              border: active ? '1px solid var(--settings-border, #222222)' : '1px solid transparent',
            }}
          >
            <XStack items="center" gap={4}>
              <Text
                fontSize={11.5}
                fontWeight={active ? '600' : '500'}
                style={{ color: active ? paint.ink : paint.mute }}
              >
                {opt.label}
              </Text>
              {active ? <Check size={10.5} color="var(--primary, #fafafa)" /> : null}
            </XStack>
          </Box>
        )
      })}
    </XStack>
  )
}

export function SettingsSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <Box
      render={<button type="button" role="switch" aria-checked={checked} aria-label={label} />}
      onClick={() => onChange(!checked)}
      width={36}
      height={20}
      p={2}
      rounded={999}
      cursor="pointer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        backgroundColor: checked ? 'var(--primary, #fafafa)' : 'var(--settings-control-bg, #0c0c0c)',
        border: '1px solid var(--settings-border, #222222)',
        transition: 'background-color 120ms ease',
      }}
    >
      <Box
        width={14}
        height={14}
        rounded={999}
        style={{
          backgroundColor: checked ? 'var(--primary-foreground, #09090b)' : 'var(--team-mute, #a1a1aa)',
        }}
      />
    </Box>
  )
}

export function SettingsSlider({
  id,
  label,
  value,
  min,
  max,
  step = 5,
  unit = '%',
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (next: number) => void
}) {
  const ratio = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)))
  const sliderStyle = {
    '--hz-slider-fill': `${Math.round(ratio * 100)}%`,
    width: 118,
  } as CSSProperties

  return (
    <XStack items="center" gap={10}>
      <XStack
        minW={52}
        px={8}
        py={3}
        rounded={6}
        borderWidth={1}
        items="center"
        justify="center"
        style={{
          backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
          borderColor: 'var(--settings-border, #222222)',
        }}
      >
        <Text
          fontSize={11.5}
          fontWeight="600"
          style={{ color: paint.ink, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {`${value}${unit}`}
        </Text>
      </XStack>
      <input
        id={id}
        aria-label={label}
        className="hz-settings-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        style={sliderStyle}
      />
    </XStack>
  )
}

export function SettingsSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value as T)}
      style={{
        height: 30,
        minWidth: 148,
        padding: '0 10px',
        borderRadius: 7,
        border: '1px solid var(--settings-border, #222222)',
        backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
        color: 'var(--team-ink, #fafafa)',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function KbdBadge({ keys }: { keys: string }) {
  return (
    <XStack
      px={7}
      py={2}
      rounded={5}
      borderWidth={1}
      items="center"
      justify="center"
      style={{
        backgroundColor: 'var(--settings-control-bg, #0c0c0c)',
        borderColor: 'var(--settings-border, #222222)',
      }}
    >
      <Text fontSize={11} fontWeight="600" style={{ color: paint.mute, fontFamily: 'var(--font-mono)' }}>
        {keys}
      </Text>
    </XStack>
  )
}
