// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import type {ReactNode} from 'react';
import {FormattedMessage, injectIntl} from 'react-intl';
import type {IntlShape} from 'react-intl';
import {Link} from 'react-router-dom';

import type {ClientConfig} from '@mattermost/types/config';
import type {PreferenceType} from '@mattermost/types/preferences';

import type {ActionResult} from 'mattermost-redux/types/actions';

import ExternalLink from 'components/external_link';

import alertIcon from 'images/icons/round-white-info-icon.svg';
import warningIcon from 'images/icons/warning-icon.svg';
import {AnnouncementBarTypes, AnnouncementBarMessages, Preferences, ConfigurationBanners} from 'utils/constants';
import {isLicenseExpired, isLicenseExpiring, isLicensePastGracePeriod} from 'utils/license_utils';
import {getSkuDisplayName} from 'utils/subscription';

import AnnouncementBar from '../default_announcement_bar';
import RenewalLink from '../renewal_link/';
import TextDismissableBar from '../text_dismissable_bar';

type Props = {
    config?: Partial<ClientConfig>;
    intl: IntlShape;
    license?: any;
    canViewSystemErrors: boolean;
    dismissedExpiringLicense?: boolean;
    dismissedExpiredLicense?: boolean;
    siteURL: string;
    currentUserId: string;
    actions: {
        dismissNotice: (notice: string) => void;
        savePreferences: (userId: string, preferences: PreferenceType[]) => Promise<ActionResult>;
    };
};

const ConfigurationAnnouncementBar = (props: Props) => {
    const {formatMessage} = props.intl;

    const dismissExpiringLicense = () => {
        props.actions.dismissNotice(AnnouncementBarMessages.LICENSE_EXPIRING);
    };

    const dismissExpiredLicense = () => {
        props.actions.savePreferences(props.currentUserId, [{
            category: Preferences.CONFIGURATION_BANNERS,
            user_id: props.currentUserId,
            name: ConfigurationBanners.LICENSE_EXPIRED,
            value: 'true',
        }]);
    };

    // System administrators
    if (props.canViewSystemErrors) {
        if ((isLicensePastGracePeriod(props.license) || isLicenseExpired(props.license)) && !props.dismissedExpiredLicense) {
            const message = (<>
                <img
                    className='advisor-icon'
                    src={warningIcon}
                />
                <FormattedMessage
                    id='announcement_bar.error.license_expired'
                    defaultMessage='{licenseSku} license is expired and some features may be disabled.'
                    values={{
                        licenseSku: getSkuDisplayName(props.license.SkuShortName, props.license.IsGovSku === 'true'),
                    }}
                />
            </>);
            return (
                <AnnouncementBar
                    type={AnnouncementBarTypes.CRITICAL}
                    message={
                        <div className='announcement-bar__configuration'>
                            {message}
                            <RenewalLink/>
                        </div>
                    }
                    tooltipMsg={message}
                    handleClose={dismissExpiredLicense}
                    showCloseButton={true}
                />
            );
        }

        if (isLicenseExpiring(props.license) && !props.dismissedExpiringLicense) {
            const message = (<>
                <img
                    className='advisor-icon'
                    src={alertIcon}
                />
                <FormattedMessage
                    id='announcement_bar.error.license_expiring'
                    defaultMessage='{licenseSku} license expires on {date, date, long}.'
                    values={{
                        date: new Date(parseInt(props.license?.ExpiresAt, 10)),
                        licenseSku: getSkuDisplayName(props.license.SkuShortName, props.license.IsGovSku === 'true'),
                    }}
                />
            </>);
            return (
                <AnnouncementBar
                    showCloseButton={true}
                    handleClose={dismissExpiringLicense}
                    type={AnnouncementBarTypes.ANNOUNCEMENT}
                    message={
                        <div className='announcement-bar__configuration'>
                            {message}
                            <RenewalLink/>
                        </div>
                    }
                    tooltipMsg={message}
                />
            );
        }
    } else {
        // Regular users
        if (isLicensePastGracePeriod(props.license)) { //eslint-disable-line no-lonely-if
            return (
                <AnnouncementBar
                    type={AnnouncementBarTypes.CRITICAL}
                    message={
                        <>
                            <img
                                className='advisor-icon'
                                src={warningIcon}
                            />
                            <FormattedMessage
                                id='announcement_bar.error.past_grace'
                                defaultMessage='{licenseSku} license is expired and some features may be disabled. Please contact your System Administrator for details.'
                                values={{
                                    licenseSku: getSkuDisplayName(props.license.SkuShortName, props.license.IsGovSku === 'true'),
                                }}
                            />
                        </>
                    }
                />
            );
        }
    }

    if (props.config?.SendEmailNotifications !== 'true' &&
            props.config?.EnablePreviewModeBanner === 'true'
    ) {
        const emailMessage = formatMessage({
            id: 'announcement_bar.error.preview_mode',
            defaultMessage: 'Preview Mode: Email notifications have not been configured.',
        });

        return (
            <TextDismissableBar
                allowDismissal={true}
                text={emailMessage}
                type={AnnouncementBarTypes.SUCCESS}
            />
        );
    }

    if (props.canViewSystemErrors && props.config?.SiteURL === '') {
        const values = {
            linkSite: (msg: ReactNode[]) => (
                <ExternalLink
                    href={props.siteURL}
                    location='configuration_announcement_bar'
                >
                    {msg}
                </ExternalLink>
            ),
            linkConsole: (msg: ReactNode[]) => (
                <Link to='/admin_console/environment/web_server'>
                    {msg}
                </Link>
            ),
        };

        let siteURLMessage;
        if (props.config?.EnableSignUpWithHanzo === 'true') {
            siteURLMessage = formatMessage({
                id: 'announcement_bar.error.site_url_gitlab.full',
                defaultMessage: 'Please configure your <linkSite>site URL</linkSite> either on the <linkConsole>System Console</linkConsole> or, if you\'re using GitLab Hanzo Team, in gitlab.rb.',
            }, values);
        } else {
            siteURLMessage = formatMessage({
                id: 'announcement_bar.error.site_url.full',
                defaultMessage: 'Please configure your <linkSite>site URL</linkSite> on the <linkConsole>System Console</linkConsole>.',
            }, values);
        }

        return (
            <TextDismissableBar
                allowDismissal={true}
                text={siteURLMessage}
                type={AnnouncementBarTypes.ANNOUNCEMENT}
            />
        );
    }

    return null;
};

export default injectIntl(ConfigurationAnnouncementBar);
