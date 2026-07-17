// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

import {duration} from '@/util';

/**
 * System Console -> Authentication -> AD/LDAP.
 */
export default class Ldap {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto() {
        await this.page.goto('/admin_console/authentication/ldap');
        await expect(this.page.getByText('AD/LDAP Wizard', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async expandAdditionalFilters() {
        const button = this.page.getByRole('button', {name: 'Configure additional filters', exact: true});
        if ((await button.getAttribute('aria-expanded')) !== 'true') {
            await button.click();
        }
    }

    async setGuestFilter(value: string) {
        await this.page.getByLabel('Guest Filter:', {exact: true}).fill(value);
        const saveButton = this.page.getByRole('button', {name: 'Save', exact: true});
        await saveButton.click();
        await expect(saveButton).toBeDisabled({timeout: duration.half_min});
    }

    async testConnection() {
        await this.page.getByRole('button', {name: /test connection/i}).click();
    }

    async expectConnectionSuccess() {
        await expect(this.page.getByText(/test connection successful/i)).toBeVisible({timeout: duration.half_min});
        await expect(this.page.getByTitle(/success icon/i)).toBeVisible();
    }

    async setUsernameAttribute(value: string) {
        await this.page.getByLabel(/username attribute:/i).fill(value);
    }

    async setLoginIdAttribute(value: string) {
        await this.page.getByTestId('LdapSettings.LoginIdAttributeinput').fill(value);
    }

    async save() {
        await this.page.getByRole('button', {name: 'Save', exact: true}).click();
    }

    async expectRequiredFieldError(field: string) {
        const message = new RegExp(`AD/LDAP field "${field}" is required\\.`, 'i');
        await expect(this.page.getByText(message)).toBeVisible({timeout: duration.half_min});
    }

    async expectGuestFilterDisabled() {
        await expect(this.page.getByTestId('LdapSettings.GuestFilterinput')).toBeDisabled();
    }
}
