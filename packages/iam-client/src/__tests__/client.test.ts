//
// Copyright © 2025 Hanzo AI Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { IamClient } from '../client'
import type { IamEnvelope, IamUser } from '../types'

const ok = (data: IamUser[]): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ status: 'ok', msg: '', data, data2: null }) satisfies IamEnvelope<IamUser[]>
  }) as unknown as Response

describe('IamClient.listServiceAccounts', () => {
  const user: IamUser = {
    id: '11111111-2222-3333-4444-555555555555',
    name: 'hanzo-support',
    owner: 'hanzo',
    type: 'service-account',
    displayName: 'hanzo-triage'
  }

  it('parses the casdoor envelope and maps users to service-accounts', async () => {
    let calledUrl = ''
    const client = new IamClient({
      url: 'https://hanzo.id/',
      token: 'tkn',
      fetchImpl: (async (url: string) => {
        calledUrl = url
        return ok([user])
      }) as unknown as typeof fetch
    })

    const sas = await client.listServiceAccounts('hanzo')
    expect(calledUrl).toBe('https://hanzo.id/v1/iam/service-accounts?organization=hanzo')
    expect(sas).toEqual([
      { id: user.id, name: 'hanzo-support', organization: 'hanzo', displayName: 'hanzo-triage', disabled: false }
    ])
  })

  it('returns [] for an empty data array', async () => {
    const client = new IamClient({
      url: 'https://hanzo.id',
      token: 'tkn',
      fetchImpl: (async () => ok([])) as unknown as typeof fetch
    })
    expect(await client.listServiceAccounts('hanzo')).toEqual([])
  })

  it('throws when IAM returns a 200 with status:error (e.g. unauthorized)', async () => {
    const client = new IamClient({
      url: 'https://hanzo.id',
      token: 'tkn',
      fetchImpl: (async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ status: 'error', msg: 'Unauthorized operation', data: null })
        }) as unknown as Response) as unknown as typeof fetch
    })
    await expect(client.listServiceAccounts('hanzo')).rejects.toThrow('Unauthorized operation')
  })

  it('throws on a non-2xx transport failure', async () => {
    const client = new IamClient({
      url: 'https://hanzo.id',
      token: 'tkn',
      fetchImpl: (async () => ({ ok: false, status: 503 }) as unknown as Response) as unknown as typeof fetch
    })
    await expect(client.listServiceAccounts('hanzo')).rejects.toThrow('503')
  })
})
