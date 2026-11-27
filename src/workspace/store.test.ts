import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  getWorkspace,
  mapChannelsToWorkspace,
  mapDtoToMessage,
  mapMembersToRoster,
  openThreadPane,
  registerOrgChooser,
  resetWorkspaceStore,
  selectGuildOrg,
  syncCurrentUser,
  syncSpacesList,
} from './store.ts'

const STORE_SRC = readFileSync(fileURLToPath(new URL('./store.ts', import.meta.url)), 'utf8')

test('store starts clean with zero fake mock orgs/channels/messages and zero canned bot replies', () => {
  assert.ok(!STORE_SRC.includes('botAutoReplyText'), 'canned botAutoReplyText mock must be removed')
  assert.ok(!STORE_SRC.includes("authorId: 'zach'"), 'hardcoded authorId zach must be removed')

  resetWorkspaceStore()
  const snap = getWorkspace()
  assert.equal(snap.orgs.length, 0)
  assert.equal(snap.channels.length, 0)
  assert.equal(snap.messages.length, 0)
  assert.equal(snap.roster.length, 0)
  assert.equal(snap.connectedVoiceId, null)
  assert.equal(snap.voiceStatus, 'disconnected')
})

test('syncSpacesList and selectGuildOrg delegate real space switching to <Space>.choose', () => {
  resetWorkspaceStore()
  const chosen: string[] = []
  registerOrgChooser((slug) => chosen.push(slug))

  const rows = [
    { uuid: 'ws-1', name: 'Hanzo', url: 'hanzo', org: 'hanzo', isDisabled: false },
    { uuid: 'ws-2', name: 'Lux', url: 'lux', org: 'lux', isDisabled: false },
  ]
  syncSpacesList(rows, rows[0]!)
  assert.deepEqual(
    getWorkspace().orgs.map((o) => o.id),
    ['hanzo', 'lux'],
  )
  assert.equal(getWorkspace().activeSpaceUuid, 'ws-1')

  selectGuildOrg('lux')
  assert.equal(getWorkspace().activeOrgId, 'lux')
  assert.equal(getWorkspace().activeSpaceUuid, 'ws-2')
  assert.deepEqual(chosen, ['lux'])

  registerOrgChooser(null)
})

test('DTO mappers convert real /v1/team/{members,channels,messages} and /v1/agents payloads accurately', () => {
  const userUuid = '11111111-1111-1111-1111-111111111111'
  const botUuid = '22222222-2222-2222-2222-222222222222'

  const roster = mapMembersToRoster(
    'ws-1',
    [
      {
        id: userUuid,
        name: 'Ada Lovelace',
        bot: false,
        role: 'owner',
        active: true,
        presence: 'online',
        personRef: `person-${userUuid}`,
      },
      {
        id: botUuid,
        name: 'Dev',
        bot: true,
        role: 'member',
        active: true,
        presence: 'online',
        personRef: `person-${botUuid}`,
      },
    ],
    [
      {
        id: 'agent_dev',
        name: 'Dev',
        model: 'zen6-coder',
        description: 'Engineering specialist',
        status: 'ready',
      },
    ],
    [{ id: 'agent_dev', name: 'Dev', userId: botUuid, personRef: `person-${botUuid}`, active: true }],
  )

  assert.equal(roster.length, 2)
  assert.equal(roster[0]?.name, 'Ada Lovelace')
  assert.equal(roster[0]?.bot, false)
  assert.equal(roster[1]?.handle, 'dev')
  assert.equal(roster[1]?.bot, true)
  assert.equal(roster[1]?.model, 'zen6-coder')

  const channels = mapChannelsToWorkspace(
    'ws-1',
    [
      {
        id: 'ch-1',
        space: 'ws-1',
        name: 'general',
        topic: 'Workspace channel',
        kind: 'public',
        direct: false,
        private: false,
        archived: false,
        members: [userUuid, botUuid],
      },
      {
        id: 'dm-1',
        space: 'ws-1',
        name: '',
        kind: 'dm',
        direct: true,
        private: true,
        archived: false,
        members: [userUuid, botUuid],
      },
    ],
    roster,
    userUuid,
  )

  assert.equal(channels.length, 2)
  assert.equal(channels[0]?.kind, 'channel')
  assert.equal(channels[1]?.kind, 'dm')
  assert.equal(channels[1]?.name, 'Dev')
  assert.equal(channels[1]?.dmMemberId, botUuid)

  const msg = mapDtoToMessage(
    {
      id: 'm-1',
      channel: 'ch-1',
      author: botUuid,
      text: 'Hello @Ada Lovelace',
      mentions: [userUuid],
      createdOn: 1756598400000,
      replies: 2,
      reactions: [{ emoji: '🔥', count: 1, accounts: [userUuid] }],
      files: [],
    },
    userUuid,
  )

  assert.equal(msg.id, 'm-1')
  assert.equal(msg.authorId, botUuid)
  assert.equal(msg.replyCount, 2)
  assert.equal(msg.reactions[0]?.mine, true)

  syncCurrentUser({ id: userUuid, accountId: userUuid, name: 'Ada Lovelace' })
  openThreadPane('ch-1', 'm-1')
  assert.equal(getWorkspace().rightPaneMode, 'thread')
  assert.deepEqual(getWorkspace().activeThread, { roomId: 'ch-1', messageId: 'm-1' })
})
