// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import type {Subscription} from '@hanzoteam/types/cloud';

import {
    getCloudSubscription as getCloudSubscriptionAction,
} from '@hanzoteam/redux/actions/cloud';
import {getCloudSubscription} from '@hanzoteam/redux/selectors/entities/cloud';
import {getLicense} from '@hanzoteam/redux/selectors/entities/general';

export default function useGetSubscription(): Subscription | undefined {
    const cloudSubscription = useSelector(getCloudSubscription);
    const license = useSelector(getLicense);
    const retrievedCloudSub = Boolean(cloudSubscription);
    const dispatch = useDispatch();
    const [requestedSubscription, setRequestedSubscription] = useState(false);

    useEffect(() => {
        if (license.Cloud === 'true' && !retrievedCloudSub && !requestedSubscription) {
            dispatch(getCloudSubscriptionAction());
            setRequestedSubscription(true);
        }
    }, [requestedSubscription, retrievedCloudSub, license]);

    return cloudSubscription;
}
