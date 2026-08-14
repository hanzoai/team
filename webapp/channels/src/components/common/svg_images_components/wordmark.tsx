// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

type Props = {
    width?: number;
    height?: number;
    className?: string;
};

// The mark is drawn; the name is set in the app's own face rather than as SVG
// text, so it renders in the loaded webfont instead of whatever the browser
// substitutes. Both take currentColor, so one component serves either theme.
export default function Wordmark({width, height = 24, className}: Props) {
    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: `${height * 0.42}px`,
                color: 'inherit',
            }}
        >
            <svg
                width={width ?? height}
                height={height}
                viewBox='0 0 67 67'
                fill='currentColor'
                role='img'
                aria-label='Hanzo Team'
            >
                <path d='M22.21 67V44.6369H0V67H22.21Z'/>
                <path d='M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z'/>
                <path d='M22.21 0H0V22.3184H22.21V0Z'/>
                <path d='M66.7198 0H44.5098V22.3184H66.7198V0Z'/>
                <path d='M66.7198 67V44.6369H44.5098V67H66.7198Z'/>
            </svg>
            <span
                style={{
                    fontSize: `${height * 0.92}px`,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                }}
            >
                {'Hanzo Team'}
            </span>
        </span>
    );
}
