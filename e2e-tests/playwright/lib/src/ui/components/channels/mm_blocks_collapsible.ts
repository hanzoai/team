// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator} from '@playwright/test';
import {expect} from '@playwright/test';

export default class MmBlocksCollapsible {
    readonly container: Locator;
    readonly toggle: Locator;
    readonly content: Locator;

    constructor(container: Locator) {
        this.container = container;
        this.toggle = container.locator('.mm-blocks-collapsible-header__toggle');
        this.content = container.locator('.mm-blocks-collapsible-content');
    }

    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}
