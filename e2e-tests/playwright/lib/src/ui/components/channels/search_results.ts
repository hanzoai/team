// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator, Page} from '@playwright/test';
import {expect} from '@playwright/test';

export default class SearchResults {
    readonly container: Locator;
    readonly popoutButton: Locator;
    readonly closeButton: Locator;
    readonly teamSelectorContainer: Locator;

    constructor(container: Locator) {
        this.container = container;
        this.popoutButton = container.locator('.PopoutButton');
        this.closeButton = container.locator('#searchResultsCloseButton');
        this.teamSelectorContainer = container.locator('.team-selector-container');
    }

    static fromPage(page: Page) {
        return new SearchResults(page.locator('#searchContainer'));
    }

    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }

    getHeading(name: string | RegExp) {
        return this.container.getByRole('heading', {name});
    }

    getTab(name: string | RegExp) {
        return this.container.getByRole('tab', {name});
    }

    getText(text: string | RegExp) {
        return this.container.getByText(text);
    }
}
