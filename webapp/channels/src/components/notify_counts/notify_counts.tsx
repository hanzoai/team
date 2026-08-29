// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import type {BasicUnreadMeta} from '@hanzoteam/redux/selectors/entities/channels';

const NotifyCounts = ({unreadMentionCount, isUnread}: BasicUnreadMeta) => {
    if (unreadMentionCount) {
        return <span className='badge badge-notify'>{unreadMentionCount}</span>;
    } else if (isUnread) {
        return <span className='badge badge-notify'>{'•'}</span>;
    }
    return null;
};

export default React.memo(NotifyCounts);
