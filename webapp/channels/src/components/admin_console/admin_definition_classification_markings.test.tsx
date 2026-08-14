// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AdminConfig, ClientLicense} from '@mattermost/types/config';

import {RESOURCE_KEYS} from 'mattermost-redux/constants/permissions_sysconsole';

import {LicenseSkus} from 'utils/constants';

import AdminDefinition from './admin_definition';
import type {AdminDefinitionSubSection, Check, ConsoleAccess} from './types';

const classificationConfigEnabled = {
    FeatureFlags: {
        ClassificationMarkings: true,
    },
} as unknown as Partial<AdminConfig>;

const classificationConfigDisabled = {
    FeatureFlags: {
        ClassificationMarkings: false,
    },
} as unknown as Partial<AdminConfig>;

const consoleAccess = {
    read: {},
    write: {
        [RESOURCE_KEYS.ABOUT.EDITION_AND_LICENSE]: true,
    },
} as ConsoleAccess;

const professionalLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.Professional,
} as ClientLicense;

const enterpriseLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.Enterprise,
} as ClientLicense;

const enterpriseAdvancedLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.EnterpriseAdvanced,
} as ClientLicense;

const entryLicense = {
    IsLicensed: 'true',
    SkuShortName: LicenseSkus.Entry,
} as ClientLicense;

const unlicensed = {
    IsLicensed: 'false',
} as ClientLicense;

function isHidden(subsection: AdminDefinitionSubSection, config: Partial<AdminConfig>, license: ClientLicense) {
    const check = subsection.isHidden as Extract<Check, (...args: any[]) => boolean>;
    return check(config, {}, license, true, consoleAccess);
}

describe('AdminDefinition - Classification Markings', () => {
    const settingsSubsection = AdminDefinition.site.subsections.classification_markings;

    test('hides the settings page below Enterprise Advanced, with nothing offered in its place', () => {
        expect(isHidden(settingsSubsection, classificationConfigEnabled, unlicensed)).toBe(true);
        expect(isHidden(settingsSubsection, classificationConfigEnabled, professionalLicense)).toBe(true);
        expect(isHidden(settingsSubsection, classificationConfigEnabled, enterpriseLicense)).toBe(true);

        expect(AdminDefinition.site.subsections).not.toHaveProperty('classification_markings_feature_discovery');
    });

    test('shows the settings page for Enterprise Advanced and Entry licenses', () => {
        expect(isHidden(settingsSubsection, classificationConfigEnabled, enterpriseAdvancedLicense)).toBe(false);
        expect(isHidden(settingsSubsection, classificationConfigEnabled, entryLicense)).toBe(false);
    });

    test('disables the settings page for non system admins', () => {
        const settingsDisabledCheck = settingsSubsection.isDisabled as Extract<Check, (...args: any[]) => boolean>;

        const asSystemAdmin = settingsDisabledCheck(classificationConfigEnabled, {}, enterpriseAdvancedLicense, true, consoleAccess, undefined, true);
        const asNonSystemAdmin = settingsDisabledCheck(classificationConfigEnabled, {}, enterpriseAdvancedLicense, true, consoleAccess, undefined, false);

        expect(asSystemAdmin).toBe(false);
        expect(asNonSystemAdmin).toBe(true);
    });

    test('hides the settings page when the Classification Markings feature flag is disabled', () => {
        expect(isHidden(settingsSubsection, classificationConfigDisabled, professionalLicense)).toBe(true);

        // The disabled flag must override an otherwise-unlocking license.
        expect(isHidden(settingsSubsection, classificationConfigDisabled, enterpriseAdvancedLicense)).toBe(true);
    });
});
