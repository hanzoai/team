// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator, Page} from '@playwright/test';
import {expect} from '@playwright/test';

export default class ManagedCategorySelector {
    readonly container: Locator;
    readonly control: Locator;
    readonly clearButton: Locator;

    constructor(container: Locator) {
        this.container = container;
        this.control = container.locator('.ManagedCategory__control');
        this.clearButton = container.locator('.ManagedCategory__clear-indicator');
    }

    get disabledControl() {
        return this.container.locator('.ManagedCategory__control--is-disabled');
    }

    get combobox() {
        return this.control.getByRole('combobox');
    }

    async toBeVisible() {
        await expect(this.control).toBeVisible();
    }

    getCreateCategoryOption(page: Page, categoryName: string) {
        return page.getByRole('option', {name: `Create new category: ${categoryName}`});
    }
}
