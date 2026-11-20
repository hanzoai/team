import { useEffect, useMemo, useState } from 'react'
import { IamProvider } from '@hanzo/iam/react'
import { useI18n } from '@hanzo/i18n/react'
import { configure } from '@hanzo/app/where'
import { pick } from '@hanzo/app/lib/session'
import { PreferencesDialog } from '@hanzo/app/PreferencesDialog'
import { FIRST, SettingsList, type Row } from '@hanzo/app/Settings'
import { SettingsPane } from '@hanzo/app/SettingsPane'
import { Box, Dialog, DialogContent, DialogTitle, Input, Text, XStack, YStack } from '@hanzo/ui'
import { Check, Search, X } from 'lucide-react'

import { config } from '~/data/iam.ts'
import { useSpace } from '~/data/space.tsx'

configure({ site: 'https://hanzo.ai', home: '/', brand: 'Hanzo Team', signUp: '/start' })

export type SettingsTab = 'general' | 'appearance' | 'ai' | 'account'
export type DockIconMode = 'branded' | 'minimal'

type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
type TauriListen = <T = unknown>(
  event: string,
  handler: (event: { payload: T }) => void,
) => Promise<() => void>

interface TauriWindowLike {
  __TAURI__?: {
    core?: { invoke?: TauriInvoke }
    event?: { listen?: TauriListen }
  }
  __TAURI_INTERNALS__?: {
    invoke?: TauriInvoke
  }
}

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as TauriWindowLike
  return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null
}

function getTauriListen(): TauriListen | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as TauriWindowLike
  return w.__TAURI__?.event?.listen ?? null
}

function parseDockIconMode(value: unknown): DockIconMode {
  return value === 'minimal' ? 'minimal' : 'branded'
}

type ModalListener = (tab: SettingsTab | null) => void
const modalListeners = new Set<ModalListener>()
let activeTab: SettingsTab | null = null

export function openSettingsModal(tab: SettingsTab = 'general') {
  activeTab = tab
  for (const fn of modalListeners) fn(activeTab)
}

export function closeSettingsModal() {
  activeTab = null
  for (const fn of modalListeners) fn(null)
}

function mapTab(tab: SettingsTab): string {
  if (tab === 'ai') return 'model'
  if (tab === 'account') return 'account'
  return 'general'
}

function DockIconToggleBar({ open }: { open: boolean }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<DockIconMode>('branded')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const invoke = getTauriInvoke()
    if (!open || !invoke) return

    let active = true
    invoke<string>('get_dock_icon_mode')
      .then((res) => {
        if (active) setMode(parseDockIconMode(res))
      })
      .catch(() => {
        /* ignore if unavailable */
      })

    let unlisten: (() => void) | null = null
    const listen = getTauriListen()
    if (listen) {
      Promise.resolve()
        .then(() =>
          listen<string>('dock-icon-mode-changed', (ev) => {
            if (active) setMode(parseDockIconMode(ev.payload))
          }),
        )
        .then((fn) => {
          if (active) {
            unlisten = fn
          } else {
            fn()
          }
        })
        .catch(() => {
          /* event listener permission is optional */
        })
    }

    return () => {
      active = false
      if (unlisten) unlisten()
    }
  }, [open])

  const selectMode = (next: DockIconMode) => {
    const invoke = getTauriInvoke()
    if (!invoke || saving || next === mode) return
    const previous = mode
    setMode(next)
    setSaving(true)
    invoke<string>('set_dock_icon_mode', { mode: next })
      .then((applied) => {
        setMode(parseDockIconMode(applied))
      })
      .catch(() => {
        setMode(previous)
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const options: ReadonlyArray<{ id: DockIconMode; label: string }> = [
    { id: 'branded', label: t('Branded') },
    { id: 'minimal', label: t('Minimal') },
  ]

  return (
    <XStack
      data-slot="dock-icon-setting"
      shrink={0}
      px={24}
      py={14}
      gap={16}
      items="center"
      justify="space-between"
      borderTopWidth={1}
      borderColor="var(--pane-edge, var(--border))"
      bg="var(--pane-fill, var(--card))"
    >
      <YStack gap={2} flex={1} minW={0}>
        <Text fontSize="$3" fontWeight="600" color="$ink">
          {t('Dock icon')}
        </Text>
        <Text fontSize="$1" color="$soft">
          {t('Choose between the Hanzo H badge and minimal macOS Dock icon.')}
        </Text>
      </YStack>
      <XStack
        role="group"
        aria-label={t('Dock icon')}
        gap={6}
        p={3}
        rounded={9}
        bg="var(--surface-card-emphasis)"
        borderWidth={1}
        borderColor="var(--pane-edge, var(--border))"
        shrink={0}
      >
        {options.map((opt) => {
          const selected = mode === opt.id
          return (
            <Box
              key={opt.id}
              render={<button type="button" disabled={saving} aria-pressed={selected} />}
              onClick={() => selectMode(opt.id)}
              py={5}
              px={12}
              rounded={7}
              borderWidth={1}
              borderStyle="solid"
              cursor={saving ? 'wait' : 'pointer'}
              bg={selected ? 'var(--edge, var(--white-14))' : 'transparent'}
              borderColor={selected ? 'var(--borderColor, var(--white-22))' : 'transparent'}
            >
              <XStack items="center" gap={6}>
                <Text fontSize="$2" fontWeight={selected ? '600' : '400'} color={selected ? '$ink' : '$soft'}>
                  {opt.label}
                </Text>
                {selected ? <Check size={12} color="var(--primary)" aria-hidden /> : null}
              </XStack>
            </Box>
          )
        })}
      </XStack>
    </XStack>
  )
}

function DesktopPreferencesDialog({
  open,
  onOpenChange,
  initialSection = FIRST,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: string
}) {
  const { t } = useI18n()
  const [active, setActive] = useState(initialSection)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (open) setActive(initialSection)
  }, [open, initialSection])

  const pickRow = (row: Row) => {
    if (row.href) {
      window.open(row.href, '_blank', 'noopener,noreferrer')
      return
    }
    setActive(row.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="preferences-dialog"
        width="94vw"
        maxW={980}
        height="84vh"
        maxH={760}
        p={0}
        gap={0}
        rounded={14}
        overflow="hidden"
        bg="var(--pane-fill, var(--card))"
        borderWidth={1}
        borderColor="var(--pane-edge, var(--border))"
      >
        <DialogTitle display="none">{t('Settings')}</DialogTitle>
        <XStack flex={1} minH={0} width="100%">
          <YStack
            width={236}
            shrink={0}
            height="100%"
            bg="var(--side-fill, var(--background))"
            borderRightWidth={1}
            borderColor="var(--pane-edge, var(--border))"
            $max-md={{ width: 184 }}
          >
            <XStack px={12} pt={12} pb={8} shrink={0}>
              <XStack
                flex={1}
                height={32}
                px={10}
                gap={7}
                items="center"
                rounded={8}
                bg="var(--surface-card-emphasis)"
                borderWidth={1}
                borderColor="var(--pane-edge, var(--border))"
              >
                <Search size={13} color="var(--muted-foreground)" aria-hidden />
                <Input
                  unstyled
                  value={filter}
                  onChange={(e: { target: { value: string } }) => setFilter(e.target.value)}
                  placeholder={t('Search settings')}
                  aria-label={t('Search settings')}
                  flex={1}
                  minW={0}
                  fontSize={13}
                  color="var(--foreground)"
                  placeholderTextColor="$placeholderColor"
                />
              </XStack>
            </XStack>
            <YStack flex={1} minH={0} px={8} pb={12} overflowY="auto" overflowX="hidden">
              <SettingsList active={active} filter={filter} onPick={pickRow} onBack={() => onOpenChange(false)} />
            </YStack>
          </YStack>
          <YStack flex={1} minW={0} minH={0} height="100%" bg="var(--pane-fill, var(--card))" position="relative">
            <XStack position="absolute" t={12} r={14} z={5}>
              <XStack
                render={<button type="button" />}
                aria-label={t('Close')}
                onClick={() => onOpenChange(false)}
                width={32}
                height={32}
                rounded={999}
                items="center"
                justify="center"
                bg="var(--surface-card-emphasis)"
                borderWidth={1}
                borderColor="var(--pane-edge, var(--border))"
                cursor="pointer"
                hoverStyle={{ bg: 'var(--secondary)' }}
              >
                <X size={15} color="var(--foreground)" aria-hidden />
              </XStack>
            </XStack>
            <SettingsPane id={active} />
            {active === 'general' ? <DockIconToggleBar open={open} /> : null}
          </YStack>
        </XStack>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsModal(_props: {
  user?: { name?: string; email?: string; owner?: string } | null
  orgName?: string
}) {
  const settings = useMemo(() => config(), [])
  const { current } = useSpace()
  const [tab, setTab] = useState<SettingsTab | null>(activeTab)
  const hasTauriInvoke = getTauriInvoke() !== null

  useEffect(() => {
    if (current?.org) pick(current.org)
  }, [current?.org])

  useEffect(() => {
    const fn: ModalListener = (next) => setTab(next)
    modalListeners.add(fn)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettingsModal(activeTab ?? 'general')
      } else if (e.key === 'Escape' && activeTab) {
        closeSettingsModal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      modalListeners.delete(fn)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const initialSection = tab ? mapTab(tab) : 'general'
  const handleOpenChange = (next: boolean) => {
    if (!next) closeSettingsModal()
  }

  return (
    <IamProvider config={settings}>
      {hasTauriInvoke ? (
        <DesktopPreferencesDialog
          open={tab !== null}
          onOpenChange={handleOpenChange}
          initialSection={initialSection}
        />
      ) : (
        <PreferencesDialog
          open={tab !== null}
          onOpenChange={handleOpenChange}
          initialSection={initialSection}
        />
      )}
    </IamProvider>
  )
}
