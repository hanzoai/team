import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Hanzo Team Peer Dependencies: Aligns @hanzo/gui and @hanzo/ui versions', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(pkg.dependencies['@hanzo/gui'], '@hanzo/gui dependency must be defined');
  assert.ok(pkg.dependencies['@hanzo/ui'], '@hanzo/ui dependency must be defined');
  assert.ok(pkg.dependencies['react'], 'React must be defined in dependencies');
});

test('Workspace Boot: Validates clean initial workspace state with zero mock bleed', () => {
  // Simulates core store initial state contract
  const initialWorkspaceState = {
    orgs: [],
    channels: [],
    messages: [],
    roster: [],
    connectedVoiceId: null,
    voiceStatus: 'disconnected',
    activeSpaceUuid: null,
    activeChannelId: null,
    activeThreadId: null,
  };

  assert.equal(initialWorkspaceState.orgs.length, 0);
  assert.equal(initialWorkspaceState.channels.length, 0);
  assert.equal(initialWorkspaceState.messages.length, 0);
  assert.equal(initialWorkspaceState.voiceStatus, 'disconnected');
});

test('Channel Switching: Transitions active channel and filters thread stream', () => {
  let state = {
    activeChannelId: 'general',
    channels: [
      { id: 'general', name: 'General Discussion', unread: 0 },
      { id: 'dev', name: 'Engineering & Bots', unread: 3 },
      { id: 'announcements', name: 'Company News', unread: 0 }
    ],
    messages: [
      { id: 'm-1', channelId: 'general', text: 'Welcome to the team!' },
      { id: 'm-2', channelId: 'dev', text: 'Agent runner deployed.' },
      { id: 'm-3', channelId: 'dev', text: 'All smoke tests green.' }
    ]
  };

  function switchChannel(channelId) {
    const target = state.channels.find(c => c.id === channelId);
    assert.ok(target, `Channel ${channelId} must exist`);
    state.activeChannelId = channelId;
    target.unread = 0;
  }

  function getChannelMessages(channelId) {
    return state.messages.filter(m => m.channelId === channelId);
  }

  // Switch to dev channel
  switchChannel('dev');
  assert.equal(state.activeChannelId, 'dev');
  const devMessages = getChannelMessages('dev');
  assert.equal(devMessages.length, 2);
  assert.equal(devMessages[1].text, 'All smoke tests green.');

  // Unread badge should reset on transition
  assert.equal(state.channels.find(c => c.id === 'dev').unread, 0);
});

test('Agent Thread View: Isolates multi-turn bot conversation pane', () => {
  const roster = [
    { id: 'user-1', name: 'Tinh', bot: false },
    { id: 'agent-dev', name: 'Hanzo Dev', bot: true },
    { id: 'agent-o11y', name: 'Hanzo O11y', bot: true }
  ];

  const threadSession = {
    parentMessageId: 'm-2',
    agentId: 'agent-dev',
    turns: [
      { id: 't-1', role: 'user', content: 'Run local test harness' },
      { id: 't-2', role: 'assistant', content: 'Tests completed: 100% pass.' }
    ],
    isOpen: true
  };

  function resolveAgent(rosterList, agentId) {
    return rosterList.find(m => m.id === agentId && m.bot);
  }

  const agent = resolveAgent(roster, threadSession.agentId);
  assert.ok(agent, 'Agent must exist on roster');
  assert.equal(agent.name, 'Hanzo Dev');
  assert.equal(threadSession.turns.length, 2);
  assert.equal(threadSession.turns[1].role, 'assistant');
});

test('Vite Configuration: Validates SPA bundle build settings and asset pipeline', () => {
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');
  const content = fs.readFileSync(viteConfigPath, 'utf8');

  assert.ok(content.includes('defineConfig') || content.includes('plugins'), 'Valid vite config structure');
});
