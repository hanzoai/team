// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ConfigurationBar from 'components/announcement_bar/configuration_bar/configuration_bar';

import {renderWithContext} from 'tests/react_testing_utils';

describe('components/ConfigurationBar', () => {
    const millisPerDay = 24 * 60 * 60 * 1000;

    const baseProps = {
        isLoggedIn: true,
        canViewSystemErrors: true,
        license: {
            Id: '1234',
            IsLicensed: 'true',
            ExpiresAt: Date.now() + millisPerDay,
            ShortSkuName: 'skuShortName',
        },
        config: {
            SendEmailNotifications: 'false',
        },
        dismissedExpiringLicense: false,
        dismissedExpiredLicense: false,
        siteURL: '',
        totalUsers: 100,
        actions: {
            dismissNotice: jest.fn(),
            savePreferences: jest.fn(),
        },
        currentUserId: 'user-id',
    };

    test('should match snapshot, expired, in grace period', () => {
        const props = {...baseProps, license: {Id: '1234', IsLicensed: 'true', ExpiresAt: Date.now() - millisPerDay, SkuShortName: 'enterprise'}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, expired', () => {
        const props = {...baseProps, license: {Id: '1234', IsLicensed: 'true', ExpiresAt: Date.now() - (11 * millisPerDay), SkuShortName: 'enterprise'}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, expired, regular user', () => {
        const props = {...baseProps, canViewSystemErrors: false, license: {Id: '1234', IsLicensed: 'true', ExpiresAt: Date.now() - (11 * millisPerDay), SkuShortName: 'enterprise'}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, expired, cloud license, show nothing', () => {
        const props = {...baseProps, canViewSystemErrors: false, license: {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: Date.now() - (11 * millisPerDay)}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, expiring, cloud license, show nothing', () => {
        const props = {...baseProps, canViewSystemErrors: false, license: {Id: '1234', IsLicensed: 'true', Cloud: 'true', ExpiresAt: Date.now()}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('should match snapshot, show nothing', () => {
        const props = {...baseProps, license: {Id: '1234', IsLicensed: 'true', ExpiresAt: Date.now() + (61 * millisPerDay)}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toMatchSnapshot();
    });

    test('warns that a trial license is expiring without offering to sell one', () => {
        const props = {...baseProps, canViewSystemErrors: true, license: {Id: '1234', IsLicensed: 'true', IsTrial: 'true', SkuShortName: 'enterprise', ExpiresAt: String(Date.now() + 1)}};
        const {container} = renderWithContext(
            <ConfigurationBar {...props}/>,
        );

        expect(container).toHaveTextContent('license expires on');
        expect(container).not.toHaveTextContent(/purchase/i);
        expect(container).not.toHaveTextContent(/free trial/i);
    });
});
