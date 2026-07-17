// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator, Page} from '@playwright/test';
import {expect} from '@playwright/test';

import {duration} from '@/util';

/**
 * Team -> Integrations -> Outgoing Webhooks -> Add.
 */
export default class OutgoingWebhookForm {
    readonly page: Page;
    readonly channelSelect: Locator;

    constructor(page: Page) {
        this.page = page;

        // The channel dropdown is the combobox that offers the placeholder option.
        this.channelSelect = page.getByRole('combobox').filter({
            has: page.getByRole('option', {name: '--- Select a channel ---', exact: true}),
        });
    }

    async goto(teamName: string) {
        await this.page.goto(`/${teamName}/integrations/outgoing_webhooks/add`);
    }

    async expectChannelOptionCount(displayName: string, count: number) {
        await expect(this.channelSelect.getByRole('option', {name: displayName})).toHaveCount(count, {
            timeout: duration.half_min,
        });
    }
}
