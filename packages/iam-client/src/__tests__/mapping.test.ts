//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import {
  isDirectAccountUuid,
  serviceAccountSocialValue,
  serviceAccountName,
  reconcileBotMembers
} from '../mapping'
import type { ServiceAccount } from '../types'

const sa = (over: Partial<ServiceAccount> = {}): ServiceAccount => ({
  id: '11111111-2222-3333-4444-555555555555',
  name: 'hanzo-support',
  organization: 'hanzo',
  ...over
})

describe('isDirectAccountUuid', () => {
  it('accepts canonical uuids', () => {
    expect(isDirectAccountUuid('11111111-2222-3333-4444-555555555555')).toBe(true)
  })
  it('rejects non-uuid ids', () => {
    expect(isDirectAccountUuid('hanzo-support')).toBe(false)
    expect(isDirectAccountUuid('')).toBe(false)
    expect(isDirectAccountUuid('1234')).toBe(false)
  })
})

describe('serviceAccountSocialValue', () => {
  it('is deterministic and namespaced per SA id (no duplicate accounts on re-sync)', () => {
    const v1 = serviceAccountSocialValue(sa())
    const v2 = serviceAccountSocialValue(sa())
    expect(v1).toBe(v2)
    expect(v1).toBe('iam:sa:11111111-2222-3333-4444-555555555555')
  })
  it('differs across SA ids', () => {
    expect(serviceAccountSocialValue(sa({ id: 'a' }))).not.toBe(serviceAccountSocialValue(sa({ id: 'b' })))
  })
})

describe('serviceAccountName', () => {
  it('splits <org>-<agent> into first/last', () => {
    expect(serviceAccountName(sa({ name: 'hanzo-support' }))).toEqual({ first: 'hanzo', last: 'support' })
  })
  it('prefers displayName', () => {
    expect(serviceAccountName(sa({ displayName: 'zoo-triage' }))).toEqual({ first: 'zoo', last: 'triage' })
  })
  it('falls back to <name, bot> when no separator', () => {
    expect(serviceAccountName(sa({ displayName: 'assistant' }))).toEqual({ first: 'assistant', last: 'bot' })
  })
})

describe('reconcileBotMembers', () => {
  it('adds enabled SAs that are not yet members', () => {
    const plan = reconcileBotMembers({
      desired: [sa({ id: 'a' }), sa({ id: 'b' })],
      currentBySaId: new Map([['a', 'acc-a']])
    })
    expect(plan.toAdd.map((s) => s.id)).toEqual(['b'])
    expect(plan.toRemove).toEqual([])
  })

  it('removes members whose SA no longer exists', () => {
    const plan = reconcileBotMembers({
      desired: [sa({ id: 'a' })],
      currentBySaId: new Map([['a', 'acc-a'], ['gone', 'acc-gone']])
    })
    expect(plan.toAdd).toEqual([])
    expect(plan.toRemove).toEqual(['acc-gone'])
  })

  it('treats a disabled SA as removal, not addition', () => {
    const plan = reconcileBotMembers({
      desired: [sa({ id: 'a', disabled: true })],
      currentBySaId: new Map([['a', 'acc-a']])
    })
    expect(plan.toAdd).toEqual([])
    expect(plan.toRemove).toEqual(['acc-a'])
  })

  it('does not re-add a disabled SA that is not a member', () => {
    const plan = reconcileBotMembers({
      desired: [sa({ id: 'a', disabled: true })],
      currentBySaId: new Map()
    })
    expect(plan.toAdd).toEqual([])
    expect(plan.toRemove).toEqual([])
  })

  it('is a no-op when desired == current (idempotent)', () => {
    const plan = reconcileBotMembers({
      desired: [sa({ id: 'a' }), sa({ id: 'b' })],
      currentBySaId: new Map([['a', 'acc-a'], ['b', 'acc-b']])
    })
    expect(plan.toAdd).toEqual([])
    expect(plan.toRemove).toEqual([])
  })
})
