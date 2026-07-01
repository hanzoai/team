// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FormattedMessage} from 'react-intl';

import type {DeliveryTrackingConfig} from '@mattermost/types/config';

import {Label} from 'components/admin_console/boolean_setting';
import ChannelMultiSelector from 'components/admin_console/content_flagging/delivery_tracking/channel_multiselector';
import {
    AdminSection,
    SectionContent,
    SectionHeader,
} from 'components/admin_console/system_properties/controls';
import ExternalLink from 'components/external_link';

import {DocLinks} from 'utils/constants';

import '../content_flagging_section_base.scss';

type Props = {
    config: DeliveryTrackingConfig;
    onChange: (config: DeliveryTrackingConfig) => void;
};

export default function DeliveryTrackingSection({config, onChange}: Props) {
    const handleEnableChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({...config, enable: e.target.value === 'true'});
    }, [config, onChange]);

    const handleAllChannelsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({...config, enable_for_all_channels: e.target.value === 'true'});
    }, [config, onChange]);

    const handleChannelsChange = useCallback((channelIds: string[]) => {
        onChange({...config, channel_ids: channelIds});
    }, [config, onChange]);

    return (
        <AdminSection data-testid='deliveryTrackingSection'>
            <SectionHeader>
                <div className='content-flagging-section-header'>
                    <hgroup>
                        <h1 className='content-flagging-section-title'>
                            <FormattedMessage
                                id='admin.deliveryTracking.title'
                                defaultMessage='Delivered to'
                            />
                        </h1>
                        <h5 className='content-flagging-section-description'>
                            <FormattedMessage
                                id='admin.deliveryTracking.description'
                                defaultMessage="Let Reviewers see who a quarantined message reached before it was removed, to support spillage cleanup. Tracking delivery adds storage and processing cost, so enable it only where it's needed."
                            />
                        </h5>
                    </hgroup>

                    <ExternalLink
                        location='admin_console_delivery_tracking'
                        href={DocLinks.CONTENT_FLAGGING}
                        className='btn btn-tertiary'
                    >
                        <FormattedMessage
                            id='admin.deliveryTracking.learnMore'
                            defaultMessage='Learn more'
                        />
                    </ExternalLink>
                </div>
            </SectionHeader>

            <SectionContent>
                <div className='content-flagging-section-setting-wrapper'>
                    <div className='content-flagging-section-setting'>
                        <div className='setting-title'>
                            <FormattedMessage
                                id='admin.deliveryTracking.enable'
                                defaultMessage='Enable delivered-to user list'
                            />
                        </div>

                        <div className='setting-content-wrapper'>
                            <div className='setting-content'>
                                <Label isDisabled={false}>
                                    <input
                                        data-testid='deliveryTrackingEnable_true'
                                        type='radio'
                                        value='true'
                                        checked={config.enable}
                                        onChange={handleEnableChange}
                                    />
                                    <FormattedMessage
                                        id='admin.true'
                                        defaultMessage='True'
                                    />
                                </Label>

                                <Label isDisabled={false}>
                                    <input
                                        data-testid='deliveryTrackingEnable_false'
                                        type='radio'
                                        value='false'
                                        checked={!config.enable}
                                        onChange={handleEnableChange}
                                    />
                                    <FormattedMessage
                                        id='admin.false'
                                        defaultMessage='False'
                                    />
                                </Label>
                            </div>

                            <div className='helpText'>
                                <FormattedMessage
                                    id='admin.deliveryTracking.enable.help'
                                    defaultMessage='When true, post deliveries to users are tracked. This data can be used by content reviewers to determine which users received a quarantined post.'
                                />
                            </div>
                        </div>
                    </div>

                    {config.enable && (
                        <div className='content-flagging-section-setting'>
                            <div className='setting-title'>
                                <FormattedMessage
                                    id='admin.deliveryTracking.trackIn'
                                    defaultMessage='Track delivery in'
                                />
                            </div>

                            <div className='setting-content-wrapper'>
                                <div className='setting-content'>
                                    <Label isDisabled={false}>
                                        <input
                                            data-testid='deliveryTrackingAllChannels_true'
                                            type='radio'
                                            value='true'
                                            checked={
                                                config.enable_for_all_channels
                                            }
                                            onChange={handleAllChannelsChange}
                                        />
                                        <FormattedMessage
                                            id='admin.deliveryTracking.trackIn.allChannels'
                                            defaultMessage='All channels'
                                        />
                                    </Label>

                                    <Label isDisabled={false}>
                                        <input
                                            data-testid='deliveryTrackingAllChannels_false'
                                            type='radio'
                                            value='false'
                                            checked={
                                                !config.enable_for_all_channels
                                            }
                                            onChange={handleAllChannelsChange}
                                        />
                                        <FormattedMessage
                                            id='admin.deliveryTracking.trackIn.selectedChannels'
                                            defaultMessage='Selected channels'
                                        />
                                    </Label>
                                </div>

                                <div className='helpText'>
                                    <FormattedMessage
                                        id='admin.deliveryTracking.trackIn.help'
                                        defaultMessage='Enabling delivery tracking for quarantined messages in all channels is the most complete but the most expensive. Limit it to the channels where spillage matters to keep storage and performance in check.'
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {config.enable && !config.enable_for_all_channels && (
                        <div className='content-flagging-section-setting'>
                            <div className='setting-title'>
                                <FormattedMessage
                                    id='admin.deliveryTracking.channels'
                                    defaultMessage='Select channels for delivery tracking'
                                />
                            </div>

                            <div className='setting-content-wrapper'>
                                <div className='setting-content'>
                                    <ChannelMultiSelector
                                        id='delivery_tracking_channels'
                                        channelIds={config.channel_ids}
                                        onChange={handleChannelsChange}
                                    />
                                </div>

                                <div className='helpText'>
                                    <FormattedMessage
                                        id='admin.deliveryTracking.channels.help'
                                        defaultMessage='Delivery is tracked only in these channels. Tracking starts when you save, and applies to messages quarantined from then on.'
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SectionContent>
        </AdminSection>
    );
}
