// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

import type {KeycloakUser} from '@/server/keycloak';
import {duration} from '@/util';

/**
 * User-facing SAML authentication and profile actions.
 */
export default class SamlLoginPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async login(user: KeycloakUser, waitForMattermost = true) {
        await this.page.goto('about:blank');
        await this.page.context().clearCookies();
        await this.page.goto('/login/sso/saml');
        await expect(this.page.getByLabel('Username or email', {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
        await this.page.getByLabel('Username or email', {exact: true}).fill(user.email);
        await this.page.getByLabel('Password', {exact: true}).fill(user.password);
        const keycloakOrigin = new URL(this.page.url()).origin;
        await this.page.getByRole('button', {name: /Log In|Sign In/i}).click();
        if (waitForMattermost) {
            await this.page.waitForURL((url) => url.origin !== keycloakOrigin, {timeout: duration.half_min});
            await this.page.waitForLoadState('domcontentloaded');
        }
    }

    async assertAuthenticated() {
        await expect(this.page.getByRole('button', {name: "User's account menu"})).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertMattermostError(message: string) {
        await expect(this.page.getByText(message, {exact: true})).toBeVisible({timeout: duration.half_min});
    }

    async assertKeycloakAccountDisabled() {
        await expect(
            this.page.getByText('Account is disabled, contact your administrator.', {exact: true}),
        ).toBeVisible({
            timeout: duration.half_min,
        });
    }

    async assertFullName(firstName: string, lastName: string) {
        await this.page.getByRole('button', {name: "User's account menu"}).click();
        await this.page.getByRole('menuitem', {name: 'Profile', exact: true}).click();
        const profile = this.page.getByRole('dialog', {name: 'Profile'});
        await expect(profile).toBeVisible({timeout: duration.half_min});
        await expect(profile.getByText(`${firstName} ${lastName}`, {exact: true})).toBeVisible({
            timeout: duration.half_min,
        });
        await profile.getByRole('button', {name: 'Close', exact: true}).click();
    }

    async postMessage(message: string) {
        const postInput = this.page.getByPlaceholder(/^Write to /);
        await expect(postInput).toBeVisible({timeout: duration.half_min});
        await postInput.fill(message);
        await this.page.getByRole('button', {name: 'Send Now', exact: true}).click();
        await expect(this.page.getByText(message, {exact: true}).last()).toBeVisible({timeout: duration.half_min});
    }
}
