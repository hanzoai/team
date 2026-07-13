// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

import {duration} from '@/util';

/**
 * Page object for the enterprise authentication and group-sync areas of the
 * System Console. Locators deliberately model visible roles, labels, and text.
 */
export default class EnterpriseSystemConsolePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoLdap() {
        await this.page.goto('/admin_console/authentication/ldap');
        await expect(this.page.getByText('AD/LDAP Wizard', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async gotoGuestAccess() {
        await this.page.goto('/admin_console/authentication/guest_access');
        await expect(this.page.getByRole('group', {name: 'Enable Guest Access:', exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async gotoSaml() {
        await this.page.goto('/admin_console/authentication/saml');
        await expect(this.page.getByRole('group', {name: 'Enable Login With SAML 2.0:', exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async expandAdditionalFilters() {
        const button = this.page.getByRole('button', {name: 'Configure additional filters', exact: true});
        if ((await button.getAttribute('aria-expanded')) !== 'true') {
            await button.click();
        }
    }

    async save() {
        const save = this.page.getByRole('button', {name: 'Save', exact: true});
        await save.click();
        await expect(save).toBeDisabled({timeout: duration.half_min});
    }

    async setGuestFilter(value: string) {
        const input = this.page.getByLabel('Guest Filter:', {exact: true});
        await input.fill(value);
        await this.save();
    }

    async setGuestAccess(enabled: boolean) {
        const radio = this.page.getByRole('radio', {name: enabled ? 'True' : 'False', exact: true}).first();
        if (!(await radio.isChecked())) {
            await radio.check();
            await this.page.getByRole('button', {name: 'Save', exact: true}).click();
            if (!enabled) {
                await this.page
                    .getByRole('dialog')
                    .getByRole('button', {name: 'Save and Disable Guest Access', exact: true})
                    .click();
            }
            await expect(this.page.getByRole('button', {name: 'Save', exact: true})).toBeDisabled({
                timeout: duration.half_min,
            });
        }
    }

    async gotoTeamConfiguration(teamId: string) {
        await this.page.goto(`/admin_console/user_management/teams/${teamId}`);
        await expect(this.page.getByText('Team Configuration', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async gotoChannelConfiguration(channelId: string) {
        await this.page.goto(`/admin_console/user_management/channels/${channelId}`);
        await expect(this.page.getByText('Channel Configuration', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async saveConfiguration(confirm = false) {
        await this.page.getByRole('button', {name: 'Save', exact: true}).click();
        if (confirm) {
            await this.page.getByRole('dialog').getByRole('button', {name: /^Yes,/}).click();
        }
    }

    async searchManagementList(value: string) {
        const search = this.page.getByPlaceholder('Search');
        await search.fill(value);
        await search.press('Enter');
    }

    async setChannelPublic(isPublic: boolean) {
        const expected = isPublic ? 'Public' : 'Private';
        const other = isPublic ? 'Private' : 'Public';
        if (
            await this.page
                .getByRole('button', {name: other, exact: true})
                .isVisible()
                .catch(() => false)
        ) {
            await this.page.getByRole('button', {name: other, exact: true}).click();
        }
        await expect(this.page.getByRole('button', {name: expected, exact: true})).toBeVisible();
    }

    async gotoChannelsList() {
        await this.page.goto('/admin_console/user_management/channels');
        await expect(this.page.getByRole('heading', {name: 'Channels', exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async gotoTeamsList() {
        await this.page.goto('/admin_console/user_management/teams');
        await expect(this.page.getByRole('heading', {name: 'Teams', exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async gotoGroupsList() {
        await this.page.goto('/admin_console/user_management/groups');
        await expect(this.page.getByText('AD/LDAP Groups', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertSearchIsEmpty() {
        await expect(this.page.getByPlaceholder('Search', {exact: true})).toHaveValue('');
    }

    async assertManagementRowCount(count: number) {
        await expect(this.page.getByRole('link', {name: 'Edit', exact: true})).toHaveCount(count, {
            timeout: duration.half_min,
        });
    }

    async assertManagementResult(displayName: string) {
        await expect(this.page.getByTestId('channel-display-name').getByText(displayName, {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertTeamManagementLabel(teamName: string, label: 'Anyone Can Join' | 'Invite Only') {
        await expect(this.page.getByTestId(`${teamName}Management`).getByText(label, {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertPagination(text: string) {
        await expect(this.page.getByText(text, {exact: true})).toBeVisible({timeout: duration.half_min});
    }

    async goToNextPage() {
        await this.page.getByRole('button', {name: 'Next page', exact: true}).click();
    }

    async clearManagementSearch() {
        await this.page.getByTestId('clear-search').click();
    }

    async clearManagementSearchWithKeyboard() {
        await this.page.getByPlaceholder('Search', {exact: true}).fill('');
    }

    async openOnlyManagementResult() {
        await this.page.getByRole('link', {name: 'Edit', exact: true}).click();
    }

    async addGroup(groupDisplayName: string) {
        await this.page.getByRole('button', {name: 'Add Group', exact: true}).click();
        const dialog = this.page.getByRole('dialog').last();
        await expect(dialog).toBeVisible({timeout: duration.half_min});
        const search = dialog.getByRole('combobox', {name: 'Search and add groups', exact: true});
        await search.fill(groupDisplayName);
        await expect(dialog.getByRole('status')).toContainText('1 result');
        await search.press('ArrowDown');
        await search.press('Enter');
        await dialog.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(this.page.getByText(groupDisplayName, {exact: true}).first()).toBeVisible();
    }

    async changeGroupRole(fromRole: string, toRole: string) {
        const currentRole = this.page.getByText(fromRole, {exact: true}).first();
        await expect(currentRole).toBeVisible({timeout: duration.half_min});
        await currentRole.click();
        const menu = this.page.getByRole('menu').last();
        await expect(menu.getByRole('menuitem')).toHaveCount(1);
        await menu.getByRole('menuitem', {name: toRole, exact: true}).click();
    }

    async assertGroupRole(role: string) {
        await expect(this.page.getByText(role, {exact: true}).first()).toBeVisible({timeout: duration.half_min});
    }

    async removeGroup(groupDisplayName: string) {
        await expect(this.page.getByText(groupDisplayName, {exact: true})).toBeVisible();
        await this.page.getByRole('link', {name: 'Remove', exact: true}).click();
        await expect(this.page.getByText('No groups specified yet', {exact: true})).toBeVisible();
    }

    async assertNoGroups() {
        await expect(this.page.getByText('No groups specified yet', {exact: true})).toBeVisible();
    }

    async toggleSyncGroupMembers() {
        await this.page.getByTestId('syncGroupSwitch-button').click();
    }

    async assertChannelMode(mode: 'Public' | 'Private') {
        await expect(this.page.getByRole('button', {name: mode, exact: true})).toBeVisible();
    }

    async assertDefaultChannelTogglesDisabled() {
        await expect(this.page.getByTestId('syncGroupSwitch-button')).toBeDisabled();
        await expect(this.page.getByRole('button', {name: 'Public', exact: true})).toBeDisabled();
    }

    async gotoGroupConfiguration(groupId: string, memberEmail?: string) {
        await this.page.goto(`/admin_console/user_management/groups/${groupId}`);
        await expect(this.page.getByText('Group Profile', {exact: true})).toBeVisible({timeout: duration.half_min});
        if (memberEmail) {
            await expect(this.page.getByText(memberEmail, {exact: true})).toBeVisible({timeout: duration.half_min});
        }
    }

    async gotoInvalidGroupConfiguration(groupId: string) {
        await this.page.goto(`/admin_console/user_management/groups/${groupId}`);
        await expect(this.page.getByText('AD/LDAP Groups', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async setGroupMention(enabled: boolean, mentionName?: string) {
        const toggle = this.page.getByTestId('allowReferenceSwitch-button');
        const isEnabled = (await toggle.getAttribute('aria-pressed')) === 'true';
        if (isEnabled !== enabled) {
            await toggle.click();
        }
        if (enabled && mentionName) {
            await this.page.getByLabel('Group Mention:', {exact: true}).fill(mentionName);
        }
        const save = this.page.getByRole('button', {name: 'Save', exact: true});
        if (await save.isEnabled()) {
            await save.click();
            await expect(save).toBeDisabled({timeout: duration.half_min});
        }
    }

    async gotoSystemScheme() {
        await this.page.goto('/admin_console/user_management/permissions/system_scheme');
        await expect(this.page.getByRole('heading', {name: 'All Members', exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async resetSystemScheme() {
        await this.page.getByRole('button', {name: 'Reset to Defaults', exact: true}).click();
        await this.page.getByRole('dialog').getByRole('button', {name: 'Yes, Reset', exact: true}).click();
        await this.save();
    }

    async disableGroupMentionsPermission() {
        const checkbox = this.page.getByTestId('all_users-posts-use_group_mentions-checkbox');
        if ((await checkbox.getByTestId('permissionCheckbox-checked').count()) > 0) {
            await checkbox.click();
            await this.save();
        }
    }

    async setGroupMentionPermissions(
        permissions: Array<{
            id:
                | 'all_users-posts-use_group_mentions-checkbox'
                | 'channel_admin-posts-use_group_mentions-checkbox'
                | 'team_admin-posts-use_group_mentions-checkbox'
                | 'guests-guest_use_group_mentions-checkbox';
            enabled: boolean;
        }>,
    ) {
        for (const permission of permissions) {
            const checkbox = this.page.getByTestId(permission.id);
            const isEnabled = (await checkbox.getByTestId('permissionCheckbox-checked').count()) > 0;
            if (isEnabled !== permission.enabled) {
                await checkbox.click();
            }
        }
        await this.save();
    }

    async assertGroupMentionPermissionsDisabled(
        ...permissionIds: Array<
            'all_users-posts-use_group_mentions-checkbox' | 'guests-guest_use_group_mentions-checkbox'
        >
    ) {
        for (const permissionId of permissionIds) {
            await expect(this.page.getByTestId(permissionId).getByTestId('permissionCheckbox-checked')).toHaveCount(0);
        }
    }

    async addTeamOrChannel(kind: 'Team' | 'Channel', displayName: string) {
        await this.page.getByRole('button', {name: /^Add Team or Channel/}).click();
        await this.page.getByRole('menuitem', {name: `Add ${kind}`, exact: true}).click();
        const dialog = this.page.getByRole('dialog').last();
        await expect(dialog).toBeVisible({timeout: duration.half_min});
        const search = dialog.getByRole('combobox', {name: `Search and add ${kind.toLowerCase()}s`, exact: true});
        await search.fill(displayName);
        await expect(dialog.getByRole('status')).toContainText('1 result');
        await search.press('ArrowDown');
        await search.press('Enter');
        await dialog.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(this.page.getByText(displayName, {exact: true}).first()).toBeVisible();
    }

    async assertNoTeamOrChannelMemberships() {
        await expect(this.page.getByText('No teams or channels specified yet', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertTeamOrChannelMembership(displayName: string, visible = true) {
        const membership = this.page.getByText(displayName, {exact: true}).first();
        if (visible) {
            await expect(membership).toBeVisible({timeout: duration.half_min});
        } else {
            await expect(membership).toHaveCount(0);
        }
    }

    async removeTeamOrChannel(displayName: string) {
        await this.requestRemoveTeamOrChannel(displayName);
        await this.confirmRemoveTeamOrChannel();
    }

    async requestRemoveTeamOrChannel(displayName: string) {
        const row = this.page
            .getByRole('row')
            .filter({has: this.page.getByText(displayName, {exact: true})})
            .filter({has: this.page.getByText(/^(Member|Team Admin|Channel Admin)$/)});
        await row.getByRole('button', {name: 'Remove', exact: true}).click();
    }

    async confirmRemoveTeamOrChannel() {
        await this.page.getByRole('dialog').getByRole('button', {name: 'Yes, Remove', exact: true}).click();
    }

    async changeMembershipRole(
        displayName: string,
        currentRole: 'Member' | 'Team Admin' | 'Channel Admin',
        newRole: 'Member' | 'Team Admin' | 'Channel Admin',
    ) {
        const row = this.page
            .getByRole('row')
            .filter({has: this.page.getByText(displayName, {exact: true})})
            .filter({has: this.page.getByText(currentRole, {exact: true})});
        await row.getByText(currentRole, {exact: true}).click();
        await this.page.getByRole('menu').last().getByRole('menuitem', {name: newRole, exact: true}).click();
        await expect(row.getByText(newRole, {exact: true})).toBeVisible({timeout: duration.half_min});
    }

    async assertMembershipRole(displayName: string, role: 'Member' | 'Team Admin' | 'Channel Admin') {
        const row = this.page.getByRole('row').filter({has: this.page.getByText(displayName, {exact: true})});
        await expect(row.getByText(role, {exact: true})).toBeVisible({timeout: duration.half_min});
    }

    async attemptToLeaveGroupConfiguration() {
        await this.page.getByRole('link', {name: 'Edition and License', exact: true}).click();
        await expect(this.page.getByRole('dialog')).toContainText(/discard/i);
    }

    async cancelLeavingGroupConfiguration() {
        await this.page.getByRole('dialog').getByRole('button', {name: 'Cancel', exact: true}).click();
    }

    async assertDefaultChannelsAvailable(teamDisplayName: string) {
        await this.page.getByRole('button', {name: /^Add Team or Channel/}).click();
        await this.page.getByRole('menuitem', {name: 'Add Channel', exact: true}).click();
        const dialog = this.page.getByRole('dialog').last();
        await dialog.getByRole('combobox', {name: 'Search and add channels', exact: true}).fill('off-');
        const status = dialog.getByRole('status');
        await expect(status).toContainText(/results? found/);
        expect(Number.parseInt((await status.textContent()) ?? '0', 10)).toBeGreaterThan(1);
        const defaultChannel = dialog.getByText(
            new RegExp(`^Off-Topic\\s*\\(\\s*${escapeRegExp(teamDisplayName)}\\s*\\)$`),
        );
        await expect(defaultChannel).toBeVisible({timeout: duration.half_min});
    }

    async gotoUsers() {
        await this.page.goto('/admin_console/user_management/users');
        await expect(this.page.getByText('Mattermost Users', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertUserAuthenticationMethod(username: string, expectedMethod: string) {
        const search = this.page.getByRole('textbox', {name: 'Search users', exact: true});
        await search.fill(username);
        const result = this.page.getByTestId('listTableBodyRow').filter({hasText: username});
        await expect(result).toHaveCount(1, {timeout: duration.half_min});
        await result.click();
        await expect(this.page.getByTestId('authenticationMethodValue')).toContainText(expectedMethod);
        await this.page.getByTestId('adminHeader-backLink').click();
    }
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
