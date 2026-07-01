// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import type {MessageDescriptor} from 'react-intl';
import {FormattedMessage, defineMessages} from 'react-intl';
import {useSelector} from 'react-redux';

import type {
    ContentFlaggingAdditionalSettings,
    ContentFlaggingNotificationSettings,
    ContentFlaggingSettings as TypeContentFlaggingSettings,
    ContentFlaggingReviewerSetting,
    DeliveryTrackingConfig} from '@mattermost/types/config';
import type {ServerError} from '@mattermost/types/errors';

import {Client4} from 'mattermost-redux/client';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import BooleanSetting from 'components/admin_console/boolean_setting';
import ContentFlaggingAdditionalSettingsSection
    from 'components/admin_console/content_flagging/additional_settings/additional_settings';
import ContentFlaggingContentReviewers
    from 'components/admin_console/content_flagging/content_reviewers/content_reviewers';
import DeliveryTrackingSection
    from 'components/admin_console/content_flagging/delivery_tracking/delivery_tracking_section';
import ContentFlaggingNotificationSettingsSection
    from 'components/admin_console/content_flagging/notificatin_settings/notification_settings';
import SaveChangesPanel from 'components/admin_console/save_changes_panel';
import AdminHeader from 'components/widgets/admin_console/admin_header';

import type {GlobalState} from 'types/store';

import './content_flagging_settings.scss';

const messages = defineMessages({
    title: {id: 'admin.dataSpillage.title', defaultMessage: 'Data Spillage Handling'},
    enableTitle: {id: 'admin.data_spillage.enableTitle', defaultMessage: 'Enable Data Spillage Handling'},
    legacyTitle: {id: 'admin.contentFlagging.title', defaultMessage: 'Content Flagging'},
});

export const searchableStrings: Array<string | MessageDescriptor> = [
    messages.title,
    messages.enableTitle,
    messages.legacyTitle,
];

export default function ContentFlaggingSettings() {
    const [saving, setSaving] = useState(false);
    const [saveNeeded, setSaveNeeded] = useState(false);
    const [serverError, setServerError] = useState('');
    const [contentFlaggingSettings, setContentFlaggingSettings] = useState<TypeContentFlaggingSettings>();
    const [deliveryTrackingConfig, setDeliveryTrackingConfig] = useState<DeliveryTrackingConfig>();

    const deliveryTrackingFeatureEnabled = useSelector((state: GlobalState) => getConfig(state).FeatureFlagPostDeliveryTracking === 'true');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await Client4.getAdminContentFlaggingConfig();
                if (config) {
                    setContentFlaggingSettings(config);
                }
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
            }
        };

        if (!contentFlaggingSettings) {
            fetchConfig();
        }
    }, [contentFlaggingSettings]);

    useEffect(() => {
        const fetchDeliveryTrackingConfig = async () => {
            try {
                const config = await Client4.getDeliveryTrackingConfig();
                if (config) {
                    setDeliveryTrackingConfig(config);
                }
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
            }
        };

        if (deliveryTrackingFeatureEnabled && !deliveryTrackingConfig) {
            fetchDeliveryTrackingConfig();
        }
    }, [deliveryTrackingFeatureEnabled, deliveryTrackingConfig]);

    const handleSettingsChange = useCallback((id: string, value: unknown) => {
        const newValue = {...contentFlaggingSettings};

        switch (id) {
        case 'EnableContentFlagging':
            newValue.EnableContentFlagging = value as boolean;
            break;
        case 'ReviewerSettings':
            newValue.ReviewerSettings = value as ContentFlaggingReviewerSetting;
            break;
        case 'NotificationSettings':
            newValue.NotificationSettings = value as ContentFlaggingNotificationSettings;
            break;
        case 'AdditionalSettings':
            newValue.AdditionalSettings = value as ContentFlaggingAdditionalSettings;
            break;
        }

        setContentFlaggingSettings(newValue as TypeContentFlaggingSettings);
        setSaveNeeded(true);
    }, [contentFlaggingSettings]);

    const handleDeliveryTrackingChange = useCallback((config: DeliveryTrackingConfig) => {
        setDeliveryTrackingConfig(config);
        setSaveNeeded(true);
    }, []);

    const onSave = useCallback(async () => {
        if (!contentFlaggingSettings) {
            return;
        }

        setSaving(true);

        try {
            await Client4.saveContentFlaggingConfig(contentFlaggingSettings);

            // Delivery tracking is gated behind its own feature flag and a separate
            // endpoint, but shares this page's single Save button.
            if (deliveryTrackingFeatureEnabled && deliveryTrackingConfig) {
                await Client4.saveDeliveryTrackingConfig(deliveryTrackingConfig);
            }

            setSaveNeeded(false);
            setServerError('');
        } catch (error) {
            console.error(error); // eslint-disable-line no-console

            if (error satisfies ServerError) {
                setServerError(error.message);
            }
        } finally {
            setSaving(false);
        }
    }, [contentFlaggingSettings, deliveryTrackingFeatureEnabled, deliveryTrackingConfig]);

    if (!contentFlaggingSettings) {
        return null;
    }

    return (
        <div className='wrapper--fixed ContentFlaggingSettings'>
            <AdminHeader>
                <div>
                    <FormattedMessage
                        id='admin.dataSpillage.title'
                        defaultMessage='Data Spillage Handling'
                    />
                </div>
            </AdminHeader>

            <div className='admin-console__wrapper'>
                <div className='admin-console__content'>
                    <div className='admin-console__setting-group'>
                        <BooleanSetting
                            id='EnableContentFlagging'
                            label={
                                <FormattedMessage
                                    id='admin.data_spillage.enableTitle'
                                    defaultMessage='Enable Data Spillage Handling'
                                />
                            }
                            value={contentFlaggingSettings?.EnableContentFlagging || false}
                            setByEnv={false}
                            onChange={handleSettingsChange}
                            helpText=''
                        />
                    </div>
                    <ContentFlaggingContentReviewers
                        id='ReviewerSettings'
                        onChange={handleSettingsChange}
                        value={contentFlaggingSettings!.ReviewerSettings}
                        disabled={!contentFlaggingSettings.EnableContentFlagging}
                    />
                    <ContentFlaggingNotificationSettingsSection
                        id='NotificationSettings'
                        onChange={handleSettingsChange}
                        value={contentFlaggingSettings!.NotificationSettings}
                        disabled={!contentFlaggingSettings.EnableContentFlagging}
                    />
                    <ContentFlaggingAdditionalSettingsSection
                        id='AdditionalSettings'
                        onChange={handleSettingsChange}
                        value={contentFlaggingSettings!.AdditionalSettings}
                        disabled={!contentFlaggingSettings.EnableContentFlagging}
                    />
                    {deliveryTrackingFeatureEnabled && deliveryTrackingConfig &&
                        <DeliveryTrackingSection
                            config={deliveryTrackingConfig}
                            onChange={handleDeliveryTrackingChange}
                        />
                    }
                </div>
            </div>

            <SaveChangesPanel
                saveNeeded={saveNeeded}
                saving={saving}
                onClick={onSave}
                cancelLink=''
                serverError={serverError}
            />
        </div>
    );
}
