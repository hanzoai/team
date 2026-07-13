// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import classNames from 'classnames';
import React, {useCallback} from 'react';
import {FormattedMessage} from 'react-intl';

import {Client4} from 'mattermost-redux/client';

import LoadingSpinner from 'components/widgets/loading/loading_spinner';

import {useBlobDownload} from '../use_blob_download';

import './data_spillage_download_report.scss';

type Props = {
    flaggedPostId: string;
};

export default function DataSpillageDownloadReport({flaggedPostId}: Props) {
    const {status, download} = useBlobDownload();

    const handleClick = useCallback(() => {
        if (status === 'generating') {
            return;
        }

        download(
            (signal) => Client4.generateFlaggedPostReport(flaggedPostId, '', undefined, signal),
            `flagged-post-${flaggedPostId}-${Date.now()}.zip`,
        );
    }, [download, flaggedPostId, status]);

    let icon;
    let label;
    let buttonClass;

    switch (status) {
    case 'generating':
        icon = <LoadingSpinner/>;
        label = (
            <FormattedMessage
                id='data_spillage_report.download_report.generating.button_text'
                defaultMessage='Generating report…'
            />
        );
        buttonClass = 'btn-tertiary';
        break;
    case 'error':
        icon = <i className='icon icon-alert-outline'/>;
        label = (
            <FormattedMessage
                id='data_spillage_report.download_report.failed.button_text'
                defaultMessage='Generation failed. Try again.'
            />
        );
        buttonClass = 'btn-danger';
        break;
    case 'idle':
    default:
        icon = <i className='icon icon-download-outline'/>;
        label = (
            <FormattedMessage
                id='data_spillage_report.download_report.button_text'
                defaultMessage='Download Report'
            />
        );
        buttonClass = 'btn-tertiary';
        break;
    }

    return (
        <div
            className='DataSpillageDownloadReport'
            data-testid='data-spillage-download-report'
        >
            <button
                type='button'
                className={classNames('btn btn-sm', buttonClass)}
                onClick={handleClick}
                disabled={status === 'generating'}
                data-testid='data-spillage-action-download-report'
            >
                {icon}
                {label}
            </button>
        </div>
    );
}
