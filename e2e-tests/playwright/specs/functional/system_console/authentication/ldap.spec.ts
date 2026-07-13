// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile} from '@mattermost/types/users';

import {configureOpenLdap, duration, EnterpriseSystemConsolePage, expect, test} from '@mattermost/playwright-lib';

const ldapUsers = {
    admin: {username: 'dev.one', password: 'Password1', email: 'success+devone@simulator.amazonses.com'},
    member: {username: 'test.one', password: 'Password1', email: 'success+testone@simulator.amazonses.com'},
    guest: {username: 'board.one', password: 'Password1', email: 'success+boardone@simulator.amazonses.com'},
    guestFilterOne: {username: 'test.two', password: 'Password1', email: 'success+testtwo@simulator.amazonses.com'},
    guestFilterTwo: {
        username: 'test.three',
        password: 'Password1',
        email: 'success+testthree@simulator.amazonses.com',
    },
};

test.describe('LDAP authentication and guest filters', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await pw.ensureLicense();
        await pw.skipIfNoLicense();
        const {adminClient} = await pw.getAdminClient();
        await configureOpenLdap(adminClient);
        await adminClient.testLdap();
        await adminClient.syncLdap();
    });

    async function getLdapUser(pw: any, adminClient: any, account: (typeof ldapUsers)[keyof typeof ldapUsers]) {
        const user = await adminClient.getUserByUsername(account.username).catch(async () => {
            const result = await pw.makeClient(account);
            if (!result.user) {
                throw new Error(`Unable to create LDAP user ${account.username}`);
            }
            return result.user;
        });
        return {...user, password: account.password} as UserProfile;
    }

    async function removeFromAllTeams(adminClient: any, user: UserProfile) {
        const teams = await adminClient.getTeamsForUser(user.id);
        await Promise.all(teams.map((team: {id: string}) => adminClient.removeFromTeam(team.id, user.id)));
    }

    async function loginFromPage(pw: any, account: (typeof ldapUsers)[keyof typeof ldapUsers]) {
        await pw.hasSeenLandingPage();
        await pw.loginPage.goto();
        await pw.loginPage.loginWithLdap(account.username, account.password);
    }

    /**
     * @objective Verify an LDAP admin filter grants system administrator access to matching LDAP users
     *
     * @precondition
     * OpenLDAP is populated and the server has an LDAP-capable license
     */
    test('MM-T2821 LDAP Admin Filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {EnableAdminFilter: true, AdminFilter: '(cn=dev*)'}});

        // # Log in with an LDAP account matching the admin filter
        await loginFromPage(pw, ldapUsers.admin);

        // * Verify the LDAP user can open the System Console
        await pw.loginPage.page.goto('/admin_console');
        await expect(pw.loginPage.page.getByText('System Console', {exact: true})).toBeVisible();
    });

    /**
     * @objective Verify an existing Mattermost administrator can log in using LDAP credentials
     *
     * @precondition
     * The LDAP administrator has already synchronized into Mattermost
     */
    test('LDAP login existing MM admin', {tag: '@ldap'}, async ({pw}) => {
        // # Log in as the existing LDAP administrator
        await loginFromPage(pw, ldapUsers.admin);

        // * Verify the authenticated user account menu is available
        await expect(pw.loginPage.page.getByRole('button', {name: "User's account menu"})).toBeVisible();
    });

    /**
     * @objective Verify a member excluded by the LDAP user filter cannot log in
     */
    test('Invalid login with user filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {UserFilter: '(cn=no_users)'}});

        // # Attempt LDAP login with a filtered member
        await loginFromPage(pw, ldapUsers.member);

        // * Verify login is rejected
        await expect(pw.loginPage.loginErrorMessage).toBeVisible();
    });

    /**
     * @objective Verify a newly synchronized LDAP member with no team memberships reaches team selection
     */
    test('LDAP login, new MM user, no channels', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {UserFilter: '(cn=test*)'}});
        const user = await getLdapUser(pw, adminClient, ldapUsers.member);
        await removeFromAllTeams(adminClient, user);

        // # Log in as the LDAP member without a team
        await loginFromPage(pw, ldapUsers.member);

        // * Verify team selection is displayed
        await expect(pw.loginPage.page.getByText(/join a team|create a team/i).first()).toBeVisible();
    });

    /**
     * @objective Verify a guest excluded by both LDAP filters cannot log in
     */
    test('Invalid login with guest filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({
            LdapSettings: {UserFilter: '(cn=no_users)', GuestFilter: '(cn=no_guests)'},
        });

        // # Attempt LDAP login with a filtered guest
        await loginFromPage(pw, ldapUsers.guest);

        // * Verify login is rejected
        await expect(pw.loginPage.loginErrorMessage).toBeVisible();
    });

    /**
     * @objective Verify a newly synchronized LDAP guest with no channel assignments sees the guest message
     */
    test('LDAP login, new guest, no channels', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({
            GuestAccountsSettings: {Enable: true},
            LdapSettings: {UserFilter: '(cn=no_users)', GuestFilter: '(cn=board*)'},
        });
        await adminClient.syncLdap();
        const user = await getLdapUser(pw, adminClient, ldapUsers.guest);
        await removeFromAllTeams(adminClient, user);

        // # Log in as the LDAP guest without a channel
        await loginFromPage(pw, ldapUsers.guest);

        // * Verify the guest has no assigned channels
        await expect(
            pw.loginPage.page.getByText(
                'Your guest account has no channels assigned. Please contact an administrator.',
                {exact: true},
            ),
        ).toBeVisible({timeout: duration.half_min});
    });

    /**
     * @objective Verify an LDAP member can log in after being invited to a team
     */
    test('LDAP Member login with team invite', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        await adminClient.patchConfig({LdapSettings: {UserFilter: '(cn=test*)'}});
        const user = await getLdapUser(pw, adminClient, ldapUsers.member);
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser!.id);
        await adminClient.addToTeam(team.id, user.id);

        // # Log in as the invited LDAP member
        await loginFromPage(pw, ldapUsers.member);

        // * Verify the invited team is available
        await expect(pw.loginPage.page.getByText(team.display_name, {exact: true}).first()).toBeVisible();
    });

    /**
     * @objective Verify an LDAP guest can log in after being invited to a team and channel
     */
    test('LDAP Guest login with team invite', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        await adminClient.patchConfig({
            GuestAccountsSettings: {Enable: true},
        });
        const user = await getLdapUser(pw, adminClient, ldapUsers.guest);
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser!.id);
        await adminClient.addToTeam(team.id, user.id);
        const channel = await adminClient.getChannelByName(team.id, 'town-square');
        await adminClient.addToChannel(user.id, channel.id);

        // # Log in as the invited LDAP guest
        await loginFromPage(pw, ldapUsers.guest);

        // * Verify Town Square is available
        await expect(pw.loginPage.page.getByText('Town Square', {exact: true}).first()).toBeVisible();
    });

    /**
     * @objective Verify the LDAP guest filter demotes matching users and preserves their guest role when cleared
     */
    test('MM-T1422 LDAP Guest Filter', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        await adminClient.patchConfig({GuestAccountsSettings: {Enable: true}});
        const userOne = await getLdapUser(pw, adminClient, ldapUsers.guestFilterOne);
        const userTwo = await getLdapUser(pw, adminClient, ldapUsers.guestFilterTwo);
        await adminClient.promoteGuestToUser(userOne.id).catch(() => undefined);
        await adminClient.promoteGuestToUser(userTwo.id).catch(() => undefined);
        await removeFromAllTeams(adminClient, userOne);
        await removeFromAllTeams(adminClient, userTwo);
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);

        // # Set the LDAP guest filter to the first user and synchronize
        await consolePage.gotoLdap();
        await consolePage.expandAdditionalFilters();
        await consolePage.setGuestFilter(`(uid=${ldapUsers.guestFilterOne.username})`);
        await adminClient.syncLdap();
        await pw.makeClient(ldapUsers.guestFilterOne, {useCache: false});

        // * Verify only the matching account becomes a guest
        expect((await adminClient.getUser(userOne.id)).roles).toContain('system_guest');
        expect((await adminClient.getUser(userTwo.id)).roles).not.toContain('system_guest');

        // # Clear the guest filter and synchronize again
        await consolePage.setGuestFilter('');
        await adminClient.syncLdap();

        // * Verify the existing guest remains a guest
        expect((await adminClient.getUser(userOne.id)).roles).toContain('system_guest');
    });

    /**
     * @objective Verify LDAP and SAML guest filters are disabled and ignored when guest access is disabled
     */
    test('MM-T1424 LDAP Guest Filter behavior when Guest Access is disabled', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        const user = await getLdapUser(pw, adminClient, ldapUsers.guestFilterOne);
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);

        // # Enable guests and restore the LDAP account as a regular member
        await consolePage.gotoGuestAccess();
        await consolePage.setGuestAccess(true);
        await adminClient.syncLdap();
        await adminClient.promoteGuestToUser(user.id).catch(() => undefined);

        // # Configure a guest filter, then disable guest access
        await consolePage.gotoLdap();
        await consolePage.expandAdditionalFilters();
        await consolePage.setGuestFilter(`(uid=${ldapUsers.guestFilterOne.username})`);
        await consolePage.gotoGuestAccess();
        await consolePage.setGuestAccess(false);

        // * Verify LDAP and SAML guest filter controls are disabled
        await consolePage.gotoLdap();
        await expect(page.getByTestId('LdapSettings.GuestFilterinput')).toBeDisabled();
        await consolePage.gotoSaml();
        await expect(page.getByTestId('SamlSettings.GuestAttributeinput')).toBeDisabled();

        // # Log in again after disabling guest access
        await loginFromPage(pw, ldapUsers.guestFilterOne);

        // * Verify the disabled guest filter does not demote the LDAP user
        expect((await adminClient.getUser(user.id)).roles).not.toContain('system_guest');
    });

    /**
     * @objective Verify manually demoting an LDAP member persists after the user logs in again
     */
    test('MM-T1425 LDAP Guest Filter Change', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({GuestAccountsSettings: {Enable: true}, LdapSettings: {GuestFilter: ''}});
        const user = await getLdapUser(pw, adminClient, ldapUsers.guestFilterTwo);
        await adminClient.demoteUserToGuest(user.id);

        // # Log in again after demotion
        await loginFromPage(pw, ldapUsers.guestFilterTwo);

        // * Verify the account remains a guest
        expect((await adminClient.getUser(user.id)).roles).toContain('system_guest');
    });

    /**
     * @objective Verify a guest in a group-synchronized team cannot invite another guest
     */
    test('MM-T1427 Prevent Invite Guest for LDAP Group Synced Teams', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient, adminUser} = await pw.getAdminClient();
        await adminClient.patchConfig({
            GuestAccountsSettings: {Enable: true},
            LdapSettings: {GuestFilter: '(cn=board*)'},
        });
        await adminClient.syncLdap();
        const team = await adminClient.createTeam(await pw.random.team());
        await adminClient.addToTeam(team.id, adminUser!.id);
        const {groups} = await adminClient.getLdapGroups();
        const board = groups.find((group: {name: string}) => group.name === 'board');
        expect(board).toBeTruthy();
        const linked = board!.mattermost_group_id
            ? await adminClient.getGroup(board!.mattermost_group_id)
            : await adminClient.linkLdapGroup(board!.primary_key);
        expect(linked).toBeTruthy();
        await adminClient.linkGroupSyncable(linked!.id, team.id, 'team', {auto_add: true});
        await adminClient.syncLdap();
        const {user: authenticatedMember} = await pw.makeClient(ldapUsers.guest, {useCache: false});
        if (!authenticatedMember) {
            throw new Error(`Unable to authenticate LDAP member ${ldapUsers.guest.username}`);
        }
        await adminClient.promoteGuestToUser(authenticatedMember.id).catch(() => undefined);
        const member = {...authenticatedMember, password: ldapUsers.guest.password} as UserProfile;
        await adminClient.createGroupTeamsAndChannels(member.id);
        await adminClient.getTeamMember(team.id, member.id).catch(() => adminClient.addToTeam(team.id, member.id));
        const townSquare = await adminClient.getChannelByName(team.id, 'town-square');
        await adminClient
            .getChannelMember(townSquare.id, member.id)
            .catch(() => adminClient.addToChannel(member.id, townSquare.id));

        // # Log in as the synchronized member and open the team menu
        const {channelsPage} = await pw.testBrowser.login(member);
        await channelsPage.goto(team.name, 'town-square');
        const teamMenu = await channelsPage.openTeamMenu();

        // * Verify inviting people is unavailable for the group-synchronized team
        await expect(teamMenu.invitePeople).not.toBeVisible();
    });

    /**
     * @objective Verify the LDAP connection test reports success
     */
    test('MM-T2699 Connection test button - Successful', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Test the configured LDAP connection
        await page.getByRole('button', {name: /test connection/i}).click();

        // * Verify a successful result
        await expect(page.getByText(/test connection successful/i)).toBeVisible();
        await expect(page.getByTitle(/success icon/i)).toBeVisible();
    });

    /**
     * @objective Verify Username Attribute is required in LDAP settings
     */
    test('MM-T2700 LDAP username required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Clear Username Attribute and save
        await page.getByLabel(/username attribute:/i).fill('');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        // * Verify required-field validation
        await expect(page.getByText('AD/LDAP field "Username Attribute" is required.')).toBeVisible();

        // # Restore the configured value
        await page.getByLabel(/username attribute:/i).fill('uid');
        await page.getByRole('button', {name: 'Save', exact: true}).click();
    });

    /**
     * @objective Verify Login ID Attribute is required in LDAP settings
     */
    test('MM-T2701 LDAP LoginidAttribute required', {tag: '@ldap'}, async ({pw}) => {
        const {adminUser} = await pw.getAdminClient();
        const {page} = await pw.testBrowser.login(adminUser!);
        const consolePage = new EnterpriseSystemConsolePage(page);
        await consolePage.gotoLdap();

        // # Clear Login ID Attribute and save
        await page.getByTestId('LdapSettings.LoginIdAttributeinput').fill('');
        await page.getByRole('button', {name: 'Save', exact: true}).click();

        // * Verify required-field validation
        await expect(page.getByText(/ad\/ldap field "login id attribute" is required./i)).toBeVisible();
    });

    /**
     * @objective Verify a new LDAP account can be created by logging in
     */
    test('MM-T2704 Create new LDAP account from login page', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.syncLdap();

        // # Log in as a synchronized LDAP account
        await loginFromPage(pw, ldapUsers.guestFilterOne);

        // * Verify the account is logged in
        await expect(pw.loginPage.page.getByRole('link', {name: /Logout/i})).toBeVisible();
    });
});
