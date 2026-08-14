// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React from 'react';
import {useSelector} from 'react-redux';
import {Link} from 'react-router-dom';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

import BackButton from 'components/common/back_button';
import Wordmark from 'components/common/svg_images_components/wordmark';

import './header.scss';

export type HeaderProps = {
    alternateLink?: React.ReactElement;
    backButtonURL?: string;
    onBackButtonClick?: React.EventHandler<React.MouseEvent>;
};

const Header = ({alternateLink, backButtonURL, onBackButtonClick}: HeaderProps) => {
    const {SiteName} = useSelector(getConfig);

    const ariaLabel = SiteName || 'Hanzo Team';

    // The wordmark stands for the product. An operator who set their own site
    // name gets that name instead; there is no edition to advertise.
    const title: React.ReactNode = SiteName && SiteName !== 'Hanzo Team' ? SiteName : <Wordmark/>;

    return (
        <div
            data-testid='hfroute-header'
            className={classNames('hfroute-header', {'has-custom-site-name': title})}
        >
            <div className='header-main'>
                <div>
                    {title &&
                        <Link
                            data-testid='header-logo-link'
                            className='header-logo-link'
                            to='/'
                            aria-label={ariaLabel}
                        >
                            {title}
                        </Link>
                    }
                </div>
                {alternateLink}
            </div>
            {onBackButtonClick && (
                <BackButton
                    className='header-back-button'
                    url={backButtonURL}
                    onClick={onBackButtonClick}
                />
            )}
        </div>
    );
};

export default Header;
