// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AdminConfig, ClientLicense} from '@mattermost/types/config';

import {RESOURCE_KEYS} from 'mattermost-redux/constants/permissions_sysconsole';

import {LicenseSkus} from 'utils/constants';

import AdminDefinition from './admin_definition';
import type {AdminDefinitionSubSection, Check, ConsoleAccess} from './types';

const contentFlaggingConfigEnabled = {
    FeatureFlags: {
        ContentFlagging: true,
    },
} as unknown as Partial<AdminConfig>;

const contentFlaggingConfigDisabled = {
    FeatureFlags: {
        ContentFlagging: false,
    },
} as unknown as Partial<AdminConfig>;

const consoleAccess = {
    read: {
        [RESOURCE_KEYS.SITE.POSTS]: true,
        [RESOURCE_KEYS.USER_MANAGEMENT.SYSTEM_ROLES]: true,
    },
    write: {
        [RESOURCE_KEYS.SITE.POSTS]: true,
        [RESOURCE_KEYS.USER_MANAGEMENT.SYSTEM_ROLES]: true,
        [RESOURCE_KEYS.ABOUT.EDITION_AND_LICENSE]: true,
    },
} as ConsoleAccess;

const professionalLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.Professional,
} as ClientLicense;

const enterpriseAdvancedLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.EnterpriseAdvanced,
} as ClientLicense;

const entryLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.Entry,
} as ClientLicense;

function isHidden(subsection: AdminDefinitionSubSection, config: Partial<AdminConfig>, license: ClientLicense) {
    const check = subsection.isHidden as Extract<Check, (...args: any[]) => boolean>;
    return check(config, {}, license, true, consoleAccess);
}

describe('AdminDefinition - Data Spillage', () => {
    const settingsSubsection = AdminDefinition.site.subsections.content_flagging;

    test('hides the settings page below Enterprise Advanced, with nothing offered in its place', () => {
        const siteSectionHiddenCheck = AdminDefinition.site.isHidden as Extract<Check, (...args: any[]) => boolean>;

        expect(siteSectionHiddenCheck(contentFlaggingConfigEnabled, {}, professionalLicense, true, consoleAccess)).toBe(false);
        expect(isHidden(settingsSubsection, contentFlaggingConfigEnabled, professionalLicense)).toBe(true);

        expect(AdminDefinition.site.subsections).not.toHaveProperty('content_flagging_feature_discovery');
    });

    test('shows the settings page for Enterprise Advanced and Entry licenses', () => {
        expect(isHidden(settingsSubsection, contentFlaggingConfigEnabled, enterpriseAdvancedLicense)).toBe(false);
        expect(isHidden(settingsSubsection, contentFlaggingConfigEnabled, entryLicense)).toBe(false);
    });

    test('hides the settings page when the Content Flagging feature flag is disabled', () => {
        expect(isHidden(settingsSubsection, contentFlaggingConfigDisabled, professionalLicense)).toBe(true);
    });
});
