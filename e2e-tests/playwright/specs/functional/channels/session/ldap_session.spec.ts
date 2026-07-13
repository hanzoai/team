// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile} from '@mattermost/types/users';

import {configureOpenLdap, duration, expect, test} from '@mattermost/playwright-lib';

import {getActiveSessions, getSession, updateSessionExpiration} from './session_db';

const ldapAccount = {username: 'test.one', password: 'Password1'};
const sessionLengthInHours = 1;

test.describe('LDAP session extension', () => {
    test.describe.configure({mode: 'serial'});

    async function setup(pw: any, extendWithActivity: boolean) {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient, adminUser} = await pw.getAdminClient();
        await configureOpenLdap(adminClient);
        await adminClient.testLdap();
        await adminClient.syncLdap();
        const {user} = await pw.makeClient(ldapAccount);
        if (!user) {
            throw new Error(`Unable to create LDAP user ${ldapAccount.username}`);
        }
        const ldapUser = {...user, password: ldapAccount.password} as UserProfile;
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser!.id);
        await adminClient.addToTeam(team.id, ldapUser.id);
        await adminClient.patchConfig({
            ServiceSettings: {
                SessionLengthWebInHours: sessionLengthInHours,
                ExtendSessionLengthWithActivity: extendWithActivity,
            },
        });
        await adminClient.revokeAllSessionsForUser(ldapUser.id);
        const browser = await pw.testBrowser.login(ldapUser);
        await browser.channelsPage.goto(team.name, 'off-topic');
        return {...browser, adminClient, ldapUser};
    }

    /**
     * @objective Verify LDAP user activity extends a near-expiry session when activity-based extension is enabled
     *
     * @precondition
     * OpenLDAP is populated, PostgreSQL is directly reachable, and the server has an enterprise license
     */
    test(
        'MM-T4046_1 LDAP user session should have extended due to user activity when enabled',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, channelsPage, ldapUser, page} = await setup(pw, true);
            const [initialSession] = await getActiveSessions(ldapUser.id);
            expect(initialSession).toBeTruthy();
            const nearExpiry = Date.now() + duration.two_sec;
            const updated = await updateSessionExpiration(initialSession.id, nearExpiry);
            expect(Number(updated.expiresat)).toBe(nearExpiry);
            await adminClient.invalidateCaches();

            // # Generate user activity after making the session expire soon
            await page.reload();
            await channelsPage.postMessage(`extend ${Date.now()}`);

            // * Verify the same session is extended by approximately one hour
            await expect
                .poll(async () => Number((await getSession(initialSession.id)).expiresat), {
                    timeout: duration.half_min,
                })
                .toBeGreaterThan(nearExpiry);
            const extended = await getSession(initialSession.id);
            expect(Number(extended.expiresat)).toBeGreaterThan(Number(initialSession.expiresat));

            // # Continue posting with the extended session
            for (let index = 0; index < 20; index++) {
                await channelsPage.postMessage(`${index}`);
            }

            // * Verify the user remains in the channel
            await expect(page.getByRole('button', {name: "User's account menu"})).toBeVisible();
        },
    );

    /**
     * @objective Verify LDAP user activity does not extend a near-expiry session when activity-based extension is disabled
     *
     * @precondition
     * OpenLDAP is populated, PostgreSQL is directly reachable, and the server has an enterprise license
     */
    test(
        'MM-T4046_2 LDAP user session should not extend even with user activity when disabled',
        {tag: '@ldap'},
        async ({pw}) => {
            const {adminClient, channelsPage, ldapUser, page} = await setup(pw, false);
            const [initialSession] = await getActiveSessions(ldapUser.id);
            expect(initialSession).toBeTruthy();
            const nearExpiry = Date.now() + duration.two_sec;
            await channelsPage.postMessage(`now: ${Date.now()}`);
            const updated = await updateSessionExpiration(initialSession.id, nearExpiry);
            expect(Number(updated.expiresat)).toBe(nearExpiry);
            await adminClient.invalidateCaches();

            // # Reload and generate activity with session extension disabled
            await page.reload();

            // * Verify the session expiration does not change
            expect(Number((await getSession(initialSession.id)).expiresat)).toBe(nearExpiry);

            // * Verify the user is redirected to login after expiration
            await expect
                .poll(
                    async () => {
                        await page.reload();
                        return new URL(page.url()).pathname;
                    },
                    {timeout: duration.half_min},
                )
                .toMatch(/\/login/);
            expect(await getActiveSessions(ldapUser.id)).toHaveLength(0);
            expect(Number((await getSession(initialSession.id)).expiresat)).toBe(nearExpiry);
        },
    );
});
