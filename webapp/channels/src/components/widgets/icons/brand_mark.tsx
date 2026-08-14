// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

// The Hanzo mark, as it lives in @hanzo/brand. It takes its ink from
// currentColor so it reads on either theme without a second asset.
export default function BrandMark(props: React.HTMLAttributes<HTMLSpanElement>) {
    const {formatMessage} = useIntl();
    return (
        <span {...props}>
            <svg
                viewBox='0 0 67 67'
                fill='currentColor'
                role='img'
                aria-label={formatMessage({id: 'generic_icons.brand', defaultMessage: 'Hanzo Team logo'})}
            >
                <path d='M22.21 67V44.6369H0V67H22.21Z'/>
                <path d='M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z'/>
                <path d='M22.21 0H0V22.3184H22.21V0Z'/>
                <path d='M66.7198 0H44.5098V22.3184H66.7198V0Z'/>
                <path d='M66.7198 67V44.6369H44.5098V67H66.7198Z'/>
            </svg>
        </span>
    );
}
