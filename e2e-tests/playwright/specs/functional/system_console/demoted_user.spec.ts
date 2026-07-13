// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {duration, expect, test} from '@mattermost/playwright-lib';

test.describe('System Console role changes', {tag: '@system_console'}, () => {
    /**
     * @objective Verify a user viewing the System Console is redirected to Town Square immediately after losing the system admin role.
     */
    test('MM-T922 Demoted user cannot continue to view System Console', {tag: '@smoke'}, async ({pw}) => {
        const {adminClient, team, user} = await pw.initSetup();
        await adminClient.updateUserRoles(user.id, 'system_user system_admin');

        // # Log in as the promoted user and open System Analytics in the System Console
        const {channelsPage, page, systemConsolePage} = await pw.testBrowser.login(user);
        await page.goto('/admin_console/reporting/system_analytics');
        await systemConsolePage.toBeVisible();
        await expect(page).toHaveURL(/\/admin_console\/reporting\/system_analytics/);

        // # Remove the system admin role while the user is still viewing the System Console
        await adminClient.updateUserRoles(user.id, 'system_user');

        // * Verify the active session is redirected to Town Square and no longer displays the System Console
        await expect(page).toHaveURL(new RegExp(`/${team.name}/channels/town-square`), {timeout: duration.half_min});
        await channelsPage.toBeVisible();
        await expect(systemConsolePage.navbar.container).not.toBeVisible();
    });
});
