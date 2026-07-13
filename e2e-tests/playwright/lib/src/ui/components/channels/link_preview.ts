// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator} from '@playwright/test';

export default class LinkPreview {
    readonly container: Locator;
    readonly image;
    readonly hideImageButton;
    readonly showImageButton;
    readonly removeButton;

    constructor(container: Locator) {
        this.container = container;
        this.image = container.getByRole('img', {name: /.+/});
        this.hideImageButton = container.getByRole('button', {name: 'Hide image preview'});
        this.showImageButton = container.getByRole('button', {name: 'Show image preview'});
        this.removeButton = container.getByRole('button', {name: 'Remove'});
    }
}
