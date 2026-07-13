// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useCallback, useState} from 'react';
import {FormattedMessage} from 'react-intl';

import {ContentFlaggingStatus, DeliveryTrackingStatus} from '@mattermost/types/content_flagging';

import {Client4} from 'mattermost-redux/client';

import LoadingSpinner from 'components/widgets/loading/loading_spinner';

import {useBlobDownload} from '../use_blob_download';

import './data_spillage_delivered_to.scss';

type Props = {

    // flaggedPostId is the id of the reported (flagged) post the recipient list
    // is generated/downloaded for.
    flaggedPostId: string;

    // deliveryStatus is the value of the delivery_tracking_status property
    // (model.DeliveryTrackingStatus*), or undefined when never set.
    deliveryStatus?: string;

    // reviewStatus is the flagged post's content-flagging status
    // (ContentFlaggingStatus).
    reviewStatus?: string;
};

// DataSpillageDeliveredTo renders the "Delivered to" row content in the flagged
// post review RHS. It surfaces the delivery tracking recipient list as one of:
// Generate (not started) → Finding… (in progress) → Download (completed), and an
// informational "not available" message once the post leaves review.
export default function DataSpillageDeliveredTo({flaggedPostId, deliveryStatus, reviewStatus}: Props) {
    const [triggering, setTriggering] = useState(false);
    const [triggerFailed, setTriggerFailed] = useState(false);
    const {status: downloadStatus, download} = useBlobDownload();

    const handleGenerate = useCallback(async () => {
        if (triggering) {
            return;
        }

        setTriggering(true);
        setTriggerFailed(false);

        try {
            // On success the server marks the job in_progress and emits a
            // websocket update, which re-renders this row into the "Finding…"
            // state. We just wait for the response here (no optimistic flip).
            await Client4.triggerDeliveryTracking(flaggedPostId);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
            setTriggerFailed(true);
        } finally {
            setTriggering(false);
        }
    }, [flaggedPostId, triggering]);

    const handleDownload = useCallback(() => {
        if (downloadStatus === 'generating') {
            return;
        }

        download(
            (signal) => Client4.getDeliveryTrackingReceipt(flaggedPostId, signal),
            `delivery-recipient-list-${flaggedPostId}-${Date.now()}.csv`,
        );
    }, [download, downloadStatus, flaggedPostId]);

    // Once the post leaves review it can no longer be generated or downloaded
    // (the receipt API rejects posts that are not under review).
    if (reviewStatus === ContentFlaggingStatus.Removed || reviewStatus === ContentFlaggingStatus.Retained) {
        return (
            <div
                className='DataSpillageDeliveredTo'
                data-testid='data-spillage-delivered-to'
            >
                <div className='DataSpillageDeliveredTo__status'>
                    <i className='icon icon-information-outline'/>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.unavailable'
                        defaultMessage='Recipient list not available'
                    />
                </div>
                <div className='DataSpillageDeliveredTo__help'>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.unavailable_help'
                        defaultMessage='This message was permanently removed. This list can only be generated while the message exists.'
                    />
                </div>
            </div>
        );
    }

    if (deliveryStatus === DeliveryTrackingStatus.Completed) {
        let icon;
        let label;
        switch (downloadStatus) {
        case 'generating':
            icon = <LoadingSpinner/>;
            label = (
                <FormattedMessage
                    id='data_spillage_report.delivered_to.downloading'
                    defaultMessage='Preparing recipient list…'
                />
            );
            break;
        case 'error':
            icon = <i className='icon icon-alert-outline'/>;
            label = (
                <FormattedMessage
                    id='data_spillage_report.delivered_to.download_failed'
                    defaultMessage='Download failed. Try again.'
                />
            );
            break;
        default:
            icon = <i className='icon icon-download-outline'/>;
            label = (
                <FormattedMessage
                    id='data_spillage_report.delivered_to.download'
                    defaultMessage='Download recipient list'
                />
            );
            break;
        }

        return (
            <div
                className='DataSpillageDeliveredTo'
                data-testid='data-spillage-delivered-to'
            >
                <button
                    type='button'
                    className={classNames('btn btn-sm', downloadStatus === 'error' ? 'btn-danger' : 'btn-tertiary')}
                    onClick={handleDownload}
                    disabled={downloadStatus === 'generating'}
                    data-testid='data-spillage-delivered-to-download'
                >
                    {icon}
                    {label}
                </button>
            </div>
        );
    }

    if (deliveryStatus === DeliveryTrackingStatus.InProgress) {
        return (
            <div
                className='DataSpillageDeliveredTo'
                data-testid='data-spillage-delivered-to'
            >
                <div className='DataSpillageDeliveredTo__status'>
                    <LoadingSpinner/>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.generating'
                        defaultMessage='Finding exposed users…'
                    />
                </div>
                <div className='DataSpillageDeliveredTo__help'>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.generating_help'
                        defaultMessage="This might take some time. We'll notify you when the list is ready."
                    />
                </div>
            </div>
        );
    }

    // not_started / failed / undefined → offer Generate (with a retry hint on
    // failure).
    const failed = triggerFailed || deliveryStatus === DeliveryTrackingStatus.Failed;

    return (
        <div
            className='DataSpillageDeliveredTo'
            data-testid='data-spillage-delivered-to'
        >
            <button
                type='button'
                className='btn btn-sm btn-tertiary'
                onClick={handleGenerate}
                disabled={triggering}
                data-testid='data-spillage-delivered-to-generate'
            >
                {triggering ? <LoadingSpinner/> : <i className='icon icon-account-multiple-outline'/>}
                <FormattedMessage
                    id='data_spillage_report.delivered_to.generate'
                    defaultMessage='Generate recipient list'
                />
            </button>
            {failed && !triggering ? (
                <div className='DataSpillageDeliveredTo__error'>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.generate_failed'
                        defaultMessage="Couldn't generate the list. Try again."
                    />
                </div>
            ) : (
                <div className='DataSpillageDeliveredTo__help'>
                    <FormattedMessage
                        id='data_spillage_report.delivered_to.generate_help'
                        defaultMessage='You can only generate the recipient list before removing the message.'
                    />
                </div>
            )}
        </div>
    );
}
