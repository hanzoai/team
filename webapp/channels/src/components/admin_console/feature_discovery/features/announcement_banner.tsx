// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessage} from 'react-intl';

import {LicenseSkus} from 'utils/constants';

import AnnouncementBannerSVG from './images/announcement_banner_svg';

import FeatureDiscovery from '../index';

const AnnouncementBannerFeatureDiscovery: React.FC = () => {
    return (
        <FeatureDiscovery
            featureName='announcement_banner'
            minimumSKURequiredForFeature={LicenseSkus.Professional}
            title={defineMessage({
                id: 'admin.announcement_banner_feature_discovery.title',
                defaultMessage: 'Create custom announcement banners with Hanzo Team',
            })}
            copy={defineMessage({
                id: 'admin.announcement_banner_feature_discovery.copy',
                defaultMessage: 'Create announcement banners to notify all members of important information.',
            })}
            learnMoreURL='https://docs.hanzo.team/administration/announcement-banner.html'
            featureDiscoveryImage={
                <AnnouncementBannerSVG
                    width={294}
                    height={170}
                />}
        />
    );
};

export default AnnouncementBannerFeatureDiscovery;
