// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type Loader = () => unknown;

// Every module exported from the @hanzoteam/shared package must be added to this map
const sharedDependencies = new Map<string, Loader>([
    ['@hanzoteam/shared/components/button', () => import('@hanzoteam/shared/components/button')],
    ['@hanzoteam/shared/components/emoji', () => import('@hanzoteam/shared/components/emoji')],
    ['@hanzoteam/shared/components/shortcut_key', () => import('@hanzoteam/shared/components/shortcut_key')],
    ['@hanzoteam/shared/components/tooltip', () => import('@hanzoteam/shared/components/tooltip')],
    ['@hanzoteam/shared/utils/i18n', () => import('@hanzoteam/shared/utils/i18n')],
    ['@hanzoteam/shared/utils/user_agent', () => import('@hanzoteam/shared/utils/user_agent')],
]);

export function loadSharedDependency(request: string) {
    const loader = sharedDependencies.get(request);
    if (loader) {
        return loader();
    }

    throw new Error(`A plugin attempted to load ${request} which couldn't be found.`);
}
