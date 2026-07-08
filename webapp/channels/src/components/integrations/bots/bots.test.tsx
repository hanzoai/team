// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {Bot} from '@mattermost/types/bots';

import {fireEvent, renderWithContext, screen, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';

import Bots from './bots';

describe('components/integrations/bots/Bots', () => {
    const team = TestHelper.getTeamMock();
    const actions = {
        loadBots: jest.fn().mockReturnValue(Promise.resolve({data: []})),
        searchBots: jest.fn().mockReturnValue(Promise.resolve({data: []})),
        getUserAccessTokensForUser: jest.fn(),
        createUserAccessToken: jest.fn(),
        revokeUserAccessToken: jest.fn(),
        enableUserAccessToken: jest.fn(),
        disableUserAccessToken: jest.fn(),
        getUser: jest.fn(),
        disableBot: jest.fn(),
        enableBot: jest.fn(),
        fetchAppsBotIDs: jest.fn(),
    };

    function createBotsAndUsers(count: number) {
        const bots: Record<string, Bot> = {};
        const users: Record<string, ReturnType<typeof TestHelper.getUserMock>> = {};
        const botList: Bot[] = [];
        for (let i = 1; i <= count; i++) {
            const bot = TestHelper.getBotMock({user_id: String(i), username: `bot${i}`, display_name: `Bot ${i}`, delete_at: 0});
            bots[bot.user_id] = bot;
            users[bot.user_id] = TestHelper.getUserMock({id: bot.user_id});
            botList.push(bot);
        }
        const loadBots = jest.fn().mockReturnValue(Promise.resolve({data: botList}));
        return {bots, users, loadBots};
    }

    // BackstageList passes filterLowered as a DOM prop which triggers a React warning
    let consoleErrorSpy: jest.SpyInstance;
    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('bots', async () => {
        const {bots, users, loadBots} = createBotsAndUsers(3);

        const {container} = renderWithContext(
            <Bots
                bots={bots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={users}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
            expect(screen.getByText(/Bot 2 \(@bot2\)/)).toBeInTheDocument();
            expect(screen.getByText(/Bot 3 \(@bot3\)/)).toBeInTheDocument();
        });

        // All should show plugin as managed-by since no owner
        const managedByDivs = container.querySelectorAll('.light.small');
        expect(managedByDivs.length).toBe(3);
        managedByDivs.forEach((div) => {
            expect(div.textContent).toContain('plugin');
        });
    });

    it('bots with bots from apps', async () => {
        const {bots, users, loadBots} = createBotsAndUsers(3);

        const {container} = renderWithContext(
            <Bots
                bots={bots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={users}
                actions={{...actions, loadBots}}
                appsEnabled={true}
                appsBotIDs={['3']}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
            expect(screen.getByText(/Bot 2 \(@bot2\)/)).toBeInTheDocument();
            expect(screen.getByText(/Bot 3 \(@bot3\)/)).toBeInTheDocument();
        });

        // Check managed-by for each bot via DOM
        const managedByDivs = container.querySelectorAll('.light.small');
        expect(managedByDivs.length).toBe(3);

        const managedByTexts = Array.from(managedByDivs).map((div) => div.textContent);
        expect(managedByTexts.filter((t) => t?.includes('Apps Framework')).length).toBe(1);
        expect(managedByTexts.filter((t) => t?.includes('plugin')).length).toBe(2);
    });

    it('bots with plugin display names', async () => {
        const bot1 = TestHelper.getBotMock({user_id: '1', owner_id: 'playbooks', username: 'bot1', display_name: 'Bot 1', delete_at: 0});
        const bots = {
            [bot1.user_id]: bot1,
        };
        const users = {
            [bot1.user_id]: TestHelper.getUserMock({id: bot1.user_id}),
        };
        const loadBots = jest.fn().mockReturnValue(Promise.resolve({data: Object.values(bots)}));

        renderWithContext(
            <Bots
                bots={bots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={users}
                pluginDisplayNames={{[bot1.user_id]: 'Playbooks'}}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('Managed by Playbooks plugin')).toBeInTheDocument();
        });
    });

    it('loads only the first page on mount', async () => {
        const firstPage: Bot[] = [];
        const allBots: Record<string, Bot> = {};
        const allUsers: Record<string, ReturnType<typeof TestHelper.getUserMock>> = {};
        for (let i = 1; i <= 200; i++) {
            const bot = TestHelper.getBotMock({user_id: String(i), username: `bot${i}`, display_name: `Bot ${i}`, delete_at: 0});
            firstPage.push(bot);
            allBots[bot.user_id] = bot;
            allUsers[bot.user_id] = TestHelper.getUserMock({id: bot.user_id});
        }

        const loadBots = jest.fn((page?: number) => {
            if (page === 0) {
                return Promise.resolve({data: firstPage});
            }
            return Promise.resolve({data: []});
        });

        renderWithContext(
            <Bots
                bots={allBots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={allUsers}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        expect(loadBots).toHaveBeenCalledTimes(1);
        expect(loadBots).toHaveBeenCalledWith(0, 200);
    });

    it('calls loadBots for the next page when it has not been fetched yet', async () => {
        // Only 200 bots in props (page 0); page 1 has not been fetched yet.
        const {bots: page0Bots, users: page0Users, loadBots: loadPage0} = createBotsAndUsers(200);
        const newestBot = TestHelper.getBotMock({user_id: '201', username: 'irisnewbot', display_name: 'Iris Newest Bot', delete_at: 0});

        const loadBots = jest.fn((page?: number) => {
            if (page === 0) {
                return Promise.resolve({data: Object.values(page0Bots)});
            }
            return Promise.resolve({data: [newestBot]});
        });
        const getUser = jest.fn();

        renderWithContext(
            <Bots
                bots={page0Bots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={page0Users}
                actions={{...actions, loadBots, getUser}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: 'Next'}));

        await waitFor(() => {
            expect(loadBots).toHaveBeenCalledWith(1, 200);
        });
        expect(loadBots).toHaveBeenCalledTimes(2);
        expect(getUser).toHaveBeenCalledWith(newestBot.user_id);
    });

    it('shows page 1 bots when navigating to the next page with already-fetched data', async () => {
        // All 201 bots already in props (simulating Redux state after both pages loaded).
        const {bots: page0Bots, users: page0Users} = createBotsAndUsers(200);
        const newestBot = TestHelper.getBotMock({user_id: '201', username: 'irisnewbot', display_name: 'Iris Newest Bot', delete_at: 0});
        const allBots = {...page0Bots, [newestBot.user_id]: newestBot};
        const allUsers = {...page0Users, [newestBot.user_id]: TestHelper.getUserMock({id: newestBot.user_id})};

        // Page 0 returns a full page so canGoNext is true on mount.
        const loadBots = jest.fn((page?: number) => {
            if (page === 0) {
                return Promise.resolve({data: Object.values(page0Bots)});
            }
            return Promise.resolve({data: []});
        });

        renderWithContext(
            <Bots
                bots={allBots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={allUsers}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        // Iris is on page 1 (alphabetically after all the bot... entries); she should
        // not be visible on page 0.
        expect(screen.queryByText(/Iris Newest Bot/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Next'}));

        await waitFor(() => {
            expect(screen.getByText(/Iris Newest Bot \(@irisnewbot\)/)).toBeInTheDocument();
        });
    });

    it('disables the Next button when the returned page has fewer than 200 bots', async () => {
        const {bots, users, loadBots} = createBotsAndUsers(3);

        renderWithContext(
            <Bots
                bots={bots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={users}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        expect(screen.getByRole('button', {name: 'Next'})).toHaveClass('disabled');
    });

    it('surfaces an error and completes loading when the first page fetch fails', async () => {
        const loadBots = jest.fn(() => Promise.resolve({error: {message: 'Failed to load bots'}}));
        const getUser = jest.fn();

        renderWithContext(
            <Bots
                bots={{}}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={{}}
                actions={{...actions, loadBots, getUser}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('Bot accounts could not be loaded. Refresh the page to try again.')).toBeInTheDocument();
        });
        expect(screen.getByText('No bot accounts found')).toBeInTheDocument();
        expect(loadBots).toHaveBeenCalledTimes(1);
        expect(loadBots).toHaveBeenCalledWith(0, 200);
        expect(getUser).not.toHaveBeenCalled();
    });

    it('shows an error and stays on the current page when a next-page fetch fails', async () => {
        const firstPage: Bot[] = [];
        const allBots: Record<string, Bot> = {};
        const allUsers: Record<string, ReturnType<typeof TestHelper.getUserMock>> = {};
        for (let i = 1; i <= 200; i++) {
            const bot = TestHelper.getBotMock({user_id: String(i), username: `bot${i}`, display_name: `Bot ${i}`, delete_at: 0});
            firstPage.push(bot);
            allBots[bot.user_id] = bot;
            allUsers[bot.user_id] = TestHelper.getUserMock({id: bot.user_id});
        }

        const loadBots = jest.fn((page?: number) => {
            if (page === 0) {
                return Promise.resolve({data: firstPage});
            }
            return Promise.resolve({error: {message: 'Failed to load bots'}});
        });

        renderWithContext(
            <Bots
                bots={allBots}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={allUsers}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', {name: 'Next'}));

        await waitFor(() => {
            expect(screen.getByText('Bot accounts could not be loaded. Refresh the page to try again.')).toBeInTheDocument();
        });

        // Page 0 bots are still rendered alongside the error.
        expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        expect(loadBots).toHaveBeenCalledWith(1, 200);
    });

    it('completes loading when the first page fetch returns no data', async () => {
        const loadBots = jest.fn(() => Promise.resolve({}));
        const getUser = jest.fn();

        renderWithContext(
            <Bots
                bots={{}}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={{}}
                actions={{...actions, loadBots, getUser}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('No bot accounts found')).toBeInTheDocument();
        });
        expect(loadBots).toHaveBeenCalledTimes(1);
        expect(loadBots).toHaveBeenCalledWith(0, 200);
        expect(getUser).not.toHaveBeenCalled();
    });

    it('stops after a single request when there are no bots', async () => {
        const loadBots = jest.fn(() => Promise.resolve({data: []}));
        const getUser = jest.fn();

        renderWithContext(
            <Bots
                bots={{}}
                team={team}
                accessTokens={{}}
                owners={{}}
                users={{}}
                actions={{...actions, loadBots, getUser}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText('No bot accounts found')).toBeInTheDocument();
        });
        expect(loadBots).toHaveBeenCalledTimes(1);
        expect(loadBots).toHaveBeenCalledWith(0, 200);
        expect(getUser).not.toHaveBeenCalled();
    });

    it('bot owner tokens', async () => {
        const bot1 = TestHelper.getBotMock({user_id: '1', owner_id: '1', username: 'bot1', display_name: 'Bot 1', delete_at: 0});
        const bots = {
            [bot1.user_id]: bot1,
        };

        const owner = TestHelper.getUserMock({id: bot1.owner_id, username: 'owner1'});
        const user = TestHelper.getUserMock({id: bot1.user_id});

        const passedTokens = {
            id: TestHelper.getUserAccessTokenMock(),
        };

        const owners = {
            [bot1.user_id]: owner,
        };

        const users = {
            [bot1.user_id]: user,
        };

        const tokens = {
            [bot1.user_id]: passedTokens,
        };

        const loadBots = jest.fn().mockReturnValue(Promise.resolve({data: Object.values(bots)}));

        const {container} = renderWithContext(
            <Bots
                bots={bots}
                team={team}
                accessTokens={tokens}
                owners={owners}
                users={users}
                actions={{...actions, loadBots}}
                appsEnabled={false}
                appsBotIDs={[]}
            />,
        );

        await waitFor(() => {
            expect(screen.getByText(/Bot 1 \(@bot1\)/)).toBeInTheDocument();
        });

        // Owner username should be shown in managed-by section
        const managedByDiv = container.querySelector('.light.small');
        expect(managedByDiv).toBeInTheDocument();
        expect(managedByDiv!.textContent).toContain('owner1');
    });
});
