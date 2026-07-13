// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

import {duration} from '@/util';

/**
 * User-facing channel actions for enterprise LDAP group scenarios.
 */
export default class EnterpriseChannelsPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(teamName: string, channelName = 'off-topic') {
        await this.page.goto(`/${teamName}/channels/${channelName}`);
        await expect(this.page.getByPlaceholder(/^Write to /)).toBeVisible({timeout: duration.half_min});
    }

    async gotoMessage(teamName: string, channelName: string) {
        await this.page.goto(`/${teamName}/messages/${channelName}`);
        await expect(this.page.getByPlaceholder(/^Write to /)).toBeVisible({timeout: duration.half_min});
    }

    async typeGroupMentionPrefix(prefix: string) {
        const postInput = this.page.getByPlaceholder(/^Write to /);
        await postInput.fill(`@${prefix}`);
    }

    async assertGroupMentionSuggested(groupName: string) {
        const suggestions = this.page.getByRole('listbox', {name: 'Suggestions'});
        await expect(suggestions).toBeVisible({timeout: duration.ten_sec});
        await expect(suggestions.getByText('Group Mentions', {exact: true})).toBeVisible();
        await expect(suggestions.getByText(`@${groupName}`, {exact: true})).toBeVisible();
    }

    async assertGroupMentionNotSuggested() {
        await expect(this.page.getByRole('listbox', {name: 'Suggestions'})).not.toBeVisible({
            timeout: duration.two_sec,
        });
    }

    async postGroupMention(groupName: string) {
        const postInput = this.page.getByPlaceholder(/^Write to /);
        await postInput.fill(`@${groupName}`);
        await this.page.getByRole('button', {name: 'Send Now', exact: true}).click();
        await expect(this.page.getByText(`@${groupName}`, {exact: true}).last()).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertMentionIsLinked(groupName: string) {
        await expect(this.page.getByRole('button', {name: `@${groupName}`, exact: true}).last()).toBeVisible();
    }

    async assertMentionIsPlainText(groupName: string) {
        await expect(this.page.getByText(`@${groupName}`, {exact: true}).last()).toBeVisible();
        await expect(this.page.getByRole('link', {name: `@${groupName}`, exact: true})).toHaveCount(0);
    }

    async assertMentionIsHighlighted(groupName: string) {
        const mention = this.page.getByRole('button', {name: `@${groupName}`, exact: true}).last();
        await expect(mention).toBeVisible();
        expect(
            await mention.evaluate((element) => {
                let current: Element | null = element;
                while (current) {
                    if (current.classList.contains('mention--highlight')) {
                        return true;
                    }
                    current = current.parentElement;
                }
                return false;
            }),
        ).toBe(true);
    }

    async assertMentionIsNotHighlighted(groupName: string) {
        const mention = this.page.getByRole('button', {name: `@${groupName}`, exact: true}).last();
        await expect(mention).toBeVisible();
        expect(
            await mention.evaluate((element) => {
                let current: Element | null = element;
                while (current) {
                    if (current.classList.contains('mention--highlight')) {
                        return true;
                    }
                    current = current.parentElement;
                }
                return false;
            }),
        ).toBe(false);
    }

    async assertOutOfChannelMentionMessage(username: string, canInvite: boolean) {
        await expect(
            this.page
                .getByText(
                    new RegExp(
                        `@${username} did not get notified by this mention because they are not in the channel\\.`,
                    ),
                )
                .last(),
        ).toBeVisible({timeout: duration.half_min});
        const inviteLink = this.page.getByText(/add them to (this private channel|the channel)/i, {exact: true}).last();
        if (canInvite) {
            await expect(inviteLink).toBeVisible();
        } else {
            await expect(inviteLink).toHaveCount(0);
        }
    }

    async assertGroupHasNoTeamMembers(groupName: string) {
        await expect(
            this.page.getByText(`@${groupName} has no members on this team`, {exact: false}).last(),
        ).toBeVisible({timeout: duration.half_min});
    }

    async assertNoGroupMentionSystemMessage() {
        await expect(
            this.page.getByText(/did not get notified by this mention|has no members on this team/),
        ).toHaveCount(0);
    }

    async openInvitePeople(teamDisplayName: string) {
        await this.page.getByRole('button', {name: new RegExp(`^${teamDisplayName}`)}).click();
        await this.page.getByRole('menuitem', {name: /Invite people/}).click();
        const dialog = this.page.getByRole('dialog', {name: `Invite people to ${teamDisplayName}`});
        await expect(dialog).toBeVisible({timeout: duration.half_min});
        return dialog;
    }

    async inviteBot(teamDisplayName: string, botUsername: string) {
        const dialog = await this.openInvitePeople(teamDisplayName);
        const input = dialog.getByRole('combobox', {name: 'Invite People'});
        await input.fill(botUsername);
        const option = dialog.getByRole('option', {name: new RegExp(`@${botUsername}`)});
        await expect(option).toBeVisible({timeout: duration.half_min});
        await option.click();
        await dialog.getByRole('button', {name: 'Invite', exact: true}).click();
        await expect(this.page.getByText(/Error/)).toHaveCount(0);
    }

    async removeTeamMember(teamDisplayName: string, username: string) {
        await this.page.getByRole('button', {name: new RegExp(`^${teamDisplayName}`)}).click();
        await this.page.getByRole('menuitem', {name: 'Manage members', exact: true}).click();
        const dialog = this.page.getByRole('dialog', {name: `${teamDisplayName} Members`});
        await expect(dialog).toBeVisible({timeout: duration.half_min});
        await dialog.getByRole('textbox', {name: 'Search users'}).fill(username);
        await expect(dialog.getByText(`@${username}`, {exact: true})).toBeVisible();
        await dialog.getByRole('button', {name: /^Member/}).click();
        await this.page.getByRole('menuitem', {name: 'Remove from Team', exact: true}).click();
        await expect(dialog.getByText('No users found', {exact: true})).toBeVisible({timeout: duration.half_min});
    }
}
