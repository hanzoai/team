// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Stage: @prod
// Group: @channels @bot_accounts

import type {Bot} from '@mattermost/types/bots';
import type {Team} from '@mattermost/types/teams';

import * as TIMEOUTS from '@/fixtures/timeouts';
import {getRandomId} from '@/utils';

// The server enforces a hard cap of 200 items per page regardless of the
// per_page value the client sends. The Bot Accounts search must therefore
// be server-side (using ?q=<term>) so that bots beyond position 200 are
// reachable. This test verifies end-to-end that bots beyond the 200-result
// page limit are findable via the search box.
//
// Setup: 250 bots are created with zero-padded sequential usernames
// (e.g. srchbot-<id>-000 … srchbot-<id>-249). The initial page load
// fetches at most 200 bots, ordered by creation time then username, so
// srchbot-<id>-200 through srchbot-<id>-249 will NOT be in the client
// store unless a server-side search is performed.
//
// Test: searching for "srchbot-<id>-2" matches only the 50 bots whose
// suffix starts with "2" (positions 200–249). Client-side filtering of the
// initial 200-bot store yields zero results; server-side search yields 50.
describe('Bot Accounts - server-side search beyond 200-bot page limit', () => {
    const BOT_COUNT = 250;
    let newTeam: Team;

    // A per-run unique prefix so the search term selects only our bots and
    // is unaffected by any pre-existing bots on the server.
    const runPrefix = `srchbot-${getRandomId()}-`;

    // "2" matches only the 50 bots whose 3-digit suffix begins with 2
    // (i.e. 200–249). None of the first-page bots (000–199) match this
    // suffix-constrained term.
    const searchTerm = `${runPrefix}2`;
    const expectedMatchCount = 50; // bots 200–249

    before(() => {
        cy.apiAdminLogin();

        cy.apiUpdateConfig({
            ServiceSettings: {EnableBotAccountCreation: true},
        });

        cy.apiInitSetup().then(({team}) => {
            newTeam = team;
        });

        // # Create BOT_COUNT bots in parallel via the raw client so the setup
        // is fast (Promise.all fires all requests concurrently).
        cy.makeClient().then(async (client) => {
            const patches = Array.from({length: BOT_COUNT}, (_, i) => ({
                username: `${runPrefix}${String(i).padStart(3, '0')}`,
                display_name: `Search Target Bot ${i}`,
                description: 'Created for search-beyond-page-limit test',
            }));

            await Promise.all(patches.map((patch) => client.createBot(patch as Partial<Bot>)));
        });
    });

    it('finds bots beyond the 200-result page limit via server-side search', () => {
        // # Navigate to the Bot Accounts integrations page
        cy.visit(`/${newTeam.name}/integrations/bots`);

        // * Wait for the page to finish its initial load (gets at most 200 bots)
        cy.get('#searchInput', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible');

        // # Type a term that matches only bots 200-249 to trigger a server-side search.
        // The initial 200-bot store contains only bots 000-199, so without the
        // server-side search the result count would be 0.
        cy.get('#searchInput').type(searchTerm);

        // # Give the 300 ms client debounce plus network round-trip time to settle
        cy.wait(TIMEOUTS.TWO_SEC);

        // * Verify that server-side search returned the 50 bots (200-249) that
        //   were not loaded in the initial page. Each bot renders as one
        //   .backstage-list__item (excluding the empty-state element which has
        //   the extra class backstage-list__empty).
        cy.get('.backstage-list__item:not(.backstage-list__empty)').
            should('have.length.gte', expectedMatchCount);
    });
});
