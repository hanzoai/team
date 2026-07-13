// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {ContentFlaggingStatus, DeliveryTrackingStatus} from '@mattermost/types/content_flagging';

import {Client4} from 'mattermost-redux/client';

import DataSpillageDeliveredTo from 'components/post_view/data_spillage_report/data_spillage_delivered_to/data_spillage_delivered_to';

import {renderWithContext} from 'tests/react_testing_utils';

describe('DataSpillageDeliveredTo', () => {
    const flaggedPostId = 'flagged_post_id';

    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
        jest.clearAllMocks();

        Client4.triggerDeliveryTracking = jest.fn().mockResolvedValue({status: 'OK'});
        Client4.getDeliveryTrackingReceipt = jest.fn().mockResolvedValue(new Blob(['csv'], {type: 'text/csv'}));

        originalCreateObjectURL = URL.createObjectURL;
        originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        URL.revokeObjectURL = jest.fn();

        console.error = jest.fn();
    });

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('not-started shows the Generate button and helper', () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.NotStarted}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        const button = screen.getByTestId('data-spillage-delivered-to-generate');
        expect(button).toBeVisible();
        expect(button).toHaveTextContent('Generate recipient list');
        expect(screen.getByText('You can only generate the recipient list before removing the message.')).toBeVisible();
    });

    test('undefined delivery status is treated as not started', () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                reviewStatus={ContentFlaggingStatus.Pending}
            />,
        );

        expect(screen.getByTestId('data-spillage-delivered-to-generate')).toHaveTextContent('Generate recipient list');
    });

    test('clicking Generate triggers the job', async () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.NotStarted}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        await userEvent.click(screen.getByTestId('data-spillage-delivered-to-generate'));

        await waitFor(() => {
            expect(Client4.triggerDeliveryTracking).toHaveBeenCalledWith(flaggedPostId);
        });
    });

    test('generate failure shows a retry hint', async () => {
        Client4.triggerDeliveryTracking = jest.fn().mockRejectedValue(new Error('boom'));

        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.NotStarted}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        await userEvent.click(screen.getByTestId('data-spillage-delivered-to-generate'));

        await waitFor(() => {
            expect(screen.getByText("Couldn't generate the list. Try again.")).toBeVisible();
        });
    });

    test('failed delivery status shows the retry hint', () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.Failed}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        expect(screen.getByTestId('data-spillage-delivered-to-generate')).toBeVisible();
        expect(screen.getByText("Couldn't generate the list. Try again.")).toBeVisible();
    });

    test('in-progress shows the finding state', () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.InProgress}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        expect(screen.getByText('Finding exposed users…')).toBeVisible();
        expect(screen.getByText("This might take some time. We'll notify you when the list is ready.")).toBeVisible();
        expect(screen.queryByTestId('data-spillage-delivered-to-generate')).not.toBeInTheDocument();
        expect(screen.queryByTestId('data-spillage-delivered-to-download')).not.toBeInTheDocument();
    });

    test('completed shows the Download button and downloads the CSV', async () => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.Completed}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        const button = screen.getByTestId('data-spillage-delivered-to-download');
        expect(button).toHaveTextContent('Download recipient list');

        await userEvent.click(button);

        await waitFor(() => {
            expect(Client4.getDeliveryTrackingReceipt).toHaveBeenCalledWith(flaggedPostId, expect.any(AbortSignal));
        });
        await waitFor(() => {
            expect(URL.createObjectURL).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        });
    });

    test('download failure shows the retry label', async () => {
        Client4.getDeliveryTrackingReceipt = jest.fn().mockRejectedValue(new Error('boom'));

        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}
                deliveryStatus={DeliveryTrackingStatus.Completed}
                reviewStatus={ContentFlaggingStatus.Assigned}
            />,
        );

        await userEvent.click(screen.getByTestId('data-spillage-delivered-to-download'));

        await waitFor(() => {
            expect(screen.getByTestId('data-spillage-delivered-to-download')).toHaveTextContent('Download failed. Try again.');
        });
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    test.each([
        ['removed', ContentFlaggingStatus.Removed],
        ['retained', ContentFlaggingStatus.Retained],
    ])('%s post shows the not-available message and no actions', (_label, reviewStatus) => {
        renderWithContext(
            <DataSpillageDeliveredTo
                flaggedPostId={flaggedPostId}

                // Even if a list was generated, it is not downloadable once out of review.
                deliveryStatus={DeliveryTrackingStatus.Completed}
                reviewStatus={reviewStatus}
            />,
        );

        expect(screen.getByText('Recipient list not available')).toBeVisible();
        expect(screen.getByText('This message was permanently removed. This list can only be generated while the message exists.')).toBeVisible();
        expect(screen.queryByTestId('data-spillage-delivered-to-generate')).not.toBeInTheDocument();
        expect(screen.queryByTestId('data-spillage-delivered-to-download')).not.toBeInTheDocument();
    });
});
