/**
 * Connects `<Session>` and `<Space>` (IAM + `/v1/team/account` + transactor WebSocket)
 * to the workspace store, hydrating real channels, members, messages, bots, inbox,
 * docs, and Meet/LiveKit session state with live push updates.
 */
import { useEffect, useRef } from 'react'

import { bareAccount, Class } from '~/data/model.ts'
import { useSession } from '~/data/session.tsx'
import { useSpace } from '~/data/space.tsx'
import {
  getWorkspace,
  hydrateWorkspaceFromBackend,
  loadRoomMessages,
  loadThreadReplies,
  refreshChannelsFromBackend,
  refreshDocsFromBackend,
  refreshInboxFromBackend,
  refreshRosterFromBackend,
  registerOrgChooser,
  resetWorkspaceStore,
  syncCurrentUser,
  syncSpacesList,
} from './store.ts'

export function WorkspaceBridge() {
  const { standing: sessionStanding, who, guest } = useSession()
  const { all, current, choose, plane, connection } = useSpace()
  const hydratedKeyRef = useRef<string>('')

  // Wire org switching from Guild Rail / Sidebar straight to <Space>.choose(slug)
  useEffect(() => {
    registerOrgChooser(choose)
    return () => registerOrgChooser(null)
  }, [choose])

  // Sync real authenticated identity into the workspace store
  useEffect(() => {
    if (sessionStanding === 'out') {
      hydratedKeyRef.current = ''
      resetWorkspaceStore()
      return
    }
    if (!who) return
    const accountId = bareAccount(plane?.account ?? '') || who.id
    syncCurrentUser({
      id: who.id,
      accountId,
      name: who.label || who.name || who.email || 'Teammate',
      email: who.email,
      avatar: who.avatar,
    })
  }, [sessionStanding, who, plane?.account])

  // Keep org guild list in sync with <Space> rows immediately
  useEffect(() => {
    if (all.length === 0) return
    syncSpacesList(all, current)
  }, [all, current])

  // Hydrate full live workspace state when active space changes
  useEffect(() => {
    if (sessionStanding !== 'in' || guest || !current?.uuid) return
    const accountId = bareAccount(plane?.account ?? '')
    const key = `${current.uuid}:${accountId}`
    if (hydratedKeyRef.current === key) return
    hydratedKeyRef.current = key
    void hydrateWorkspaceFromBackend({
      spaceUuid: current.uuid,
      spaceSlug: current.url,
      spaces: all,
      current,
      accountId: accountId || undefined,
    })
  }, [sessionStanding, guest, current, all, plane?.account])

  // Subscribe to real-time transactor WebSocket broadcasts for live messages, replies, channels & roster
  useEffect(() => {
    if (!plane) return
    return plane.watch((txes) => {
      let refreshRooms = false
      let refreshRoster = false
      let refreshInbox = false
      let refreshDocs = false
      let refreshChat = false

      for (const tx of txes) {
        const cls = String(tx.objectClass ?? '')
        if (cls === Class.channel || cls === Class.direct) {
          refreshRooms = true
        } else if (cls === Class.person) {
          refreshRoster = true
        } else if (cls === Class.notice) {
          refreshInbox = true
        } else if (cls === 'team:class:Document' || cls === 'team:class:Teamspace') {
          refreshDocs = true
        } else if (cls === Class.message || cls === Class.reply || cls === Class.reaction) {
          refreshChat = true
        }
      }

      if (refreshRooms) void refreshChannelsFromBackend()
      if (refreshRoster) void refreshRosterFromBackend()
      if (refreshInbox) void refreshInboxFromBackend()
      if (refreshDocs) void refreshDocsFromBackend()
      if (refreshChat) {
        const snap = getWorkspace()
        if (snap.activeRoomId) {
          void loadRoomMessages(snap.activeRoomId, { silent: true })
        }
        if (snap.activeThread?.messageId) {
          void loadThreadReplies(snap.activeThread.messageId)
        }
      }
    })
  }, [plane])

  // Lightweight polling fallback when transactor WS is not live (and gentle inbox/presence refresh)
  useEffect(() => {
    if (sessionStanding !== 'in' || guest || !current?.uuid) return
    const chatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const snap = getWorkspace()
      if (connection !== 'live' && snap.activeRoomId) {
        void loadRoomMessages(snap.activeRoomId, { silent: true })
      }
    }, 6_000)

    const metaInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void refreshInboxFromBackend()
    }, 30_000)

    return () => {
      clearInterval(chatInterval)
      clearInterval(metaInterval)
    }
  }, [sessionStanding, guest, current?.uuid, connection])

  return null
}
