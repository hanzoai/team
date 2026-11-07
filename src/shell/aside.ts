/**
 * Whether the aside is showing.
 *
 * One boolean with three readers — the rail's bell toggles it, the panel's own ×
 * clears it, and the shell draws it beside main or over it — so it is a store
 * and not shell-local state. Holding it in the shell would mean the panel could
 * only be closed by something the shell handed a callback to, and the bell and
 * the × would be reaching for the same thing along two different paths.
 *
 * It is deliberately not an address: the aside coexists with every screen rather
 * than being a place you go, so a URL that carried it would make two spellings
 * of every screen in the product.
 *
 * It IS remembered, in `localStorage`, because dismissing a panel and finding it
 * back on the next load is the panel refusing an instruction. Per browser and
 * nowhere else: it is not worth a round trip and it must not reach another
 * device. A browser that refuses to remember still has to render, so both
 * touches are wrapped and the default stands when they throw.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'team.aside'
const KIND_KEY = 'team.aside.kind'

export type AsideKind = 'inbox' | 'inspector'

const remembered = (): boolean => {
  try {
    return localStorage.getItem(KEY) === 'yes'
  } catch {
    return false
  }
}

const rememberedKind = (): AsideKind => {
  try {
    return localStorage.getItem(KIND_KEY) === 'inspector' ? 'inspector' : 'inbox'
  } catch {
    return 'inbox'
  }
}

let showing = remembered()
let kind: AsideKind = rememberedKind()
const readers = new Set<() => void>()

const notify = () => {
  for (const r of readers) r()
}

const set = (next: boolean) => {
  if (next === showing) return
  showing = next
  try {
    localStorage.setItem(KEY, next ? 'yes' : 'no')
  } catch {
    // A browser that will not remember still obeys for this session.
  }
  notify()
}

export const setAsideKind = (next: AsideKind) => {
  const changed = next !== kind
  kind = next
  try {
    localStorage.setItem(KIND_KEY, next)
  } catch {
    // Ignore storage failures.
  }
  if (!showing) {
    set(true)
  } else if (changed) {
    notify()
  }
}

export const toggleAsideKind = (target: AsideKind) => {
  if (showing && kind === target) {
    set(false)
  } else {
    setAsideKind(target)
  }
}

export const showAside = () => set(true)
export const hideAside = () => set(false)
export const toggleAside = () => set(!showing)

export const useAside = (): boolean =>
  useSyncExternalStore(
    (r) => {
      readers.add(r)
      return () => readers.delete(r)
    },
    () => showing,
    () => false,
  )

export const useAsideKind = (): AsideKind =>
  useSyncExternalStore(
    (r) => {
      readers.add(r)
      return () => readers.delete(r)
    },
    () => kind,
    () => 'inbox',
  )
