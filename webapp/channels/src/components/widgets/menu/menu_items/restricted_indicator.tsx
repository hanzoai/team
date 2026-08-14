// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useCallback, type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import type {MessageDescriptor} from 'react-intl';

import {WithTooltip} from '@mattermost/shared/components/tooltip';

import {FREEMIUM_TO_ENTERPRISE_TRIAL_LENGTH_DAYS} from 'utils/cloud_utils';
import {LicenseSkus} from 'utils/constants';

import './restricted_indicator.scss';

type Props = {
    blocked?: boolean;
    minimumPlanRequiredForFeature?: string;
    tooltipTitle?: ReactNode;
    tooltipMessage?: ReactNode;
    tooltipMessageBlocked?: string | MessageDescriptor;
    ctaExtraContent?: ReactNode;
};

function capitalizeFirstLetter(s: string) {
    return s?.charAt(0)?.toUpperCase() + s?.slice(1);
}

const RestrictedIndicator = ({
    blocked,
    tooltipTitle,
    tooltipMessage,
    tooltipMessageBlocked,
    ctaExtraContent,
    minimumPlanRequiredForFeature,
}: Props) => {
    const {formatMessage} = useIntl();

    const getTooltipMessageBlocked = useCallback(() => {
        if (!tooltipMessageBlocked) {
            return formatMessage(
                {
                    id: 'restricted_indicator.tooltip.message.blocked',
                    defaultMessage: 'This is a paid feature, available with a free {trialLength}-day trial',
                }, {
                    trialLength: FREEMIUM_TO_ENTERPRISE_TRIAL_LENGTH_DAYS,
                },
            );
        }

        return typeof tooltipMessageBlocked === 'string' ? tooltipMessageBlocked : formatMessage(tooltipMessageBlocked, {
            trialLength: FREEMIUM_TO_ENTERPRISE_TRIAL_LENGTH_DAYS,
            article: minimumPlanRequiredForFeature === LicenseSkus.Enterprise ? 'an' : 'a',
            minimumPlanRequiredForFeature,
        });
    }, [tooltipMessageBlocked]);

    const icon = <i className={classNames('RestrictedIndicator__icon-tooltip', 'icon', blocked ? 'icon-key-variant' : 'trial')}/>;

    return (
        <span className='RestrictedIndicator__icon-tooltip-container'>
            <WithTooltip
                title={
                    <div className='RestrictedIndicator__icon-tooltip'>
                        <span className='title'>
                            {tooltipTitle || formatMessage({id: 'restricted_indicator.tooltip.title', defaultMessage: '{minimumPlanRequiredForFeature} feature'}, {minimumPlanRequiredForFeature: capitalizeFirstLetter(minimumPlanRequiredForFeature!)})}
                        </span>
                        <span className='message'>
                            {blocked ? (
                                getTooltipMessageBlocked()
                            ) : (
                                tooltipMessage || formatMessage({id: 'restricted_indicator.tooltip.mesage', defaultMessage: 'During your trial you are able to use this feature.'})
                            )}
                        </span>
                    </div>
                }
            >
                <div className='RestrictedIndicator__content'>
                    {icon}
                    {ctaExtraContent}
                </div>
            </WithTooltip>
        </span>
    );
};

export default RestrictedIndicator;
