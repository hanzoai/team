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

type Props = {
    config: DeliveryTrackingConfig;
    onChange: (config: DeliveryTrackingConfig) => void;
};

export default function DeliveryTrackingSection({config, onChange}: Props) {
    const scopeDisabled = !config.enable;

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
                <hgroup>
                    <h1 className='content-flagging-section-title'>
                        <FormattedMessage
                            id='admin.deliveryTracking.title'
                            defaultMessage='Post Delivery Tracking'
                        />
                    </h1>
                    <h5 className='content-flagging-section-description'>
                        <FormattedMessage
                            id='admin.deliveryTracking.description'
                            defaultMessage='Record which users a flagged post was delivered to. Tracking can be limited to specific channels to control the load it generates.'
                        />
                    </h5>
                </hgroup>
            </SectionHeader>

            <SectionContent>
                <div className='content-flagging-section-setting-wrapper'>
                    <div className='content-flagging-section-setting'>
                        <div className='setting-title'>
                            <FormattedMessage
                                id='admin.deliveryTracking.enable'
                                defaultMessage='Enable post delivery tracking:'
                            />
                        </div>

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
                    </div>

                    {config.enable &&
                        <div className='content-flagging-section-setting'>
                            <div className='setting-title'>
                                <FormattedMessage
                                    id='admin.deliveryTracking.allChannels'
                                    defaultMessage='Track delivery in all channels:'
                                />
                            </div>

                            <div className='setting-content'>
                                <Label isDisabled={scopeDisabled}>
                                    <input
                                        data-testid='deliveryTrackingAllChannels_true'
                                        type='radio'
                                        value='true'
                                        checked={config.enable_for_all_channels}
                                        onChange={handleAllChannelsChange}
                                        disabled={scopeDisabled}
                                    />
                                    <FormattedMessage
                                        id='admin.true'
                                        defaultMessage='True'
                                    />
                                </Label>

                                <Label isDisabled={scopeDisabled}>
                                    <input
                                        data-testid='deliveryTrackingAllChannels_false'
                                        type='radio'
                                        value='false'
                                        checked={!config.enable_for_all_channels}
                                        onChange={handleAllChannelsChange}
                                        disabled={scopeDisabled}
                                    />
                                    <FormattedMessage
                                        id='admin.false'
                                        defaultMessage='False'
                                    />
                                </Label>
                            </div>
                        </div>
                    }

                    {config.enable &&
                        <div className='content-flagging-section-setting'>
                            <div className='setting-title'>
                                <FormattedMessage
                                    id='admin.deliveryTracking.channels'
                                    defaultMessage='Select channels for delivery tracking:'
                                />
                            </div>

                            <div className='setting-content'>
                                <ChannelMultiSelector
                                    id='delivery_tracking_channels'
                                    channelIds={config.channel_ids}
                                    onChange={handleChannelsChange}
                                    disabled={config.enable_for_all_channels}
                                />
                            </div>
                        </div>
                    }
                </div>
            </SectionContent>
        </AdminSection>
    );
}
