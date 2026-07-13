// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {duration, expect, runLdapSync, test} from '@mattermost/playwright-lib';

import {getLdapUser, ldapUsers, loginFromPage, removeFromAllTeams, setupLdap} from './support';

test.describe('LDAP authentication and guest filters', () => {
    test.describe.configure({mode: 'serial'});

    test.beforeEach(async ({pw}) => {
        await setupLdap(pw);
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
     * @objective Verify a newly synchronized LDAP guest with no channel assignments sees the guest message
     */
    test('LDAP login, new guest, no channels', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await adminClient.patchConfig({
            GuestAccountsSettings: {Enable: true},
            LdapSettings: {UserFilter: '(cn=no_users)', GuestFilter: '(cn=board*)'},
        });
        await runLdapSync(adminClient);
        const user = await getLdapUser(pw, adminClient, ldapUsers.guest);
        await adminClient.updateUserRoles(user.id, 'system_user');
        await adminClient.revokeAllSessionsForUser(user.id);
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
     * @objective Verify a new LDAP account can be created by logging in
     */
    test('MM-T2704 Create new LDAP account from login page', {tag: '@ldap'}, async ({pw}) => {
        const {adminClient} = await pw.getAdminClient();
        await runLdapSync(adminClient);

        // # Log in as a synchronized LDAP account
        await loginFromPage(pw, ldapUsers.guestFilterOne);

        // * Verify the account is logged in
        await expect(pw.loginPage.page.getByRole('link', {name: /Logout/i})).toBeVisible();
    });
});
