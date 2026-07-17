// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator} from '@playwright/test';
import {expect} from '@playwright/test';

export default class FindChannelsModal {
    readonly container: Locator;
    readonly input;
    readonly searchList;

    constructor(container: Locator) {
        this.container = container;

        this.input = container.getByRole('combobox', {name: 'quick switch input'});
        this.searchList = container.getByRole('option');
    }

    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }

    getResult(channelName: string) {
        return this.container.getByTestId(channelName);
    }

    async selectChannel(channelName: string) {
        await this.getResult(channelName).click();
    }

    async search(text: string) {
        await this.input.fill(text);
    }

    async expectResultVisible(displayName: string) {
        await expect(this.container.getByText(displayName, {exact: true})).toBeVisible();
    }

    async expectNoResults() {
        await expect(this.container.getByText(/No results for/)).toBeVisible();
    }
}
