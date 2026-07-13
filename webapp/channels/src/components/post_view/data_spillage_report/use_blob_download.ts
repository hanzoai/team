// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

export type BlobDownloadStatus = 'idle' | 'generating' | 'error';

type BlobFetcher = (signal: AbortSignal) => Promise<Blob>;

export type UseBlobDownloadResult = {
    status: BlobDownloadStatus;

    // download fetches a Blob via the provided fetcher and triggers a browser
    // download with the given filename. It manages the generating/error state
    // and cancels any in-flight request when a new one starts or on unmount.
    download: (fetcher: BlobFetcher, filename: string) => Promise<void>;
};

// useBlobDownload centralises the "fetch bytes into a Blob then trigger an
// anchor download" pattern used by the content-flagging reviewer UI (the
// quarantined-message report and the delivery-tracking recipient list), along
// with the idle/generating/error state and AbortController lifecycle.
export function useBlobDownload(): UseBlobDownloadResult {
    const [status, setStatus] = useState<BlobDownloadStatus>('idle');
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Cancel any in-progress request when the consumer unmounts.
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const download = useCallback(async (fetcher: BlobFetcher, filename: string) => {
        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        setStatus('generating');

        let blob: Blob | undefined;

        try {
            blob = await fetcher(controller.signal);
            if (controller.signal.aborted) {
                return;
            }
        } catch (err) {
            if (controller.signal.aborted) {
                return;
            }

            // eslint-disable-next-line no-console
            console.error(err);
            setStatus('error');
            return;
        }

        if (controller.signal.aborted || !blob) {
            return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        setStatus('idle');
    }, []);

    return {status, download};
}
