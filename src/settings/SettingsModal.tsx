import { useEffect, useMemo, useState } from 'react'
import { IamProvider } from '@hanzo/iam/react'
import { configure } from '@hanzo/app/where'
import { pick } from '@hanzo/app/lib/session'
import { PreferencesDialog } from '@hanzo/app/PreferencesDialog'

import { config } from '~/data/iam.ts'
import { useSpace } from '~/data/space.tsx'

configure({ site: 'https://hanzo.ai', home: '/', brand: 'Hanzo Team', signUp: '/start' })

export type SettingsTab = 'general' | 'appearance' | 'ai' | 'account'

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

export function SettingsModal(_props: {
  user?: { name?: string; email?: string; owner?: string } | null
  orgName?: string
}) {
  const settings = useMemo(() => config(), [])
  const { current } = useSpace()
  const [tab, setTab] = useState<SettingsTab | null>(activeTab)

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

  return (
    <IamProvider config={settings}>
      <PreferencesDialog
        open={tab !== null}
        onOpenChange={(next) => {
          if (!next) closeSettingsModal()
        }}
        initialSection={tab ? mapTab(tab) : 'general'}
      />
    </IamProvider>
  )
}
